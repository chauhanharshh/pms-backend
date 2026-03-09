import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { BadRequestError } from '../utils/errors';

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
  try {
    const user = req.user!;

    // Admin can specify hotelId via header or query
    if (user.role === 'admin') {
      const headerHotelId = req.headers['x-hotel-id'] as string;
      const queryHotelId = req.query.hotelId as string;

      if (headerHotelId) {
        req.hotelId = headerHotelId;
      } else if (queryHotelId) {
        req.hotelId = queryHotelId;
      }
      // Admin without hotelId can see all hotels (no req.hotelId set)
    } else {
      // Hotel users MUST have hotelId in their JWT
      if (!user.hotelId) {
        throw new BadRequestError('Hotel user must be assigned to a hotel');
      }
      req.hotelId = user.hotelId;
    }

    next();
  } catch (error) {
    next(error);
  }
};
