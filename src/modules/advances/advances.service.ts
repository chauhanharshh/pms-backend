import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class AdvancesService {
    async getAdvancesByHotel(hotelId: string, status?: string) {
        const where: any = { hotelId, isDeleted: false };
        if (status) where.status = status;
        return prisma.advancePayment.findMany({
            where,
            include: {
                booking: { select: { id: true, guestName: true, checkInDate: true, checkOutDate: true } },
            },
            orderBy: { paymentDate: 'desc' },
        });
    }

    async createAdvance(data: any, hotelId: string, userId: string) {
        return prisma.advancePayment.create({
            data: {
                hotelId,
                bookingId: data.bookingId || null,
                guestName: data.guestName,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                status: 'pending',
                remarks: data.remarks,
                paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
                createdBy: userId,
                updatedBy: userId,
            },
        });
    }

    async updateAdvance(advanceId: string, hotelId: string, data: any, userId: string) {
        const advance = await prisma.advancePayment.findFirst({ where: { id: advanceId, hotelId } });
        if (!advance) throw new NotFoundError('Advance payment not found');
        return prisma.advancePayment.update({
            where: { id: advanceId },
            data: { ...data, updatedBy: userId },
        });
    }

    async deleteAdvance(advanceId: string, hotelId: string, userId: string) {
        const advance = await prisma.advancePayment.findFirst({ where: { id: advanceId, hotelId } });
        if (!advance) throw new NotFoundError('Advance payment not found');
        return prisma.advancePayment.update({
            where: { id: advanceId },
            data: { isDeleted: true, updatedBy: userId },
        });
    }
}
