import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { UsersService } from './users.service';

const usersService = new UsersService();

export class UsersController {
    async getAllUsers(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.user?.role !== 'admin' ? req.user?.hotelId : req.query.hotelId as string | undefined;
            const users = await usersService.getUsersByHotel(hotelId);
            res.json({ status: 'success', data: users });
        } catch (e) { next(e); }
    }

    async createUser(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = await usersService.createUser(req.body, req.user!.userId);
            res.status(201).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = await usersService.updateUser(req.params.id, req.body, req.user!.userId);
            res.json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await usersService.deleteUser(req.params.id);
            res.json({ status: 'success', message: 'User deactivated' });
        } catch (e) { next(e); }
    }
}
