import { Response } from 'express';
import { AuthRequest } from '../../types';
import { DayClosingService } from './day-closing.service';
import { BadRequestError } from '../../utils/errors';

const dayClosingService = new DayClosingService();

export class DayClosingController {
    async getClosingRecords(req: AuthRequest, res: Response) {
        if (!req.hotelId) throw new BadRequestError('Hotel ID required');
        const records = await dayClosingService.getClosingRecords(req.hotelId);
        res.json({ status: 'success', data: records });
    }

    async getPreview(req: AuthRequest, res: Response) {
        if (!req.hotelId) throw new BadRequestError('Hotel ID required');
        const { date } = req.query;
        if (!date) throw new BadRequestError('Date required');

        const totals = await dayClosingService.getWorkingDateTotals(req.hotelId, new Date(date as string));
        res.json({ status: 'success', data: totals });
    }

    async closeDay(req: AuthRequest, res: Response) {
        if (!req.hotelId) throw new BadRequestError('Hotel ID required');
        const { workingDate } = req.body;
        if (!workingDate) throw new BadRequestError('Working date required');

        const result = await dayClosingService.closeDay(req.hotelId, workingDate, req.user!.userId);
        res.json({ status: 'success', data: result, message: 'Day closed successfully' });
    }

    async deleteLastClosing(req: AuthRequest, res: Response) {
        if (!req.hotelId) throw new BadRequestError('Hotel ID required');
        const result = await dayClosingService.deleteLastClosing(req.hotelId);
        res.json({ status: 'success', data: result, message: 'Last closing deleted successfully' });
    }

    async getPendingDates(req: AuthRequest, res: Response) {
        if (!req.hotelId) throw new BadRequestError('Hotel ID required');
        const dates = await dayClosingService.getPendingDates(req.hotelId);
        res.json({ status: 'success', data: dates });
    }

    async getPendingProcesses(req: AuthRequest, res: Response) {
        if (!req.hotelId) throw new BadRequestError('Hotel ID required');
        const processes = await dayClosingService.getPendingProcesses(req.hotelId);
        res.json({ status: 'success', data: processes });
    }
}
