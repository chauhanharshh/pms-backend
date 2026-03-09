import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class ExpensesService {
    async getExpensesByHotel(hotelId: string, startDate?: Date, endDate?: Date) {
        const where: any = { hotelId, isDeleted: false };
        if (startDate || endDate) {
            where.expenseDate = {};
            if (startDate) where.expenseDate.gte = startDate;
            if (endDate) where.expenseDate.lte = endDate;
        }
        return prisma.expense.findMany({
            where,
            orderBy: { expenseDate: 'desc' },
        });
    }

    async createExpense(data: any, hotelId: string, userId: string) {
        return prisma.expense.create({
            data: {
                hotelId,
                category: data.category,
                description: data.description,
                amount: data.amount,
                payee: data.payee,
                paymentMethod: data.paymentMethod,
                expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
                receiptNumber: data.receiptNumber,
                createdBy: userId,
                updatedBy: userId,
            },
        });
    }

    async updateExpense(expenseId: string, hotelId: string, data: any, userId: string) {
        const expense = await prisma.expense.findFirst({ where: { id: expenseId, hotelId } });
        if (!expense) throw new NotFoundError('Expense not found');
        return prisma.expense.update({
            where: { id: expenseId },
            data: { ...data, updatedBy: userId },
        });
    }

    async deleteExpense(expenseId: string, hotelId: string, userId: string) {
        const expense = await prisma.expense.findFirst({ where: { id: expenseId, hotelId } });
        if (!expense) throw new NotFoundError('Expense not found');
        return prisma.expense.update({
            where: { id: expenseId },
            data: { isDeleted: true, updatedBy: userId },
        });
    }
}
