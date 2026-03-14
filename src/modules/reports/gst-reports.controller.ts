import { Response } from 'express';
import { GstReportsService } from './gst-reports.service';
import { AuthRequest } from '../../types';
import { BadRequestError } from '../../utils/errors';

const gstReportsService = new GstReportsService();

export class GstReportsController {
    private resolveHotelId(req: AuthRequest): string {
        const targetHotelId = req.hotelId || req.user?.hotelId || (req.query.hotelId as string);
        if (!targetHotelId) {
            throw new BadRequestError('Hotel context is required for GST reports');
        }
        return targetHotelId;
    }

    async getSummaryReport(req: AuthRequest, res: Response) {
        const targetHotelId = this.resolveHotelId(req);
        const { startDate, endDate, status } = req.query;
        const result = await gstReportsService.getSummaryReport(
            targetHotelId,
            startDate as string,
            endDate as string,
            status as string
        );
        res.status(200).json({ status: 'success', data: result });
    }

    async getRoomGstReport(req: AuthRequest, res: Response) {
        const targetHotelId = this.resolveHotelId(req);
        const { startDate, endDate, status, companyId } = req.query;
        const result = await gstReportsService.getRoomGstReport(
            targetHotelId,
            startDate as string,
            endDate as string,
            status as string,
            companyId as string
        );
        res.status(200).json({ status: 'success', data: result });
    }

    async getRestaurantGstReport(req: AuthRequest, res: Response) {
        const targetHotelId = this.resolveHotelId(req);
        const { startDate, endDate, status, companyId } = req.query;
        const result = await gstReportsService.getRestaurantGstReport(
            targetHotelId,
            startDate as string,
            endDate as string,
            status as string,
            companyId as string
        );
        res.status(200).json({ status: 'success', data: result });
    }

    async getMiscGstReport(req: AuthRequest, res: Response) {
        const targetHotelId = this.resolveHotelId(req);
        const { startDate, endDate, status, companyId } = req.query;
        const result = await gstReportsService.getMiscGstReport(
            targetHotelId,
            startDate as string,
            endDate as string,
            status as string,
            companyId as string
        );
        res.status(200).json({ status: 'success', data: result });
    }

    async getInvoiceWiseReport(req: AuthRequest, res: Response) {
        const targetHotelId = this.resolveHotelId(req);
        const { startDate, endDate, status, companyId } = req.query;
        const result = await gstReportsService.getInvoiceWiseReport(
            targetHotelId,
            startDate as string,
            endDate as string,
            status as string,
            companyId as string
        );
        res.status(200).json({ status: 'success', data: result });
    }

    async getSacHsnReport(req: AuthRequest, res: Response) {
        const targetHotelId = this.resolveHotelId(req);
        const { startDate, endDate, status } = req.query;
        const result = await gstReportsService.getSacHsnReport(
            targetHotelId,
            startDate as string,
            endDate as string,
            status as string
        );
        res.status(200).json({ status: 'success', data: result });
    }
}
