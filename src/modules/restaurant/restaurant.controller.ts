import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { RestaurantService } from './restaurant.service';
import { RestaurantDayClosingService } from './restaurant-day-closing.service';
import prisma from '../../config/database';
import { BadRequestError } from '../../utils/errors';

const restaurantService = new RestaurantService();
const restaurantDayClosingService = new RestaurantDayClosingService();

export class RestaurantController {
    private async getAuthorizedHotelId(req: AuthRequest, source: 'query' | 'body' = 'query'): Promise<string | undefined> {
        const user = req.user!;
        const requestedId = source === 'query'
            ? ((req.query.hotelId as string) || (req.headers['x-hotel-id'] as string))
            : ((req.body.hotelId as string) || (req.headers['x-hotel-id'] as string));

        // Authorization check helper: does this user's OWN hotel have POS Boss Mode?
        const canBossCheck = async () => {
            if (String(user.role) === 'super_admin') return true;
            if (String(user.role) === 'admin') return true;
            const ownHotelId = user.hotelId;
            if (!ownHotelId) return false;
            const assignedHotel = await prisma.hotel.findUnique({ where: { id: ownHotelId } });
            return !!(assignedHotel && ((assignedHotel as any).posBossMode || String(user.role) === 'restaurant_staff' || String(user.role) === 'restaurant_admin'));
        };

        // 1. Handle "all" sentinel first to prevent UUID validation crashes
        if (requestedId === 'all') {
            if (await canBossCheck()) return undefined;
            return user.hotelId;
        }

        // 2. If a specific different hotel is requested, check boss mode eligibility
        if (requestedId && requestedId !== user.hotelId) {
            if (await canBossCheck()) {
                return requestedId;
            }
            // Not authorized for cross-hotel — fall through to own hotel
        }

        // Use requested ID if it matches own hotel or use req.hotelId (set by tenantIsolation)
        if (requestedId && requestedId === user.hotelId) {
            return user.hotelId;
        }

        if (req.hotelId) return req.hotelId;

        if (!requestedId) {
            // If No hotelId specified, return undefined (all) ONLY if they have Boss Mode / is admin
            if (await canBossCheck()) return undefined;
            return user.hotelId;
        }

        // Default to assigned hotel
        return user.hotelId;
    }

    // Categories
    async getCategories(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const categories = await restaurantService.getCategories(hotelId || (req.ownedHotelIds as string[]));
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
            const items = await restaurantService.getMenuItems(hotelId || (req.ownedHotelIds as string[]), req.query.categoryId as string);
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
            console.log('UPDATING MENU ITEM:', { id: req.params.id, hotelId, body: req.body });
            const item = await restaurantService.updateMenuItem(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: item });
        } catch (e: any) { 
            console.error('CONTROLLER UPDATE ERROR:', e);
            next(e); 
        }
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
            const adminId = req.query.adminId as string;
            const safeAdminId = adminId || (req.user as any)?.adminId || (req.user as any)?.userId;
            
            // Fixed: added adminId support to prevent 500 on multi-hotel fetch
            let targetHotelIds: string | string[] | undefined = hotelId || (req.ownedHotelIds as string[]);
            
            if (!hotelId && safeAdminId) {
                const hotels = await prisma.hotel.findMany({
                    where: { adminId: safeAdminId },
                    select: { id: true }
                });
                if (hotels.length > 0) {
                    targetHotelIds = hotels.map(h => h.id);
                }
            }

            // Fallback to all owned hotels if no specific hotelId and no adminId override
            if (!hotelId && !safeAdminId && req.ownedHotelIds) {
                targetHotelIds = req.ownedHotelIds as string[];
            }

            const rooms = await restaurantService.getCheckedInRooms(targetHotelIds);
            res.json({ status: 'success', data: rooms });
        } catch (e) { next(e); }
    }

    async getRoomsForRestaurant(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const adminId = req.query.adminId as string;
            const safeAdminId = adminId || (req.user as any)?.adminId || (req.user as any)?.userId;

            // Fixed: added adminId support to prevent 500 on multi-hotel fetch
            let targetHotelIds: string | string[] | undefined = hotelId || (req.ownedHotelIds as string[]);

            if (!hotelId && safeAdminId) {
                const hotels = await prisma.hotel.findMany({
                    where: { adminId: safeAdminId },
                    select: { id: true }
                });
                if (hotels.length > 0) {
                    targetHotelIds = hotels.map(h => h.id);
                }
            }

            // Fallback to all owned hotels if no specific hotelId and no adminId override
            if (!hotelId && !safeAdminId && req.ownedHotelIds) {
                targetHotelIds = req.ownedHotelIds as string[];
            }

            const rooms = await restaurantService.getAllRoomsForHotel(targetHotelIds);
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
            const adminId = req.query.adminId as string;
            const invoices = await restaurantService.getInvoices(
                hotelId || (req.ownedHotelIds as string[]), 
                req.query.status as string,
                adminId || (req.user as any)?.adminId
            );
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

    // Tables
    async getTables(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const adminId = req.query.adminId as string;
            const safeAdminId = adminId || (req.user as any)?.adminId || (req.user as any)?.userId;

            let targetHotelIds: string | string[] | undefined = hotelId || (req.ownedHotelIds as string[]);

            if (!hotelId && safeAdminId) {
                const hotels = await prisma.hotel.findMany({
                    where: { adminId: safeAdminId },
                    select: { id: true }
                });
                if (hotels.length > 0) {
                    targetHotelIds = hotels.map(h => h.id);
                }
            }

            const tables = await restaurantService.getTables(targetHotelIds);
            res.json({ status: 'success', data: tables });
        } catch (e) { next(e); }
    }

    async createTable(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'body');
            if (!hotelId) throw new BadRequestError('Hotel context is required');
            const table = await restaurantService.createTable(req.body, hotelId, req.user!.userId);
            res.status(201).json({ status: 'success', data: table });
        } catch (e) { next(e); }
    }


    async updateTable(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'body');
            if (!hotelId) throw new BadRequestError('Hotel context is required');
            const table = await restaurantService.updateTable(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: table });
        } catch (e) { next(e); }
    }


    async deleteTable(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            if (!hotelId) throw new BadRequestError('Hotel context is required');
            await restaurantService.deleteTable(req.params.id, hotelId);
            res.json({ status: 'success', message: 'Table deleted successfully' });
        } catch (e) { next(e); }
    }

    // KOTs (New Section Support)

    async getKOTs(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const adminId = req.query.adminId as string;
            const safeAdminId = adminId || (req.user as any)?.adminId || (req.user as any)?.userId;

            // Fixed: added adminId support to prevent 500 on multi-hotel fetch
            let targetHotelIds: string | string[] | undefined = hotelId || (req.ownedHotelIds as string[]);

            if (!hotelId && safeAdminId) {
                const hotels = await prisma.hotel.findMany({
                    where: { adminId: safeAdminId },
                    select: { id: true }
                });
                if (hotels.length > 0) {
                    targetHotelIds = hotels.map(h => h.id);
                }
            }

            const kots = await restaurantService.getKOTs(targetHotelIds, req.query.status as string);
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

    async getRestaurantDayClosingSummary(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = await this.getAuthorizedHotelId(req, 'query');
            const adminId = req.query.adminId as string;

            // Fixed: added adminId support to prevent 500 on multi-hotel fetch
            let targetHotelIds = hotelId ? [hotelId] : (req.ownedHotelIds || [req.user?.hotelId!].filter(Boolean));

            if (!hotelId && adminId) {
                const hotels = await prisma.hotel.findMany({
                    where: { adminId },
                    select: { id: true }
                });
                targetHotelIds = hotels.map(h => h.id);
            }

            if (targetHotelIds.length === 0) {
                 throw new BadRequestError('Hotel context is required');
            }

            const date = (req.query.date || req.query.dateFrom || req.query.fromDate || req.query.dateTo || req.query.toDate) ? req.query.date as string : undefined;
            
            // If fetching a specific single day summary
            if (req.query.date) {
                const summary = await restaurantDayClosingService.getSummary(targetHotelIds, req.query.date as string);
                res.json({ status: 'success', data: summary });
                return;
            }

            const fromDate = (req.query.dateFrom || req.query.fromDate) as string | undefined;
            const toDate = (req.query.dateTo || req.query.toDate) as string | undefined;

            // Fixed: If no dates are provided for history, return empty array instead of crashing or returning all
            if (!fromDate && !toDate) {
                res.json({ status: 'success', data: [] });
                return;
            }

            const history = await restaurantDayClosingService.getHistory(targetHotelIds, fromDate, toDate);
            res.json({ status: 'success', data: history });
        } catch (e) { 
            console.error('[DayClosing 500 Error]', {
                query: req.query,
                error: e instanceof Error ? e.message : e,
                stack: e instanceof Error ? e.stack : undefined
            });
            next(e); 
        }
    }

    async closeRestaurantDay(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = (await this.getAuthorizedHotelId(req, 'body')) || req.user?.hotelId;
            if (!hotelId) throw new BadRequestError('Hotel context is required');

            const result = await restaurantDayClosingService.closeDay(
                hotelId,
                req.body?.date as string | undefined,
                req.user!.userId,
            );

            res.status(201).json({ status: 'success', data: result, message: `Restaurant Day Closed Successfully for ${(result as any).date}` });
        } catch (e) { next(e); }
    }
}
