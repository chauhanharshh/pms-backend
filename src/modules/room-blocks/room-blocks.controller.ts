import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { RoomBlocksService } from './room-blocks.service';

const roomBlocksService = new RoomBlocksService();

export class RoomBlocksController {
    async getBlocks(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
            const blocks = await roomBlocksService.getBlocksByHotel(hotelId);
            res.json({ status: 'success', data: blocks });
        } catch (e) { next(e); }
    }

    async createBlock(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const block = await roomBlocksService.createBlock(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: block });
        } catch (e) { next(e); }
    }

    async updateBlock(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const block = await roomBlocksService.updateBlock(req.params.id, hotelId, req.body);
            res.json({ status: 'success', data: block });
        } catch (e) { next(e); }
    }

    async deleteBlock(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
            await roomBlocksService.deleteBlock(req.params.id, hotelId);
            res.json({ status: 'success', message: 'Room block deleted' });
        } catch (e) { next(e); }
    }
}
