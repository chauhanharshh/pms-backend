import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { PettyCashService } from './petty-cash.service';

const pettyCashService = new PettyCashService();

export class PettyCashController {
    async getTxns(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            const txns = await pettyCashService.getTxnsByHotel(hotelId);
            res.json({ status: 'success', data: txns });
        } catch (e) { next(e); }
    }

    async createTxn(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.body.hotelId;
            const txn = await pettyCashService.createTxn(req.body, hotelId);
            res.status(201).json({ status: 'success', data: txn });
        } catch (e) { next(e); }
    }

    async deleteTxn(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            await pettyCashService.deleteTxn(req.params.id, hotelId);
            res.json({ status: 'success', message: 'Transaction deleted' });
        } catch (e) { next(e); }
    }
}
