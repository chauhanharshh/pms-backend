import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { VouchersService } from './vouchers.service';

const vouchersService = new VouchersService();

export class VouchersController {
    async getVouchers(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            const vouchers = await vouchersService.getVouchersByHotel(hotelId);
            res.json({ status: 'success', data: vouchers });
        } catch (e) { next(e); }
    }

    async createVoucher(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.body.hotelId;
            const voucher = await vouchersService.createVoucher(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: voucher });
        } catch (e) { next(e); }
    }

    async updateVoucher(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.body.hotelId;
            const voucher = await vouchersService.updateVoucher(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: voucher });
        } catch (e) { next(e); }
    }

    async deleteVoucher(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            await vouchersService.deleteVoucher(req.params.id, hotelId, req.user!.userId);
            res.json({ status: 'success', message: 'Voucher deleted' });
        } catch (e) { next(e); }
    }
}
