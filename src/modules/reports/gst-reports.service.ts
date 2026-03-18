import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

export class GstReportsService {
    private getBaseFilters(hotelId: string, startDate?: string, endDate?: string, status?: string) {
        const filters: Prisma.Sql[] = [Prisma.sql`i."hotelId" = ${hotelId}::uuid`];

        // Only include non-cancelled and non-draft invoices (generated ones)
        if (status && status !== 'All') {
            if (status.toLowerCase() === 'paid') {
                filters.push(Prisma.sql`i."status" = 'paid'`);
            } else if (status.toLowerCase() === 'unpaid') {
                filters.push(Prisma.sql`i."status" = 'issued'`);
            } else {
                filters.push(Prisma.sql`i."status" IN ('issued', 'paid')`);
            }
        } else {
            filters.push(Prisma.sql`i."status" IN ('issued', 'paid')`);
        }

        if (startDate && endDate) {
            filters.push(Prisma.sql`DATE(i."invoiceDate") >= DATE(${startDate}) AND DATE(i."invoiceDate") <= DATE(${endDate})`);
        }

        return filters;
    }

    private buildWhereClause(filters: Prisma.Sql[]) {
        if (filters.length === 0) return Prisma.empty;
        return Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;
    }

    async getSummaryReport(hotelId: string, startDate?: string, endDate?: string, status?: string) {
        const filters = this.getBaseFilters(hotelId, startDate, endDate, status);
        const whereClause = this.buildWhereClause(filters);

        const query = Prisma.sql`
            SELECT 
                COALESCE(SUM(b."roomCharges"), 0) as "totalRoomTaxable",
                COALESCE(SUM(COALESCE(b."restaurantCharges", 0) + COALESCE(ro."subtotal", 0)), 0) as "totalRestaurantTaxable",
                COALESCE(SUM(b."miscCharges"), 0) as "totalMiscTaxable",
                COALESCE(SUM(i."cgst"), 0) as "totalCgst",
                COALESCE(SUM(i."sgst"), 0) as "totalSgst",
                COALESCE(SUM(i."igst"), 0) as "totalIgst",
                COALESCE(SUM(i."cgst" + i."sgst" + i."igst"), 0) as "grandTotalTax",
                COUNT(DISTINCT i.id) as "totalInvoiceCount"
            FROM invoices i
            LEFT JOIN bills b ON i."billId" = b.id
            LEFT JOIN restaurant_orders ro ON i."restaurantOrderId" = ro.id
            ${whereClause}
        `;

        const result = await prisma.$queryRaw(query) as any[];

        const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });

        return {
            hotelDetails: {
                name: hotel?.name,
                gstin: hotel?.gstNumber,
                address: hotel?.address,
                period: `${startDate} to ${endDate}`,
                generatedDate: new Date().toISOString()
            },
            summary: result[0]
        };
    }

    async getRoomGstReport(hotelId: string, startDate?: string, endDate?: string, status?: string, companyId?: string) {
        const filters = this.getBaseFilters(hotelId, startDate, endDate, status);
        filters.push(Prisma.sql`b."roomCharges" > 0`);
        filters.push(Prisma.sql`i."type" = 'ROOM'`);
        if (companyId) {
            filters.push(Prisma.sql`bk."companyId" = ${companyId}::uuid`);
        }
        const whereClause = this.buildWhereClause(filters);

        const query = Prisma.sql`
            SELECT 
                i."invoiceNumber" as "invoiceNo",
                i."invoiceDate" as "date",
                bk."guestName" as "guestName",
                c."name" as "companyName",
                c."gstNumber" as "gstin",
                rm."roomNumber" as "roomNumber",
                '996311' as "sacCode",
                
                COALESCE(b."discount", 0) as "invDiscount",
                0 as "roomRentDisc",
                COALESCE(b."roomCharges", 0) as "roomRent",
                
                COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * i."cgst", 2), 0) as "cgst",
                COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * i."sgst", 2), 0) as "sgst",
                COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * i."igst", 2), 0) as "igst",
                
                COALESCE(b."miscCharges", 0) as "otherCharges",
                ROUND((COALESCE(b."miscCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2) as "otherChargesGst",
                
                COALESCE(bk."advanceAmount", 0) as "advance",
                
                (
                    COALESCE(b."roomCharges", 0) + 
                    COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * i."cgst", 2), 0) + 
                    COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * i."sgst", 2), 0) + 
                    COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * i."igst", 2), 0) + 
                    COALESCE(b."miscCharges", 0) + 
                    COALESCE(ROUND((COALESCE(b."miscCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0)
                    - COALESCE(b."discount", 0)
                    - COALESCE(bk."advanceAmount", 0)
                ) as "netPayable",
                
                CASE WHEN LOWER(i."paymentMethod") = 'cash' THEN 
                    (COALESCE(b."roomCharges", 0) + COALESCE(b."miscCharges", 0) + COALESCE(ROUND((COALESCE(b."miscCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) + COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) - COALESCE(b."discount", 0) - COALESCE(bk."advanceAmount", 0))
                ELSE 0 END as "cash",
                
                CASE WHEN LOWER(i."paymentMethod") IN ('card', 'upi', 'bank') THEN 
                    (COALESCE(b."roomCharges", 0) + COALESCE(b."miscCharges", 0) + COALESCE(ROUND((COALESCE(b."miscCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) + COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) - COALESCE(b."discount", 0) - COALESCE(bk."advanceAmount", 0))
                ELSE 0 END as "bank",
                
                CASE WHEN LOWER(COALESCE(i."paymentMethod", 'credit')) NOT IN ('cash', 'card', 'upi', 'bank') THEN 
                    (COALESCE(b."roomCharges", 0) + COALESCE(b."miscCharges", 0) + COALESCE(ROUND((COALESCE(b."miscCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) + COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) - COALESCE(b."discount", 0) - COALESCE(bk."advanceAmount", 0))
                ELSE 0 END as "coCr"
            FROM invoices i
            JOIN bills b ON i."billId" = b.id
            JOIN bookings bk ON b."bookingId" = bk.id
            LEFT JOIN rooms rm ON bk."roomId" = rm.id
            LEFT JOIN companies c ON bk."companyId" = c.id
            ${whereClause}
            ORDER BY i."invoiceDate" DESC
        `;

        return prisma.$queryRaw(query);
    }

    async getRestaurantGstReport(hotelId: string, startDate?: string, endDate?: string, status?: string, companyId?: string) {
        const filters = this.getBaseFilters(hotelId, startDate, endDate, status);
        filters.push(Prisma.sql`b."restaurantCharges" > 0`);
        if (companyId) {
            filters.push(Prisma.sql`bk."companyId" = ${companyId}::uuid`);
        }
        const whereClause = this.buildWhereClause(filters);

        const query = Prisma.sql`
            SELECT 
                i."invoiceNumber" as "invoiceNo",
                i."invoiceDate" as "date",
                COALESCE(r_bill."roomNumber", r_order."roomNumber") as "roomNo",
                COALESCE(bk_bill."guestName", ro."guestName") as "guestName",
                '996331' as "sacCode",
                COALESCE(b."restaurantCharges", i."subtotal") as "taxableAmount",
                ROUND(( (i."cgst" + i."sgst" + i."igst") / NULLIF(i."subtotal", 0) ) * 100, 2) as "gstRate",
                CASE 
                    WHEN b.id IS NOT NULL THEN ROUND((b."restaurantCharges" / NULLIF(i."subtotal", 0)) * i."cgst", 2)
                    ELSE i."cgst"
                END as "cgst",
                CASE 
                    WHEN b.id IS NOT NULL THEN ROUND((b."restaurantCharges" / NULLIF(i."subtotal", 0)) * i."sgst", 2)
                    ELSE i."sgst"
                END as "sgst",
                CASE 
                    WHEN b.id IS NOT NULL THEN ROUND((b."restaurantCharges" / NULLIF(i."subtotal", 0)) * i."igst", 2)
                    ELSE i."igst"
                END as "igst",
                CASE 
                    WHEN b.id IS NOT NULL THEN ROUND(b."restaurantCharges" + ((b."restaurantCharges" / NULLIF(i."subtotal", 0)) * (i."cgst" + i."sgst" + i."igst")), 2)
                    ELSE i."totalAmount"
                END as "total"
            FROM invoices i
            LEFT JOIN bills b ON i."billId" = b.id
            LEFT JOIN bookings bk_bill ON b."bookingId" = bk_bill.id
            LEFT JOIN rooms r_bill ON bk_bill."roomId" = r_bill.id
            LEFT JOIN restaurant_orders ro ON i."restaurantOrderId" = ro.id
            LEFT JOIN rooms r_order ON ro."roomId" = r_order.id
            LEFT JOIN bookings bk_order ON ro."bookingId" = bk_order.id
            ${whereClause}
            AND (b."restaurantCharges" > 0 OR i."restaurantOrderId" IS NOT NULL)
            ${companyId ? Prisma.sql`AND (bk_bill."companyId" = ${companyId}::uuid OR bk_order."companyId" = ${companyId}::uuid)` : Prisma.empty}
            ORDER BY i."invoiceDate" DESC
        `;

        return prisma.$queryRaw(query);
    }

    async getMiscGstReport(hotelId: string, startDate?: string, endDate?: string, status?: string, companyId?: string) {
        const filters = this.getBaseFilters(hotelId, startDate, endDate, status);
        filters.push(Prisma.sql`b."miscCharges" > 0`);
        if (companyId) {
            filters.push(Prisma.sql`bk."companyId" = ${companyId}::uuid`);
        }
        const whereClause = this.buildWhereClause(filters);

        const query = Prisma.sql`
            SELECT 
                i."invoiceNumber" as "invoiceNo",
                i."invoiceDate" as "date",
                'Miscellaneous Charges' as "chargeDescription",
                '000000' as "sacCode",
                b."miscCharges" as "taxableAmount",
                ROUND(( (i."cgst" + i."sgst" + i."igst") / NULLIF(i."subtotal", 0) ) * 100, 2) as "gstRate",
                ROUND((b."miscCharges" / NULLIF(i."subtotal", 0)) * i."cgst", 2) as "cgst",
                ROUND((b."miscCharges" / NULLIF(i."subtotal", 0)) * i."sgst", 2) as "sgst",
                ROUND((b."miscCharges" / NULLIF(i."subtotal", 0)) * i."igst", 2) as "igst",
                ROUND(b."miscCharges" + ((b."miscCharges" / NULLIF(i."subtotal", 0)) * (i."cgst" + i."sgst" + i."igst")), 2) as "total"
            FROM invoices i
            JOIN bills b ON i."billId" = b.id
            JOIN bookings bk ON b."bookingId" = bk.id
            ${whereClause}
            ORDER BY i."invoiceDate" DESC
        `;

        return prisma.$queryRaw(query);
    }

    async getInvoiceWiseReport(hotelId: string, startDate?: string, endDate?: string, status?: string, companyId?: string) {
        const filters = this.getBaseFilters(hotelId, startDate, endDate, status);
        if (companyId) {
            filters.push(Prisma.sql`bk."companyId" = ${companyId}::uuid`);
        }
        const whereClause = this.buildWhereClause(filters);

        const query = Prisma.sql`
            SELECT 
                i."invoiceNumber",
                i."invoiceDate",
                COALESCE(bk."guestName", ro."guestName") as "guestName",
                c."name" as "companyName",
                c."gstNumber" as "gstin",
                h."state" as "placeOfSupply",
                i."subtotal" as "taxableValue",
                ROUND(( (i."cgst" + i."sgst" + i."igst") / NULLIF(i."subtotal", 0) ) * 100, 2) as "gstRate",
                i."cgst",
                i."sgst",
                i."igst",
                i."totalAmount",
                i."status" as "invoiceStatus"
            FROM invoices i
            LEFT JOIN bills b ON i."billId" = b.id
            LEFT JOIN bookings bk ON b."bookingId" = bk.id
            LEFT JOIN restaurant_orders ro ON i."restaurantOrderId" = ro.id
            LEFT JOIN bookings bk_ro ON ro."bookingId" = bk_ro.id
            JOIN hotels h ON i."hotelId" = h.id
            LEFT JOIN companies c ON COALESCE(bk."companyId", bk_ro."companyId") = c.id
            ${whereClause}
            ${companyId ? Prisma.sql`AND (bk."companyId" = ${companyId}::uuid OR bk_ro."companyId" = ${companyId}::uuid)` : Prisma.empty}
            ORDER BY i."invoiceDate" DESC
        `;

        return prisma.$queryRaw(query);
    }

    async getSacHsnReport(hotelId: string, startDate?: string, endDate?: string, status?: string) {
        // Here we build an aggregated union of Room, Restaurant, Misc SACs
        const filters = this.getBaseFilters(hotelId, startDate, endDate, status);
        const whereClause = this.buildWhereClause(filters);

        const query = Prisma.sql`
            WITH invoice_data AS (
                SELECT 
                    i."id",
                    i."subtotal",
                    i."cgst",
                    i."sgst",
                    i."igst",
                    COALESCE(b."roomCharges", 0) as "roomCharges",
                    COALESCE(b."restaurantCharges", 0) + COALESCE(ro."subtotal", 0) as "restaurantCharges",
                    COALESCE(b."miscCharges", 0) as "miscCharges",
                    ROUND(( (i."cgst" + i."sgst" + i."igst") / NULLIF(i."subtotal", 0) ) * 100, 2) as "gstRate"
                FROM invoices i
                LEFT JOIN bills b ON i."billId" = b.id
                LEFT JOIN restaurant_orders ro ON i."restaurantOrderId" = ro.id
                ${whereClause}
            ),
            sac_data AS (
                -- Room SAC
                SELECT 
                    '996311' as "sacCode",
                    'Room Accommodation' as "description",
                    "roomCharges" as "taxableValue",
                    "gstRate",
                    ("roomCharges" / NULLIF("subtotal", 0)) * "cgst" as "cgst",
                    ("roomCharges" / NULLIF("subtotal", 0)) * "sgst" as "sgst",
                    ("roomCharges" / NULLIF("subtotal", 0)) * "igst" as "igst"
                FROM invoice_data WHERE "roomCharges" > 0
                UNION ALL
                -- Restaurant SAC
                SELECT 
                    '996331' as "sacCode",
                    'Restaurant Services' as "description",
                    "restaurantCharges" as "taxableValue",
                    "gstRate",
                    ("restaurantCharges" / NULLIF("subtotal", 0)) * "cgst",
                    ("restaurantCharges" / NULLIF("subtotal", 0)) * "sgst",
                    ("restaurantCharges" / NULLIF("subtotal", 0)) * "igst"
                FROM invoice_data WHERE "restaurantCharges" > 0
                UNION ALL
                -- Misc SAC
                SELECT 
                    '000000' as "sacCode",
                    'Miscellaneous Services' as "description",
                    "miscCharges" as "taxableValue",
                    "gstRate",
                    ("miscCharges" / NULLIF("subtotal", 0)) * "cgst",
                    ("miscCharges" / NULLIF("subtotal", 0)) * "sgst",
                    ("miscCharges" / NULLIF("subtotal", 0)) * "igst"
                FROM invoice_data WHERE "miscCharges" > 0
            )
            SELECT 
                "sacCode",
                "description",
                MAX("gstRate") as "gstRate",
                SUM("taxableValue") as "totalTaxableValue",
                SUM("cgst") as "totalCgst",
                SUM("sgst") as "totalSgst",
                SUM("igst") as "totalIgst"
            FROM sac_data
            GROUP BY "sacCode", "description"
            ORDER BY "sacCode"
        `;

        return prisma.$queryRaw(query);
    }
}
