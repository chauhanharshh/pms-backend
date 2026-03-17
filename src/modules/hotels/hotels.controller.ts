import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { HotelsService } from './hotels.service';
import { ResponseHandler } from '../../utils/response';
import { createHotelSchema, updateHotelSchema } from './hotels.validation';
import { z } from 'zod';
import logger from '../../utils/logger';
import { BadRequestError } from '../../utils/errors';

const hotelsService = new HotelsService();

export class HotelsController {
  private resolveBrandingHotelId(req: AuthRequest): string {
    const user = req.user!;
    const role = String(user.role);
    const requested = (req.params.id || req.query.hotelId || req.body.hotelId) as string | undefined;

    if (role === 'super_admin') {
      const selected = requested || req.hotelId;
      if (!selected) throw new BadRequestError('hotelId is required for Super Admin branding actions');
      return selected;
    }

    if (role === 'admin') {
      if (user.hotelId) return user.hotelId;
      const selected = requested || req.hotelId;
      if (!selected) throw new BadRequestError('hotelId is required for unscoped admin branding actions');
      return selected;
    }

    if (!user.hotelId) {
      throw new BadRequestError('User is not assigned to any hotel');
    }

    return user.hotelId;
  }

  async getAllHotels(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId, role } = req.user!;
      const normalizedRole = String(role);
      const listHotelContext = req.hotelId;
      const hotels = await hotelsService.getAllHotels(userId, normalizedRole, listHotelContext, req.ownedHotelIds);
      return ResponseHandler.success(res, hotels);
    } catch (error) {
      next(error);
    }
  }

  async getHotelById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const hotel = await hotelsService.getHotelById(id);
      return ResponseHandler.success(res, hotel);
    } catch (error) {
      next(error);
    }
  }

  async createHotel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { hotelUsername, hotelPassword, ...rest } = req.body;
      const input = createHotelSchema.parse(rest);
      const hotel = await hotelsService.createHotel(
        { ...input, hotelUsername, hotelPassword } as any,
        req.user!.userId,
        String(req.user!.role)
      );
      return ResponseHandler.created(res, hotel, 'Hotel created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateHotel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info(`Received update request for hotel ${id}`, { body: req.body });
      const input = updateHotelSchema.parse(req.body);
      logger.info(`Parsed input for hotel ${id}`, { input });
      const hotel = await hotelsService.updateHotel(id, input, req.user!.userId);
      return ResponseHandler.success(res, hotel, 'Hotel updated successfully');
    } catch (error) {
      logger.error(`Error updating hotel ${req.params.id}`, error);
      next(error);
    }
  }

  async deleteHotel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await hotelsService.deleteHotel(id);
      return ResponseHandler.success(res, null, 'Hotel deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async setCredentials(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { username, password } = z.object({
        username: z.string().min(3),
        password: z.string().min(6),
      }).parse(req.body);
      const result = await hotelsService.setHotelCredentials(id, username, password, req.user!.userId);
      return ResponseHandler.success(res, result, 'Hotel credentials updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async cloneHotel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { targetHotelId, options } = z.object({
        targetHotelId: z.string().uuid(),
        options: z.any().optional()
      }).parse(req.body);
      const hotel = await hotelsService.cloneHotel(id, { targetHotelId, options }, req.user!.userId);
      return ResponseHandler.created(res, hotel, 'Hotel cloned successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = req.params.id || req.hotelId;
      const stats = await hotelsService.getDashboardStats(hotelId);
      return ResponseHandler.success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getBranding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = this.resolveBrandingHotelId(req);
      const branding = await hotelsService.getBranding(hotelId);
      return ResponseHandler.success(res, branding);
    } catch (error) {
      next(error);
    }
  }

  async updateBranding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = this.resolveBrandingHotelId(req);
      const payload = z.object({
        brandName: z.string().max(255).optional().nullable(),
      }).parse(req.body);
      const branding = await hotelsService.updateBranding(hotelId, payload, req.user!.userId);
      return ResponseHandler.success(res, branding, 'Branding updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async uploadBrandingLogo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new BadRequestError('Logo file is required');
      }

      const logoUrl = `/uploads/logos/${req.file.filename}`;
      const user = req.user!;
      const requested = (req.params.id || req.query.hotelId || req.body.hotelId) as string | undefined;

      const branding = String(user.role) === 'admin'
        ? await hotelsService.updateBrandingLogoForAdmin(user.userId, logoUrl, requested)
        : await hotelsService.updateBrandingLogo(this.resolveBrandingHotelId(req), logoUrl, user.userId);

      return ResponseHandler.success(res, branding, 'Logo uploaded successfully');
    } catch (error) {
      next(error);
    }
  }
}
