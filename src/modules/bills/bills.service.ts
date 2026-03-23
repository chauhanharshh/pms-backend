import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class BillsService {
    async getBillsByHotel(hotelId: string, status?: string) {
        const where: any = { hotelId };
        if (status) where.status = status;
        const bills = await prisma.bill.findMany({
            where,
            include: {
                booking: { 
                    select: { 
                        guestName: true, 
                        checkInDate: true, 
                        checkOutDate: true,
                        roomId: true,
                        miscCharges: { select: { amount: true, quantity: true } },
                        restaurantOrders: { 
                            where: { status: { not: 'cancelled' } },
                            select: { totalAmount: true } 
                        }
                    } 
                },
                invoice: { select: { id: true, invoiceNumber: true, status: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return Promise.all(bills.map(async (bill: any) => {
            if (bill.booking) {
                const miscTotal = bill.booking.miscCharges?.reduce((sum: number, charge: any) => 
                    sum + (Number(charge.amount) * Number(charge.quantity)), 0) || 0;
                    
                // Restaurant orders via bookingId
                const bookingRestTotal = bill.booking.restaurantOrders?.reduce((sum: number, order: any) => 
                    sum + Number(order.totalAmount), 0) || 0;

                // Also fetch restaurant orders linked directly by roomId (no bookingId or separate flow)
                let roomRestTotal = 0;
                if (bill.booking.roomId) {
                    const roomOrders = await prisma.restaurantOrder.findMany({
                        where: {
                            hotelId,
                            roomId: bill.booking.roomId,
                            bookingId: null,
                            status: { not: 'cancelled' },
                            isDeleted: false,
                        },
                        select: { totalAmount: true }
                    });
                    roomRestTotal = roomOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);
                }

                const restTotal = bookingRestTotal + roomRestTotal;

                return {
                    ...bill,
                    miscCharges: Math.max(Number(bill.miscCharges), miscTotal),
                    restaurantCharges: Math.max(Number(bill.restaurantCharges), restTotal)
                };
            }
            return bill;
        }));
    }

    async getBillById(billId: string, hotelId: string) {
        const bill = await prisma.bill.findFirst({
            where: { id: billId, hotelId },
            include: {
                booking: {
                    include: {
                        room: { include: { roomType: true } },
                        miscCharges: true,
                        restaurantOrders: { where: { status: { not: 'cancelled' } }, include: { orderItems: { include: { menuItem: true } } } },
                    },
                },
                invoice: true,
            },
        });
        if (!bill) throw new NotFoundError('Bill not found');

        if (bill.status && bill.status.toLowerCase() !== 'paid' && bill.booking) {
            const miscTotal = (bill.booking as any).miscCharges?.reduce((sum: number, charge: any) => 
                sum + (Number(charge.amount) * Number(charge.quantity)), 0) || 0;
                
            const restTotal = (bill.booking as any).restaurantOrders?.reduce((sum: number, order: any) => 
                sum + Number(order.totalAmount), 0) || 0;

            bill.miscCharges = Math.max(Number(bill.miscCharges), miscTotal) as any;
            bill.restaurantCharges = Math.max(Number(bill.restaurantCharges), restTotal) as any;
        }

        return bill;
    }

    async updateBill(billId: string, hotelId: string, data: any, userId: string) {
        const bill = await prisma.bill.findFirst({ where: { id: billId, hotelId } });
        if (!bill) throw new NotFoundError('Bill not found');
        return prisma.bill.update({
            where: { id: billId },
            data: { ...data, updatedBy: userId },
        });
    }
}
