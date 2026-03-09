import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { BillsService } from './bills.service';

const billsService = new BillsService();

export class BillsController {
    async getBills(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            const bills = await billsService.getBillsByHotel(hotelId, req.query.status as string);
            res.json({ status: 'success', data: bills });
        } catch (e) { next(e); }
    }

    async getBillById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            const bill = await billsService.getBillById(req.params.id, hotelId);
            res.json({ status: 'success', data: bill });
        } catch (e) { next(e); }
    }

    async updateBill(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.body.hotelId;
            const bill = await billsService.updateBill(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: bill });
        } catch (e) { next(e); }
    }
}
