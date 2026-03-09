import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class BillsService {
    async getBillsByHotel(hotelId: string, status?: string) {
        const where: any = { hotelId };
        if (status) where.status = status;
        return prisma.bill.findMany({
            where,
            include: {
                booking: { select: { guestName: true, checkInDate: true, checkOutDate: true } },
                invoice: { select: { id: true, invoiceNumber: true, status: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getBillById(billId: string, hotelId: string) {
        const bill = await prisma.bill.findFirst({
            where: { id: billId, hotelId },
            include: {
                booking: {
                    include: {
                        room: { include: { roomType: true } },
                        miscCharges: true,
                        restaurantOrders: { include: { orderItems: { include: { menuItem: true } } } },
                    },
                },
                invoice: true,
            },
        });
        if (!bill) throw new NotFoundError('Bill not found');
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
