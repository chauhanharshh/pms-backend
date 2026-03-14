import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { BookingsService } from './bookings.service';
import { ResponseHandler } from '../../utils/response';

const bookingsService = new BookingsService();

export class BookingsController {
  async getBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, startDate, endDate } = req.query;
      const bookings = await bookingsService.getBookingsByHotel(
        req.hotelId!,
        status as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      return ResponseHandler.success(res, bookings);
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const booking = await bookingsService.getBookingById(id, req.hotelId!);
      return ResponseHandler.success(res, booking);
    } catch (error) {
      next(error);
    }
  }

  async updateBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const booking = await bookingsService.updateBooking(id, req.hotelId!, req.user!.userId, req.body);
      return ResponseHandler.success(res, booking, 'Booking updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async createReservation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const booking = await bookingsService.createReservation(
        req.body,
        req.hotelId!,
        req.user!.userId
      );
      return ResponseHandler.created(res, booking, 'Reservation created successfully');
    } catch (error) {
      next(error);
    }
  }

  /** Walk-in: creates booking + bill + advance in one transaction */
  async walkIn(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await bookingsService.walkInCheckIn(
        req.body,
        req.hotelId!,
        req.user!.userId
      );
      return ResponseHandler.created(res, result, 'Walk-in check-in completed successfully');
    } catch (error) {
      next(error);
    }
  }

  async checkIn(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await bookingsService.checkIn(id, req.hotelId!, req.user!.userId);
      return ResponseHandler.success(res, result, 'Check-in completed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCheckoutPreview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await bookingsService.getCheckoutPreview(id, req.hotelId!);
      return ResponseHandler.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async checkOut(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { finalPayment, paymentMode } = req.body;
      const result = await bookingsService.checkOut(
        id,
        req.hotelId!,
        req.user!.userId,
        finalPayment,
        paymentMode
      );
      return ResponseHandler.success(res, result, 'Check-out completed successfully');
    } catch (error) {
      next(error);
    }
  }
}
