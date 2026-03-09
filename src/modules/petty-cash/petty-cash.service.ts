import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class PettyCashService {
    async getTxnsByHotel(hotelId: string) {
        return prisma.pettyCash.findMany({
            where: { hotelId },
            orderBy: { date: 'asc' },
        });
    }

    async createTxn(data: any, hotelId: string) {
        // We might need to calculate the new balance here or in the controller
        // For simplicity, let's fetch the last txn balance
        const lastTxn = await prisma.pettyCash.findFirst({
            where: { hotelId },
            orderBy: { createdAt: 'desc' },
        });

        const prevBalance = lastTxn ? Number(lastTxn.balance) : 0;
        const amount = Number(data.amount);
        const newBalance = data.type === 'receipt' ? prevBalance + amount : prevBalance - amount;

        return prisma.pettyCash.create({
            data: {
                hotelId,
                date: new Date(data.date),
                description: data.description,
                type: data.type,
                amount: amount,
                category: data.category,
                balance: newBalance,
            },
        });
    }

    async deleteTxn(txnId: string, hotelId: string) {
        const txn = await prisma.pettyCash.findFirst({ where: { id: txnId, hotelId } });
        if (!txn) throw new NotFoundError('Transaction not found');
        return prisma.pettyCash.delete({
            where: { id: txnId },
        });
    }
}
