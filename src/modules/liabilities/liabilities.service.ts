import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class LiabilitiesService {
    async getLiabilitiesByHotel(hotelId: string) {
        return prisma.liability.findMany({
            where: { hotelId },
            orderBy: { dueDate: 'asc' },
        });
    }

    async createLiability(data: any, hotelId: string) {
        return prisma.liability.create({
            data: {
                hotelId,
                vendorName: data.vendorName,
                vendorType: data.vendorType,
                description: data.description,
                amount: data.amount,
                paidAmount: data.paidAmount || 0,
                dueDate: new Date(data.dueDate),
                status: data.status || 'pending',
                paymentHistory: data.paymentHistory || [],
            },
        });
    }

    async updateLiability(liabilityId: string, hotelId: string, data: any) {
        const liability = await prisma.liability.findFirst({ where: { id: liabilityId, hotelId } });
        if (!liability) throw new NotFoundError('Liability not found');
        return prisma.liability.update({
            where: { id: liabilityId },
            data: {
                ...data,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            },
        });
    }

    async addPayment(liabilityId: string, hotelId: string, payment: { date: string; amount: number; mode: string }) {
        const liability = await prisma.liability.findFirst({ where: { id: liabilityId, hotelId } });
        if (!liability) throw new NotFoundError('Liability not found');

        const history = (liability.paymentHistory as any[]) || [];
        history.push(payment);

        const newPaidAmount = Number(liability.paidAmount) + payment.amount;
        let newStatus = liability.status;
        if (newPaidAmount >= Number(liability.amount)) {
            newStatus = 'paid';
        } else if (newPaidAmount > 0) {
            newStatus = 'partial';
        }

        return prisma.liability.update({
            where: { id: liabilityId },
            data: {
                paidAmount: newPaidAmount,
                status: newStatus,
                paymentHistory: history,
            },
        });
    }

    async deleteLiability(liabilityId: string, hotelId: string) {
        const liability = await prisma.liability.findFirst({ where: { id: liabilityId, hotelId } });
        if (!liability) throw new NotFoundError('Liability not found');
        return prisma.liability.delete({
            where: { id: liabilityId },
        });
    }
}
