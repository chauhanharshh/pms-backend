import { Router } from 'express';
import { BookingsController } from './bookings.controller';
import { authenticate } from '../../middleware/authenticate';
import { tenantIsolation } from '../../middleware/tenantIsolation';

const router = Router();
const bookingsController = new BookingsController();

router.use(authenticate, tenantIsolation);

router.get('/', bookingsController.getBookings.bind(bookingsController));
router.get('/:id', bookingsController.getBookingById.bind(bookingsController));
router.put('/:id', bookingsController.updateBooking.bind(bookingsController));
router.post('/reservation', bookingsController.createReservation.bind(bookingsController));
router.post('/walk-in', bookingsController.walkIn.bind(bookingsController));
router.put('/:id/check-in', bookingsController.checkIn.bind(bookingsController));
router.get('/:id/checkout-preview', bookingsController.getCheckoutPreview.bind(bookingsController));
router.put('/:id/check-out', bookingsController.checkOut.bind(bookingsController));

export default router;
