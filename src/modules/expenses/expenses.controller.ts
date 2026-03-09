import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { ExpensesService } from './expenses.service';

const expensesService = new ExpensesService();

export class ExpensesController {
    async getExpenses(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
            const expenses = await expensesService.getExpensesByHotel(req.hotelId as string, startDate, endDate);
            res.json({ status: 'success', data: expenses });
        } catch (e) { next(e); }
    }

    async createExpense(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId as string;
            const expense = await expensesService.createExpense(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: expense });
        } catch (e) { next(e); }
    }

    async updateExpense(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId as string;
            const expense = await expensesService.updateExpense(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: expense });
        } catch (e) { next(e); }
    }

    async deleteExpense(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId as string;
            await expensesService.deleteExpense(req.params.id, hotelId, req.user!.userId);
            res.json({ status: 'success', message: 'Expense deleted' });
        } catch (e) { next(e); }
    }
}
