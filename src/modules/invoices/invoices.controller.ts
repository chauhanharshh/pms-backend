import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { InvoicesService } from './invoices.service';

const invoicesService = new InvoicesService();

export class InvoicesController {
    async getInvoices(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const invoices = await invoicesService.getInvoicesByHotel(req.hotelId as string, req.query.status as string);
            res.json({ status: 'success', data: invoices });
        } catch (e) { next(e); }
    }

    async getInvoiceById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const invoice = await invoicesService.getInvoiceById(req.params.id, req.hotelId as string);
            res.json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }

    async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const invoice = await invoicesService.updateInvoiceStatus(req.params.id, req.hotelId as string, req.body.status, req.user!.userId);
            res.json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }

    async generateInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const invoice = await invoicesService.generateInvoice(req.body, req.hotelId as string, req.user!.userId);
            res.status(201).json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }

    async payInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const invoice = await invoicesService.payInvoice(req.params.id, req.hotelId as string, req.user!.userId, req.body.paymentMode);
            res.json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }
}
