import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { RestaurantService } from './restaurant.service';
import prisma from '../../config/database';
import { BadRequestError } from '../../utils/errors';

const restaurantService = new RestaurantService();

export class RestaurantController {
    private async getAuthorizedHotelId(req: AuthRequest, source: 'query' | 'body' = 'query'): Promise<string | undefined> {
        const user = req.user!;
        const requestedId = source === 'query' ? (req.query.hotelId as string) : (req.body.hotelId as string);

        // Authorization check helper
        const canBossCheck = async () => {
            if (String(user.role) === 'super_admin') return true;
            if (String(user.role) === 'admin') return !user.hotelId;
            if (!user.hotelId) return false;
            const assignedHotel = await prisma.hotel.findUnique({ where: { id: user.hotelId } });
            return !!(assignedHotel && (assignedHotel as any).posBossMode);
        };

        if (req.hotelId) return req.hotelId;

        if (!requestedId) {
            // If No hotelId specified, return undefined (all) ONLY if they have Boss Mode / is admin
            if (await canBossCheck()) return undefined;
            return user.hotelId;
        }

        if (requestedId === user.hotelId) {
            return user.hotelId;
        }

        // If different hotelId requested, check authorization
        if (await canBossCheck()) {
            return requestedId;
        }

        // Default to assigned hotel
        return user.hotelId;
    }

    // Categories
    async getCategories(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const categories = await restaurantService.getCategories(hotelId);
            res.json({ status: 'success', data: categories });
        } catch (e) { next(e); }
    }

    async createCategory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.body.hotelId;
            const category = await restaurantService.createCategory(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: category });
        } catch (e) { next(e); }
    }

    async updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.body.hotelId;
            const category = await restaurantService.updateCategory(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: category });
        } catch (e) { next(e); }
    }

    async deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || (req.query.hotelId as string);
            await restaurantService.deleteCategory(req.params.id, hotelId);
            res.json({ status: 'success', message: 'Category deleted' });
        } catch (e) { next(e); }
    }

    // Menu Items
    async getMenuItems(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const items = await restaurantService.getMenuItems(hotelId, req.query.categoryId as string);
            res.json({ status: 'success', data: items });
        } catch (e) { next(e); }
    }

    async createMenuItem(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.body.hotelId;
            const item = await restaurantService.createMenuItem(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: item });
        } catch (e) { next(e); }
    }

    async updateMenuItem(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.body.hotelId;
            const item = await restaurantService.updateMenuItem(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: item });
        } catch (e) { next(e); }
    }

    async deleteMenuItem(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || (req.query.hotelId as string);
            await restaurantService.deleteMenuItem(req.params.id, hotelId);
            res.json({ status: 'success', message: 'Menu item deleted' });
        } catch (e) { next(e); }
    }

    // Orders
    async getOrders(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            if (!hotelId) {
                return res.json({ status: 'success', data: [] });
            }
            const orders = (await restaurantService.getOrders(hotelId, req.query.status as string, req.query.bookingId as string)) || [];
            res.json({ status: 'success', data: orders });
        } catch (e) {
            next(e);
        }
    }

    async getServiceChargeReport(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const report = await restaurantService.getServiceChargeReport({
                hotelId,
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                stewardName: req.query.stewardName as string,
                orderId: req.query.orderId as string,
            });

            res.json({ status: 'success', data: report });
        } catch (e) {
            next(e);
        }
    }

    async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.body.hotelId;
            const order = await restaurantService.createOrder(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: order });
        } catch (e) { next(e); }
    }

    async updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.body.hotelId;
            const order = await restaurantService.updateOrderStatus(
                req.params.id, hotelId, req.body.status, req.user!.userId, req.body.paymentMethod
            );
            res.json({ status: 'success', data: order });
        } catch (e) { next(e); }
    }

    async updateOrder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.body.hotelId;
            const order = await restaurantService.updateOrder(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: order });
        } catch (e) { next(e); }
    }

    async getCheckedInRooms(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const rooms = await restaurantService.getCheckedInRooms(hotelId);
            res.json({ status: 'success', data: rooms });
        } catch (e) { next(e); }
    }

    async generateInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = (await this.getAuthorizedHotelId(req, 'body')) || req.user?.hotelId;
            if (!hotelId) throw new BadRequestError('Hotel context is required to generate bill');
            const invoice = await restaurantService.generateInvoice(req.params.id, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }

    async generateKOTAndInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = (await this.getAuthorizedHotelId(req, 'body')) || req.user?.hotelId;
            if (!hotelId) throw new BadRequestError('Hotel context is required to generate KOT');
            const result = await restaurantService.generateKOTAndInvoice(req.params.id, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: result });
        } catch (e) { next(e); }
    }

    async getKOTHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || (req.query.hotelId as string);
            const history = await restaurantService.getKOTHistory(req.params.id, hotelId);
            res.json({ status: 'success', data: history });
        } catch (e) { next(e); }
    }

    async getInvoices(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const invoices = await restaurantService.getInvoices(hotelId, req.query.status as string);
            res.json({ status: 'success', data: invoices });
        } catch (e) { next(e); }
    }

    async updateInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.body.hotelId;
            const invoice = await restaurantService.updateInvoice(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }

    async payInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.body.hotelId;
            const invoice = await restaurantService.payRestaurantInvoice(
                req.params.id, hotelId, req.body.paymentMethod, req.user!.userId
            );
            res.json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }

    // KOTs (New Section Support)
    async getKOTs(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const kots = await restaurantService.getKOTs(hotelId, req.query.status as string);
            res.json({ status: 'success', data: kots });
        } catch (e) { next(e); }
    }

    async updateKOT(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.body.hotelId;
            const kot = await restaurantService.updateKOT(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: kot });
        } catch (e) { next(e); }
    }

    async deleteKOT(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || (req.query.hotelId as string);
            await restaurantService.deleteKOT(req.params.id, hotelId);
            res.json({ status: 'success', message: 'KOT deleted' });
        } catch (e) { next(e); }
    }

    async convertKOTToInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = (await this.getAuthorizedHotelId(req, 'body')) || req.user?.hotelId;
            if (!hotelId) throw new BadRequestError('Hotel context is required to convert KOT to bill');
            const invoice = await restaurantService.convertToInvoiceFromKOT(req.params.id, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }

    async generateCombinedInvoiceFromKOTs(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = (await this.getAuthorizedHotelId(req, 'body')) || req.user?.hotelId;
            if (!hotelId) throw new BadRequestError('Hotel context is required to generate bill');
            const invoice = await restaurantService.generateCombinedInvoiceFromKOTs(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: invoice });
        } catch (e) { next(e); }
    }
}
