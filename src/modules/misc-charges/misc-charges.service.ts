import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class MiscChargesService {
    async getMiscChargesByHotel(hotelId: string, bookingId?: string) {
        const where: any = { hotelId, isDeleted: false };
        if (bookingId) where.bookingId = bookingId;
        return prisma.miscCharge.findMany({
            where,
            include: {
                booking: { select: { id: true, guestName: true } },
            },
            orderBy: { chargeDate: 'desc' },
        });
    }

    async createMiscCharge(data: any, hotelId: string, userId: string) {
        return prisma.miscCharge.create({
            data: {
                hotelId,
                roomId: data.roomId || null,
                bookingId: data.bookingId || null,
                category: data.category.toLowerCase(), // Fix capitalization mismatch (e.g., 'Laundry' to 'laundry')
                description: data.description,
                amount: data.amount,
                quantity: data.quantity ?? 1,
                chargeDate: data.chargeDate ? new Date(data.chargeDate) : new Date(),
                createdBy: userId,
                updatedBy: userId,
            },
        });
    }

    async updateMiscCharge(chargeId: string, hotelId: string, data: any, userId: string) {
        const charge = await prisma.miscCharge.findFirst({ where: { id: chargeId, hotelId } });
        if (!charge) throw new NotFoundError('Misc charge not found');
        return prisma.miscCharge.update({
            where: { id: chargeId },
            data: { ...data, updatedBy: userId },
        });
    }

    async deleteMiscCharge(chargeId: string, hotelId: string, userId: string) {
        const charge = await prisma.miscCharge.findFirst({ where: { id: chargeId, hotelId } });
        if (!charge) throw new NotFoundError('Misc charge not found');
        return prisma.miscCharge.update({
            where: { id: chargeId },
            data: { isDeleted: true, updatedBy: userId },
        });
    }
}
