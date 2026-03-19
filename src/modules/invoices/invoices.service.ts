import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceStatus } from '@prisma/client';
import { calculateRoomTax } from '../../utils/tax';

export class InvoicesService {
    async getInvoicesByHotel(hotelId: string, status?: string) {
        console.log(`Fetching invoices for hotelId: ${hotelId}, status: ${status}`);
        const where: any = { hotelId, isDeleted: false };
        if (status) where.status = status;
        try {
            const invoices = await prisma.invoice.findMany({
                where,
                include: {
                    bill: {
                        include: {
                            booking: {
                                select: {
                                    guestName: true,
                                    guestPhone: true,
                                    checkInDate: true,
                                    checkInTime: true,
                                    checkOutDate: true,
                                    checkOutTime: true,
                                }
                            },
                        },
                    },
                    restaurantOrder: {
                        include: {
                            booking: { select: { guestName: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
            });
            console.log(`Found ${invoices.length} invoices`);
            return invoices;
        } catch (error: any) {
            console.error("Error in getInvoicesByHotel:", error);
            throw error;
        }
    }

    async getInvoiceById(invoiceId: string, hotelId: string) {
        const invoice = await prisma.invoice.findFirst({
            where: { id: invoiceId, hotelId },
            include: {
                bill: {
                    include: {
                        booking: {
                            include: {
                                room: { include: { roomType: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!invoice) throw new NotFoundError('Invoice not found');
        return invoice;
    }

    async updateInvoiceStatus(invoiceId: string, hotelId: string, status: string, userId: string) {
        const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, hotelId } });
        if (!invoice) throw new NotFoundError('Invoice not found');
        return prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: status as any, updatedBy: userId },
        });
    }

    async generateInvoice(data: { billId: string; guestAddress?: string }, hotelId: string, userId: string) {
        console.log(`Generating invoice for billId: ${data.billId}, hotelId: ${hotelId}`);
        const bill = await prisma.bill.findFirst({
            where: { id: data.billId, hotelId },
            include: { booking: true, invoice: true }
        });

        if (!bill) {
            console.error(`Bill not found: ${data.billId}`);
            throw new NotFoundError('Bill not found');
        }
        if (bill.invoice) {
            console.error(`Invoice already exists for bill: ${data.billId}`);
            throw new BadRequestError('Invoice already exists for this bill');
        }
        if (!bill.booking) {
            console.error(`Booking not found for bill: ${data.billId}`);
            throw new BadRequestError('Booking not associated with this bill');
        }

        return prisma.$transaction(async (tx) => {
            console.log("Starting transaction for invoice generation...");
            // If address provided, update booking
            if (data.guestAddress && data.guestAddress.trim() !== '') {
                console.log(`Updating guest address for booking: ${bill.bookingId}`);
                await tx.booking.update({
                    where: { id: bill.bookingId },
                    data: { addressLine: data.guestAddress }
                });
            }

            // Merge unbilled restaurant orders
            const pendingOrders = await tx.restaurantOrder.findMany({
                where: {
                    bookingId: bill.bookingId,
                    hotelId,
                    status: { in: ['pending', 'kot_printed', 'served'] }
                }
            });

            if (pendingOrders.length > 0) {
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                let resInvoiceCount = await tx.invoice.count({
                    where: { hotelId: bill.hotelId, type: 'RESTAURANT', createdAt: { gte: startOfDay } }
                });

                for (const order of pendingOrders) {
                    const resInvoiceNumber = `INV-RES-${dateStr}-${(++resInvoiceCount).toString().padStart(4, '0')}`;

                    await tx.invoice.create({
                        data: {
                            hotelId: bill.hotelId,
                            restaurantOrderId: order.id,
                            invoiceNumber: resInvoiceNumber,
                            subtotal: order.subtotal,
                            cgst: 0,
                            sgst: 0,
                            serviceCharge: order.serviceCharge,
                            totalAmount: order.totalAmount,
                            status: InvoiceStatus.issued,
                            type: 'RESTAURANT',
                            source: 'Checkout',
                            createdBy: userId,
                            updatedBy: userId
                        }
                    });

                    await tx.restaurantOrder.update({
                        where: { id: order.id },
                        data: {
                            status: 'billed',
                            billedAt: new Date(),
                            invoicedAt: new Date(),
                            issuedAt: new Date(),
                            issuedBy: userId,
                            updatedBy: userId
                        }
                    });
                }
            }

            // Recalculate totals
            console.log("Recalculating bill totals...");
            const hotel = await tx.hotel.findUnique({ where: { id: bill.hotelId } });

            const allOrders = await tx.restaurantOrder.findMany({
                where: { bookingId: bill.bookingId, status: 'billed' }
            });
            console.log(`Found ${allOrders.length} billed restaurant orders`);
            const totalRestaurantCharges = allOrders.reduce((sum: Decimal, o: any) => {
                const amt = new Decimal(o.totalAmount?.toString() || '0');
                console.log(`Adding order amount: ${amt}`);
                return sum.add(amt);
            }, new Decimal(0));

            const miscChargesList = await tx.miscCharge.findMany({
                where: { bookingId: bill.bookingId, isDeleted: false }
            });
            console.log(`Found ${miscChargesList.length} misc charges`);
            const totalMisc = miscChargesList.reduce((sum: Decimal, m: any) => {
                const amt = new Decimal(m.amount?.toString() || '0');
                const qty = new Decimal(m.quantity?.toString() || '1');
                const itemTotal = amt.mul(qty);
                console.log(`Adding misc charge: ${itemTotal}`);
                return sum.add(itemTotal);
            }, new Decimal(0));

            const roomCharges = new Decimal(bill.roomCharges?.toString() || '0');
            console.log(`Room charges: ${roomCharges}`);
            const subtotal = roomCharges.add(totalRestaurantCharges).add(totalMisc);
            console.log(`New subtotal: ${subtotal}`);

            // GST ONLY ON ROOM RENT using new rules
            const checkIn = new Date(bill.booking.checkInDate);
            const checkOut = new Date(bill.booking.checkOutDate);
            const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
            const dailyRent = roomCharges.div(nights);
            const taxInfo = calculateRoomTax(dailyRent, nights);

            const cgstAmount = taxInfo.cgstAmount;
            const sgstAmount = taxInfo.sgstAmount;
            const totalTax = taxInfo.amount;

            const discountAmount = new Decimal(bill.discount?.toString() || '0');
            const totalAmount = subtotal.sub(discountAmount).add(totalTax);

            // Update Bill with correct calculated amounts
            await tx.bill.update({
                where: { id: bill.id },
                data: {
                    restaurantCharges: totalRestaurantCharges,
                    miscCharges: totalMisc,
                    subtotal,
                    taxAmount: totalTax,
                    totalAmount,
                    balanceDue: totalAmount.sub(bill.paidAmount),
                    updatedBy: userId
                }
            });

            // Generate sequential invoice number
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const count = await tx.invoice.count({
                where: {
                    hotelId: bill.hotelId,
                    createdAt: { gte: startOfDay }
                }
            });
            const invoiceNumber = `INV-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

            const invoiceData = {
                hotelId: bill.hotelId,
                billId: bill.id,
                invoiceNumber,
                subtotal,
                cgst: cgstAmount,
                sgst: sgstAmount,
                totalAmount,
                status: (totalAmount.sub(bill.paidAmount)).lte(0) ? InvoiceStatus.paid : InvoiceStatus.issued,
                createdBy: userId,
                updatedBy: userId
            };
            console.log("Creating Invoice with data:", JSON.stringify(invoiceData, null, 2));

            // Create Invoice
            try {
                const invoice = await tx.invoice.create({
                    data: invoiceData,
                    include: {
                        bill: {
                            include: {
                                booking: {
                                    include: { room: { include: { roomType: true } } }
                                }
                            }
                        }
                    }
                });
                return invoice;
            } catch (error: any) {
                console.error("CRITICAL ERROR during tx.invoice.create:");
                console.error("Error Message:", error.message);
                if (error.code) console.error("Prisma Error Code:", error.code);
                if (error.meta) console.error("Prisma Error Meta:", JSON.stringify(error.meta, null, 2));
                throw error;
            }
        });
    }

    async payInvoice(invoiceId: string, hotelId: string, userId: string, paymentMode: string) {
        const invoice = await prisma.invoice.findFirst({
            where: { id: invoiceId, hotelId },
            include: { bill: { include: { booking: true } } }
        });

        if (!invoice) throw new NotFoundError('Invoice not found');
        if (invoice.status === InvoiceStatus.paid) throw new BadRequestError('Invoice is already paid');
        if (invoice.status === InvoiceStatus.cancelled) throw new BadRequestError('Cannot pay a cancelled invoice');

        const bill = invoice.bill;
        if (!bill) {
            // If there's no bill, this might be a standalone invoice (e.g. restaurant)
            // If it's already paid, we are fine.
            if ((invoice.status as string) === 'paid') return invoice;
            throw new BadRequestError('Cannot settle an invoice without an associated bill');
        }
        const balanceDue = new Decimal(bill.balanceDue.toString() || '0');

        if (balanceDue.lte(0)) throw new BadRequestError('Outstanding balance is already settled');

        return prisma.$transaction(async (tx) => {
            // Log Payment
            await tx.advancePayment.create({
                data: {
                    hotelId: invoice.hotelId,
                    bookingId: bill.bookingId,
                    guestName: bill.booking.guestName,
                    amount: balanceDue,
                    paymentMethod: paymentMode as any,
                    status: 'adjusted',
                    usedAmount: balanceDue,
                    remarks: `Standalone Invoice Settlement for ${invoice.invoiceNumber}`,
                    createdBy: userId,
                    updatedBy: userId,
                },
            });

            // Update Bill
            await tx.bill.update({
                where: { id: (bill as any).id },
                data: {
                    paidAmount: new Decimal((bill as any).paidAmount.toString()).add(balanceDue),
                    balanceDue: 0,
                    status: 'paid',
                    updatedBy: userId,
                },
            });

            // Update Invoice
            const updatedInvoice = await tx.invoice.update({
                where: { id: invoice.id },
                data: { status: InvoiceStatus.paid, updatedBy: userId },
                include: {
                    bill: {
                        include: {
                            booking: {
                                include: { room: { include: { roomType: true } } }
                            }
                        }
                    }
                }
            });

            return updatedInvoice;
        });
    }
}
