import { Request, Response } from 'express';
import { GstReportsService } from './gst-reports.service';

const gstReportsService = new GstReportsService();

export class GstReportsController {
    async getSummaryReport(req: Request, res: Response) {
        const user = (req as any).user;
        const canSwitchHotels = user.role === 'super_admin' || (user.role === 'admin' && !user.hotelId);
        const targetHotelId = canSwitchHotels && req.query.hotelId ? (req.query.hotelId as string) : user.hotelId;
        const { startDate, endDate, status } = req.query;
        const result = await gstReportsService.getSummaryReport(
            targetHotelId,
            startDate as string,
            endDate as string,
            status as string
        );
        res.status(200).json({ status: 'success', data: result });
    }

    async getRoomGstReport(req: Request, res: Response) {
        const user = (req as any).user;
        const canSwitchHotels = user.role === 'super_admin' || (user.role === 'admin' && !user.hotelId);
        const targetHotelId = canSwitchHotels && req.query.hotelId ? (req.query.hotelId as string) : user.hotelId;
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

    async getRestaurantGstReport(req: Request, res: Response) {
        const user = (req as any).user;
        const canSwitchHotels = user.role === 'super_admin' || (user.role === 'admin' && !user.hotelId);
        const targetHotelId = canSwitchHotels && req.query.hotelId ? (req.query.hotelId as string) : user.hotelId;
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

    async getMiscGstReport(req: Request, res: Response) {
        const user = (req as any).user;
        const canSwitchHotels = user.role === 'super_admin' || (user.role === 'admin' && !user.hotelId);
        const targetHotelId = canSwitchHotels && req.query.hotelId ? (req.query.hotelId as string) : user.hotelId;
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

    async getInvoiceWiseReport(req: Request, res: Response) {
        const user = (req as any).user;
        const canSwitchHotels = user.role === 'super_admin' || (user.role === 'admin' && !user.hotelId);
        const targetHotelId = canSwitchHotels && req.query.hotelId ? (req.query.hotelId as string) : user.hotelId;
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

    async getSacHsnReport(req: Request, res: Response) {
        const user = (req as any).user;
        const canSwitchHotels = user.role === 'super_admin' || (user.role === 'admin' && !user.hotelId);
        const targetHotelId = canSwitchHotels && req.query.hotelId ? (req.query.hotelId as string) : user.hotelId;
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
