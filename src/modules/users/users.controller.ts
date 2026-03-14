import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { UsersService } from './users.service';

const usersService = new UsersService();

export class UsersController {
    async getAllUsers(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const isAdminLike = String(req.user?.role) === 'super_admin' || (String(req.user?.role) === 'admin' && !req.user?.hotelId);
            const hotelId = !isAdminLike ? req.user?.hotelId : req.query.hotelId as string | undefined;
            const users = await usersService.getUsersByHotel(hotelId);
            res.json({ status: 'success', data: users });
        } catch (e) { next(e); }
    }

    async createUser(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = await usersService.createUser(req.body, req.user!.userId, req.user!.role, req.user!.hotelId);
            res.status(201).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = await usersService.updateUser(req.params.id, req.body, req.user!.userId, req.user!.role, req.user!.hotelId);
            res.json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await usersService.deleteUser(req.params.id, req.user!.role, req.user!.hotelId);
            res.json({ status: 'success', message: 'User deactivated' });
        } catch (e) { next(e); }
    }

    async getAdminAccounts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const users = await usersService.getAdminAccounts();
            res.json({ status: 'success', data: users });
        } catch (e) { next(e); }
    }

    async createAdminAccount(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = await usersService.createAdminAccount(req.body, req.user!.userId);
            res.status(201).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async updateAdminAccount(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = await usersService.updateAdminAccount(req.params.id, req.body, req.user!.userId);
            res.json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async resetAdminPassword(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { password } = req.body;
            const user = await usersService.resetAdminPassword(req.params.id, password, req.user!.userId);
            res.json({ status: 'success', data: user, message: 'Password reset successful' });
        } catch (e) { next(e); }
    }

    async setAdminStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { isActive } = req.body;
            const user = await usersService.setAdminStatus(req.params.id, !!isActive, req.user!.userId);
            res.json({ status: 'success', data: user, message: 'Admin status updated' });
        } catch (e) { next(e); }
    }
}
