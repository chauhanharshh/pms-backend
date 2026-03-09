import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { VendorsService } from './vendors.service';

const vendorsService = new VendorsService();

export class VendorsController {
    async getVendors(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            const vendors = await vendorsService.getVendorsByHotel(hotelId);
            res.json({ status: 'success', data: vendors });
        } catch (e) { next(e); }
    }

    async createVendor(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.body.hotelId;
            const vendor = await vendorsService.createVendor(req.body, hotelId);
            res.status(201).json({ status: 'success', data: vendor });
        } catch (e) { next(e); }
    }

    async updateVendor(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.body.hotelId;
            const vendor = await vendorsService.updateVendor(req.params.id, hotelId, req.body);
            res.json({ status: 'success', data: vendor });
        } catch (e) { next(e); }
    }

    async deleteVendor(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            await vendorsService.deleteVendor(req.params.id, hotelId);
            res.json({ status: 'success', message: 'Vendor deleted' });
        } catch (e) { next(e); }
    }
}
