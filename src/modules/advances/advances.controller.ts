import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { AdvancesService } from './advances.service';

const advancesService = new AdvancesService();

export class AdvancesController {
    async getAdvances(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const advances = await advancesService.getAdvancesByHotel(req.hotelId as string, req.query.status as string);
            res.json({ status: 'success', data: advances });
        } catch (e) { next(e); }
    }

    async createAdvance(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const advance = await advancesService.createAdvance(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: advance });
        } catch (e) { next(e); }
    }

    async updateAdvance(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const advance = await advancesService.updateAdvance(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: advance });
        } catch (e) { next(e); }
    }

    async deleteAdvance(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
            await advancesService.deleteAdvance(req.params.id, hotelId, req.user!.userId);
            res.json({ status: 'success', message: 'Advance deleted' });
        } catch (e) { next(e); }
    }
}
