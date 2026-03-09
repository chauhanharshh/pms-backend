import prisma from '../../config/database';

export class StewardService {
    async getStewardsByHotel(hotelId: string) {
        return prisma.hotelSteward.findMany({
            where: { hotelId },
            orderBy: { name: 'asc' },
        });
    }

    async createSteward(data: any, hotelId: string) {
        console.log('StewardService.createSteward - data:', data, 'hotelId:', hotelId);
        try {
            const result = await prisma.hotelSteward.create({
                data: {
                    name: data.name,
                    isActive: data.isActive !== undefined ? data.isActive : true,
                    hotelId,
                },
            });
            console.log('Prisma create success:', result);
            return result;
        } catch (error) {
            console.error('Prisma create error:', error);
            throw error;
        }
    }

    async updateSteward(id: string, hotelId: string, data: any) {
        const steward = await prisma.hotelSteward.findUnique({ where: { id } });
        if (!steward || steward.hotelId !== hotelId) {
            throw new Error('Steward not found or unauthorized');
        }
        return prisma.hotelSteward.update({
            where: { id },
            data: {
                name: data.name !== undefined ? data.name : steward.name,
                isActive: data.isActive !== undefined ? data.isActive : steward.isActive,
            },
        });
    }

    async deleteSteward(id: string, hotelId: string) {
        const steward = await prisma.hotelSteward.findUnique({ where: { id } });
        if (!steward || steward.hotelId !== hotelId) {
            throw new Error('Steward not found or unauthorized');
        }
        return prisma.hotelSteward.delete({
            where: { id },
        });
    }
}
