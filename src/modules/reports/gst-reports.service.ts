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
                COALESCE(SUM(COALESCE(i."roomRent", b."roomCharges")), 0) as "totalRoomTaxable",
                COALESCE(SUM(COALESCE(i."otherCharges", b."restaurantCharges", 0) + COALESCE(ro."subtotal", 0)), 0) as "totalRestaurantTaxable",
                COALESCE(SUM(COALESCE(i."miscCharges", b."miscCharges")), 0) as "totalMiscTaxable",
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
        filters.push(Prisma.sql`i."type"::text = 'ROOM'`);
        filters.push(Prisma.sql`i."restaurantOrderId" IS NULL`);
        if (companyId) {
            filters.push(Prisma.sql`bk."companyId" = ${companyId}::uuid`);
        }
        const whereClause = this.buildWhereClause(filters);

        const query = Prisma.sql`
            SELECT 
                i."invoiceNumber" as "invoiceNo",
                i."invoiceDate" as "date",
                i."paymentMethod" as "paymentMethod",
                COALESCE(i."guestName", bk."guestName") as "guestName",
                COALESCE(i."company", c."name") as "companyName",
                c."gstNumber" as "gstin",
                COALESCE(i."roomNumber", rm."roomNumber") as "roomNumber",
                '996311' as "sacCode",
                
                COALESCE(i."discount", b."discount", 0) as "invDiscount",
                0 as "roomRentDisc",
                COALESCE(i."roomRent", b."roomCharges", 0) as "roomRent",
                
                COALESCE(i."cgst", 0) as "cgst",
                COALESCE(i."sgst", 0) as "sgst",
                COALESCE(i."igst", 0) as "igst",
                
                COALESCE(i."miscCharges", b."miscCharges", 0) as "otherCharges",
                0 as "otherChargesGst",
                
                COALESCE(i."advancePaid", bk."advanceAmount", 0) as "advance",
                
                COALESCE(i."netPayable", (
                    COALESCE(b."roomCharges", 0) + 
                    COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * i."cgst", 2), 0) + 
                    COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * i."sgst", 2), 0) + 
                    COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * i."igst", 2), 0) + 
                    COALESCE(b."miscCharges", 0) + 
                    COALESCE(ROUND((COALESCE(b."miscCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0)
                    - COALESCE(b."discount", 0)
                    - COALESCE(bk."advanceAmount", 0)
                )) as "netPayable",
                
                CASE WHEN LOWER(i."paymentMethod") = 'cash' THEN 
                    COALESCE(i."netPayable", (COALESCE(b."roomCharges", 0) + COALESCE(b."miscCharges", 0) + COALESCE(ROUND((COALESCE(b."miscCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) + COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) - COALESCE(b."discount", 0) - COALESCE(bk."advanceAmount", 0)))
                ELSE 0 END as "cash",
                
                CASE WHEN LOWER(i."paymentMethod") IN ('card', 'upi', 'bank') THEN 
                    COALESCE(i."netPayable", (COALESCE(b."roomCharges", 0) + COALESCE(b."miscCharges", 0) + COALESCE(ROUND((COALESCE(b."miscCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) + COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) - COALESCE(b."discount", 0) - COALESCE(bk."advanceAmount", 0)))
                ELSE 0 END as "bank",
                
                CASE WHEN LOWER(COALESCE(i."paymentMethod", 'credit')) NOT IN ('cash', 'card', 'upi', 'bank') THEN 
                    COALESCE(i."netPayable", (COALESCE(b."roomCharges", 0) + COALESCE(b."miscCharges", 0) + COALESCE(ROUND((COALESCE(b."miscCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) + COALESCE(ROUND((COALESCE(b."roomCharges", 0) / NULLIF(i."subtotal", 0)) * COALESCE(i."cgst" + i."sgst" + i."igst", 0), 2), 0) - COALESCE(b."discount", 0) - COALESCE(bk."advanceAmount", 0)))
                ELSE 0 END as "coCr"
            FROM invoices i
            LEFT JOIN bills b ON i."billId" = b.id
            LEFT JOIN bookings bk ON b."bookingId" = bk.id
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
                COALESCE(i."roomNumber", r_bill."roomNumber", r_order."roomNumber") as "roomNo",
                COALESCE(i."guestName", bk_bill."guestName", ro."guestName") as "guestName",
                '996331' as "sacCode",
                COALESCE(i."otherCharges", b."restaurantCharges", i."subtotal") as "taxableAmount",
                0 as "cgst",
                0 as "sgst",
                0 as "igst",
                i."totalAmount" as "total"
            FROM invoices i
            LEFT JOIN bills b ON i."billId" = b.id
            LEFT JOIN bookings bk_bill ON b."bookingId" = bk_bill.id
            LEFT JOIN rooms r_bill ON bk_bill."roomId" = r_bill.id
            LEFT JOIN restaurant_orders ro ON i."restaurantOrderId" = ro.id
            LEFT JOIN rooms r_order ON ro."roomId" = r_order.id
            LEFT JOIN bookings bk_order ON ro."bookingId" = bk_order.id
            ${whereClause}
            AND (b."restaurantCharges" > 0 OR i."restaurantOrderId" IS NOT NULL OR i."otherCharges" > 0)
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
                COALESCE(i."remarks", 'Miscellaneous Charges') as "chargeDescription",
                '000000' as "sacCode",
                COALESCE(i."miscCharges", b."miscCharges") as "taxableAmount",
                0 as "gstRate",
                0 as "cgst",
                0 as "sgst",
                0 as "igst",
                ROUND(COALESCE(i."miscCharges", b."miscCharges"), 2) as "total"
            FROM invoices i
            LEFT JOIN bills b ON i."billId" = b.id
            LEFT JOIN bookings bk ON b."bookingId" = bk.id
            ${whereClause}
            AND (b."miscCharges" > 0 OR i."miscCharges" > 0)
            ORDER BY i."invoiceDate" DESC
        `;

        return prisma.$queryRaw(query);
    }

    async getInvoiceWiseReport(hotelId: string, startDate?: string, endDate?: string, status?: string, companyId?: string) {
        const filters = this.getBaseFilters(hotelId, startDate, endDate, status);
        filters.push(Prisma.sql`i."type"::text = 'ROOM'`);
        filters.push(Prisma.sql`i."restaurantOrderId" IS NULL`);
        
        if (companyId) {
            filters.push(Prisma.sql`bk."companyId" = ${companyId}::uuid`);
        }
        const whereClause = this.buildWhereClause(filters);

        const query = Prisma.sql`
            SELECT 
                i."invoiceNumber",
                i."invoiceDate",
                COALESCE(i."guestName", bk."guestName", ro."guestName") as "guestName",
                COALESCE(i."company", c."name") as "companyName",
                c."gstNumber" as "gstin",
                h."state" as "placeOfSupply",
                COALESCE(i."roomRent", b."roomCharges", i."subtotal") as "taxableValue",
                ROUND(( (i."cgst" + i."sgst" + i."igst") / NULLIF(COALESCE(i."roomRent", b."roomCharges", i."subtotal"), 0) ) * 100, 2) as "gstRate",
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

    async getSacHsnReport(hotelId: string, startDate?: string, endDate?: string, status?: string, restaurantEnabled: boolean = true) {
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
                    COALESCE(i."roomRent", b."roomCharges", 0) as "roomRent",
                    COALESCE(i."otherCharges", b."restaurantCharges", 0) + COALESCE(ro."subtotal", 0) as "restaurantCharges",
                    COALESCE(i."miscCharges", b."miscCharges", 0) as "miscCharges",
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
                    "roomRent" as "taxableValue",
                    "gstRate",
                    ("roomRent" / NULLIF("subtotal", 0)) * "cgst" as "cgst",
                    ("roomRent" / NULLIF("subtotal", 0)) * "sgst" as "sgst",
                    ("roomRent" / NULLIF("subtotal", 0)) * "igst" as "igst"
                FROM invoice_data WHERE "roomRent" > 0
                ${restaurantEnabled ? Prisma.sql`
                UNION ALL
                -- Restaurant SAC
                SELECT 
                    '996331' as "sacCode",
                    'Restaurant Services' as "description",
                    "restaurantCharges" as "taxableValue",
                    "gstRate",
                    0 as "cgst",
                    0 as "sgst",
                    0 as "igst"
                FROM invoice_data WHERE "restaurantCharges" > 0` : Prisma.empty}
                UNION ALL
                -- Misc SAC
                SELECT 
                    '000000' as "sacCode",
                    'Miscellaneous Services' as "description",
                    "miscCharges" as "taxableValue",
                    "gstRate",
                    0,
                    0,
                    0
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
