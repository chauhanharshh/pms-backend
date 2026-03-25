import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { BadRequestError } from '../utils/errors';
import prisma from '../config/database';

/**
 * Tenant Isolation Middleware
 * Extracts and validates hotelId from either:
 * 1. User's JWT (for hotel_user and hotel_manager)
 * 2. X-Hotel-ID header (for admin switching context)
 * 3. Query parameter hotelId (for admin viewing specific hotel)
 */
export const tenantIsolation = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const run = async () => {
    const user = req.user!;
    const role = String(user.role);
    const requestedHotelId = (req.headers['x-hotel-id'] as string) || (req.query.hotelId as string) || (req.body?.hotelId as string);

    const isHotelsModule = req.baseUrl.endsWith('/hotels');
    const allowNoHotelContext =
      (isHotelsModule && req.method === 'GET' && req.path === '/')
      || (isHotelsModule && req.method === 'POST' && req.path === '/');

    // Super Admin has full visibility and can optionally set hotel context.
    if (role === 'super_admin') {
      if (requestedHotelId) {
        req.hotelId = requestedHotelId;
      }
      return next();
    }

    // Admin users are tenant owners: resolve all owned hotels once per request.
    if (role === 'admin') {
      const ownedHotels = await prisma.hotel.findMany({
        where: {
          OR: [
            { adminId: user.userId },
            // Backward compatibility for existing data created before adminId was introduced.
            { adminId: null, createdBy: user.userId },
          ],
        },
        select: { id: true },
      });

      const ownedHotelIds = ownedHotels.map((h) => h.id);
      req.ownedHotelIds = ownedHotelIds;

      if (isHotelsModule && req.method === 'GET' && req.path === '/') {
        // Always return full owned hotel list for admins on /hotels.
        return next();
      }

      if (requestedHotelId) {
        if (!ownedHotelIds.includes(requestedHotelId)) {
          throw new BadRequestError('Selected hotel is not accessible for this admin');
        }
        req.hotelId = requestedHotelId;
        req.user!.hotelId = requestedHotelId;
        return next();
      }

      if (allowNoHotelContext) {
        // Controllers/services should use req.ownedHotelIds for list/create-hotel flows.
        return next();
      }

      if (ownedHotelIds.length >= 1) {
        // Default to first owned hotel when context is omitted.
        req.hotelId = ownedHotelIds[0];
        req.user!.hotelId = ownedHotelIds[0];
        return next();
      }

      throw new BadRequestError('No hotels assigned to this admin yet');
    }

    // Hotel staff users MUST have a fixed assigned hotel.
    if (!user.hotelId) {
      throw new BadRequestError('Hotel user must be assigned to a hotel');
    }

    // POS Boss Mode check for staff: allow access to other hotels in the group
    const assignedHotel = await prisma.hotel.findUnique({
      where: { id: user.hotelId },
      select: { id: true, posBossMode: true, adminId: true, createdBy: true } as any
    });

    if (assignedHotel && (assignedHotel as any).posBossMode) {
      const adminId = (assignedHotel as any).adminId || (assignedHotel as any).createdBy;
      if (adminId) {
        const ownedHotels = await prisma.hotel.findMany({
          where: {
            OR: [{ adminId }, { adminId: null, createdBy: adminId }],
          },
          select: { id: true },
        });
        const ownedIds = ownedHotels.map((h) => h.id);
        req.ownedHotelIds = ownedIds;

        if (requestedHotelId && ownedIds.includes(requestedHotelId)) {
          req.hotelId = requestedHotelId;
          req.user!.hotelId = requestedHotelId;
          return next();
        }
      }
    }

    req.hotelId = user.hotelId;
    req.user!.hotelId = user.hotelId;
    return next();

  };

  run().catch(next);
};
