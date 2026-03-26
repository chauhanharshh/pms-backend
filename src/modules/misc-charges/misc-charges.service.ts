import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class MiscChargesService {
    async getMiscChargesByHotel(hotelId: string, bookingId?: string) {
        const where: any = { hotelId, isDeleted: false };
        if (bookingId) where.bookingId = bookingId;
        const charges = await prisma.miscCharge.findMany({
            where,
            include: {
                booking: { select: { id: true, guestName: true, room: { select: { roomNumber: true } }, bill: { select: { invoice: { select: { status: true } } } } } },
                room: { select: { id: true, roomNumber: true } },
            },
            orderBy: { chargeDate: 'desc' },
        });
        return charges.map(c => {
            const invoiceStatus = c.booking?.bill?.invoice?.status;
            const status = invoiceStatus === 'paid' ? 'PAID' : 'PENDING';
            return {
                ...c,
                guestName: c.booking?.guestName || null,
                roomNumber: c.room?.roomNumber || c.booking?.room?.roomNumber || null,
                status
            };
        });
    }

    async createMiscCharge(data: any, hotelId: string, userId: string) {
        const charge = await prisma.miscCharge.create({
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
            include: {
                booking: { select: { guestName: true, room: { select: { roomNumber: true } } } },
                room: { select: { roomNumber: true } }
            }
        });
        return {
            ...charge,
            guestName: charge.booking?.guestName || null,
            roomNumber: charge.room?.roomNumber || charge.booking?.room?.roomNumber || null
        };
    }

    async updateMiscCharge(chargeId: string, hotelId: string, data: any, userId: string) {
        const charge = await prisma.miscCharge.findFirst({ where: { id: chargeId, hotelId } });
        if (!charge) throw new NotFoundError('Misc charge not found');
        const updatedCharge = await prisma.miscCharge.update({
            where: { id: chargeId },
            data: { ...data, updatedBy: userId },
            include: {
                booking: { select: { guestName: true, room: { select: { roomNumber: true } } } },
                room: { select: { roomNumber: true } }
            }
        });
        return {
            ...updatedCharge,
            guestName: updatedCharge.booking?.guestName || null,
            roomNumber: updatedCharge.room?.roomNumber || updatedCharge.booking?.room?.roomNumber || null
        };
    }

    async deleteMiscCharge(chargeId: string, hotelId: string, userId: string) {
        const charge = await prisma.miscCharge.findFirst({ where: { id: chargeId, hotelId } });
        if (!charge) throw new NotFoundError('Misc charge not found');
        const deletedCharge = await prisma.miscCharge.update({
            where: { id: chargeId },
            data: { isDeleted: true, updatedBy: userId },
            include: {
                booking: { select: { guestName: true, room: { select: { roomNumber: true } } } },
                room: { select: { roomNumber: true } }
            }
        });
        return {
            ...deletedCharge,
            guestName: deletedCharge.booking?.guestName || null,
            roomNumber: deletedCharge.room?.roomNumber || deletedCharge.booking?.room?.roomNumber || null
        };
    }
}
