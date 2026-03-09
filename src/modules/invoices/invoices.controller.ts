import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { InvoicesService } from './invoices.service';

const invoicesService = new InvoicesService();

export class InvoicesController {
    async getInvoices(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            const invoices = await invoicesService.getInvoicesByHotel(hotelId, req.query.status as string);
            res.json({ status: 'success', data: invoices });
        } catch (e) { next(e); }
    }

    async getInvoiceById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.query.hotelId as string;
            const invoice = await invoicesService.getInvoiceById(req.params.id, hotelId);
            res.json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }

    async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.body.hotelId;
            const invoice = await invoicesService.updateInvoiceStatus(req.params.id, hotelId, req.body.status, req.user!.userId);
            res.json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }

    async generateInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.body.hotelId;
            const invoice = await invoicesService.generateInvoice(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }

    async payInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.hotelId || req.body.hotelId;
            const invoice = await invoicesService.payInvoice(req.params.id, hotelId, req.user!.userId, req.body.paymentMode);
            res.json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }
}
