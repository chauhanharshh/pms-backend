import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { LiabilitiesService } from './liabilities.service';

const liabilitiesService = new LiabilitiesService();

export class LiabilitiesController {
    async getLiabilities(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            const liabilities = await liabilitiesService.getLiabilitiesByHotel(hotelId);
            res.json({ status: 'success', data: liabilities });
        } catch (e) { next(e); }
    }

    async createLiability(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const liability = await liabilitiesService.createLiability(req.body, hotelId);
            res.status(201).json({ status: 'success', data: liability });
        } catch (e) { next(e); }
    }

    async updateLiability(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const liability = await liabilitiesService.updateLiability(req.params.id, hotelId, req.body);
            res.json({ status: 'success', data: liability });
        } catch (e) { next(e); }
    }

    async addPayment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const liability = await liabilitiesService.addPayment(req.params.id, hotelId, req.body);
            res.json({ status: 'success', data: liability });
        } catch (e) { next(e); }
    }

    async deleteLiability(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            await liabilitiesService.deleteLiability(req.params.id, hotelId);
            res.json({ status: 'success', message: 'Liability deleted' });
        } catch (e) { next(e); }
    }
}
