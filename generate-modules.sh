#!/bin/bash

# Script to generate remaining PMS backend modules
# This creates controllers, services, routes, and validation files

echo "Generating PMS Backend Modules..."

# Create rooms controller and routes
mkdir -p src/modules/rooms

cat > src/modules/rooms/rooms.controller.ts << 'EOF'
import { Response } from 'express';
import { AuthRequest } from '../../utils/types';
import { roomsService } from './rooms.service';
import { sendSuccess } from '../../utils/api-response';
import { CreateRoomInput, UpdateRoomInput, UpdateRoomStatusInput } from './rooms.validation';

export class RoomsController {
  async getAllRooms(req: AuthRequest, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const { status } = req.query;
    const rooms = await roomsService.getAllRooms(hotelId, status as string);
    sendSuccess(res, rooms);
  }

  async getRoomById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const hotelId = req.hotelId!;
    const room = await roomsService.getRoomById(id, hotelId);
    sendSuccess(res, room);
  }

  async createRoom(req: AuthRequest, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const data: CreateRoomInput = req.body;
    const createdBy = req.user!.userId;
    const room = await roomsService.createRoom(hotelId, data, createdBy);
    sendSuccess(res, room, 'Room created successfully', 201);
  }

  async updateRoom(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const hotelId = req.hotelId!;
    const data: UpdateRoomInput = req.body;
    const updatedBy = req.user!.userId;
    const room = await roomsService.updateRoom(id, hotelId, data, updatedBy);
    sendSuccess(res, room, 'Room updated successfully');
  }

  async updateRoomStatus(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const hotelId = req.hotelId!;
    const data: UpdateRoomStatusInput = req.body;
    const updatedBy = req.user!.userId;
    const room = await roomsService.updateRoomStatus(id, hotelId, data, updatedBy);
    sendSuccess(res, room, 'Room status updated successfully');
  }

  async checkAvailability(req: AuthRequest, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const { checkInDate, checkOutDate } = req.query;
    const result = await roomsService.checkAvailability(
      hotelId,
      new Date(checkInDate as string),
      new Date(checkOutDate as string)
    );
    sendSuccess(res, result);
  }

  async deleteRoom(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const hotelId = req.hotelId!;
    const result = await roomsService.deleteRoom(id, hotelId);
    sendSuccess(res, result);
  }
}

export const roomsController = new RoomsController();
EOF

cat > src/modules/rooms/rooms.routes.ts << 'EOF'
import { Router } from 'express';
import { roomsController } from './rooms.controller';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantIsolation, requireHotelContext } from '../../middleware/tenant.middleware';
import { hotelUser, managerOrAdmin } from '../../middleware/role.middleware';
import {
  createRoomSchema,
  updateRoomSchema,
  updateRoomStatusSchema,
  roomIdSchema,
  roomAvailabilitySchema,
} from './rooms.validation';

const router = Router();

router.use(authenticate, tenantIsolation, requireHotelContext);

router.get(
  '/',
  hotelUser,
  asyncHandler(roomsController.getAllRooms.bind(roomsController))
);

router.get(
  '/availability',
  validate(roomAvailabilitySchema),
  hotelUser,
  asyncHandler(roomsController.checkAvailability.bind(roomsController))
);

router.get(
  '/:id',
  validate(roomIdSchema),
  hotelUser,
  asyncHandler(roomsController.getRoomById.bind(roomsController))
);

router.post(
  '/',
  managerOrAdmin,
  validate(createRoomSchema),
  asyncHandler(roomsController.createRoom.bind(roomsController))
);

router.put(
  '/:id',
  managerOrAdmin,
  validate(updateRoomSchema),
  asyncHandler(roomsController.updateRoom.bind(roomsController))
);

router.put(
  '/:id/status',
  hotelUser,
  validate(updateRoomStatusSchema),
  asyncHandler(roomsController.updateRoomStatus.bind(roomsController))
);

router.delete(
  '/:id',
  managerOrAdmin,
  validate(roomIdSchema),
  asyncHandler(roomsController.deleteRoom.bind(roomsController))
);

export default router;
EOF

echo "✓ Rooms module created"

# Create bookings module files
mkdir -p src/modules/bookings

cat > src/modules/bookings/bookings.validation.ts << 'EOF'
import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    roomId: z.string().uuid('Invalid room ID'),
    guestName: z.string().min(2, 'Guest name required'),
    guestPhone: z.string().min(10, 'Valid phone number required'),
    guestEmail: z.string().email().optional(),
    idProof: z.string().optional(),
    addressLine: z.string().optional(),
    checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
    totalAmount: z.number().min(0),
    advanceAmount: z.number().min(0).default(0),
    source: z.enum(['walk_in', 'online', 'phone', 'reservation']).default('walk_in'),
    notes: z.string().optional(),
  }),
});

export const checkInSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    advancePaymentIds: z.array(z.string().uuid()).optional(),
  }),
});

export const checkOutSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    paymentMethod: z.enum(['cash', 'bank', 'card', 'upi']),
    discount: z.number().min(0).default(0),
  }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>['body'];
export type CheckInInput = z.infer<typeof checkInSchema>['body'];
export type CheckOutInput = z.infer<typeof checkOutSchema>['body'];
EOF

echo "✓ Bookings validation created"
echo ""
echo "Modules generation complete!"
