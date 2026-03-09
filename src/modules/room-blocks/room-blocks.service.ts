import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class RoomBlocksService {
    async getBlocksByHotel(hotelId: string) {
        return prisma.roomBlock.findMany({
            where: { hotelId },
            orderBy: { fromDate: 'desc' },
        });
    }

    async createBlock(data: any, hotelId: string, userId: string) {
        return prisma.roomBlock.create({
            data: {
                hotelId,
                roomId: data.roomId,
                roomNumber: data.roomNumber,
                reason: data.reason,
                fromDate: new Date(data.fromDate),
                toDate: new Date(data.toDate),
                blockedBy: data.blockedBy || 'admin',
                isActive: data.isActive ?? true,
            },
        });
    }

    async updateBlock(blockId: string, hotelId: string, data: any) {
        const block = await prisma.roomBlock.findFirst({ where: { id: blockId, hotelId } });
        if (!block) throw new NotFoundError('Room block not found');
        return prisma.roomBlock.update({
            where: { id: blockId },
            data: {
                ...data,
                fromDate: data.fromDate ? new Date(data.fromDate) : undefined,
                toDate: data.toDate ? new Date(data.toDate) : undefined,
            },
        });
    }

    async deleteBlock(blockId: string, hotelId: string) {
        const block = await prisma.roomBlock.findFirst({ where: { id: blockId, hotelId } });
        if (!block) throw new NotFoundError('Room block not found');
        return prisma.roomBlock.delete({
            where: { id: blockId },
        });
    }
}
