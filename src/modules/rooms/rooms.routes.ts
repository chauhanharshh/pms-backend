import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { tenantIsolation } from '../../middleware/tenantIsolation';
import { RoomsService } from './rooms.service';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';

const router = Router();
const roomsService = new RoomsService();

router.use(authenticate, tenantIsolation);

// Get all rooms by hotel
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
        const rooms = await roomsService.getRoomsByHotel(hotelId);
        res.json({ status: 'success', data: rooms });
    } catch (e) { next(e); }
});

// Create room
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.body.hotelId && req.hotelId) {
            req.body.hotelId = req.hotelId;
        }
        const room = await roomsService.createRoom(req.body, req.user!.userId);
        res.status(201).json({ status: 'success', data: room });
    } catch (e) { next(e); }
});

// Get room availability
router.get('/available', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
        const { checkInDate, checkOutDate } = req.query;
        const rooms = await roomsService.getAvailableRooms(hotelId, new Date(checkInDate as string), new Date(checkOutDate as string));
        res.json({ status: 'success', data: rooms });
    } catch (e) { next(e); }
});

// Get room by ID
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const hotelId = req.hotelId || req.user?.hotelId;
        const room = await roomsService.getRoomById(req.params.id, hotelId);
        res.json({ status: 'success', data: room });
    } catch (e) { next(e); }
});

// Update room status
router.patch('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
        const room = await roomsService.updateRoomStatus(
            req.params.id, req.body.status, hotelId, req.user!.userId, req.body.maintenanceNote
        );
        res.json({ status: 'success', data: room });
    } catch (e) { next(e); }
});

// Update room basic properties
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
        const room = await roomsService.updateRoom(req.params.id, hotelId, req.body, req.user!.userId);
        res.json({ status: 'success', data: room });
    } catch (e) { next(e); }
});

// Delete room
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const hotelId = req.hotelId || req.user?.hotelId || (req.query.hotelId as string);
        await roomsService.deleteRoom(req.params.id, hotelId);
        res.json({ status: 'success', message: 'Room deleted successfully' });
    } catch (e) { next(e); }
});

export default router;
