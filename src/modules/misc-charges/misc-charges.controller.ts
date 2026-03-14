import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { MiscChargesService } from './misc-charges.service';

const miscChargesService = new MiscChargesService();

export class MiscChargesController {
    async getMiscCharges(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
            const charges = await miscChargesService.getMiscChargesByHotel(hotelId, req.query.bookingId as string);
            res.json({ status: 'success', data: charges });
        } catch (e) { next(e); }
    }

    async createMiscCharge(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const charge = await miscChargesService.createMiscCharge(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: charge });
        } catch (e) { next(e); }
    }

    async updateMiscCharge(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const charge = await miscChargesService.updateMiscCharge(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: charge });
        } catch (e) { next(e); }
    }

    async deleteMiscCharge(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
            await miscChargesService.deleteMiscCharge(req.params.id, hotelId, req.user!.userId);
            res.json({ status: 'success', message: 'Charge deleted' });
        } catch (e) { next(e); }
    }
}
