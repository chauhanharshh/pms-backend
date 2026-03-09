import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { RoomStatus } from '@prisma/client';

export class RoomsService {
  async getRoomsByHotel(hotelId: string) {
    return prisma.room.findMany({
      where: { hotelId },
      include: {
        roomType: true,
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async getRoomById(roomId: string, hotelId?: string) {
    const where: any = { id: roomId };
    if (hotelId) {
      where.hotelId = hotelId;
    }

    const room = await prisma.room.findFirst({
      where,
      include: {
        roomType: true,
        hotel: true,
      },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    return room;
  }

  async createRoom(data: any, userId: string) {
    const hotelId = data.hotelId;
    const typeName = data.type || 'Standard';

    let roomType = await prisma.roomType.findFirst({
      where: { hotelId, name: typeName }
    });

    if (!roomType) {
      roomType = await prisma.roomType.create({
        data: {
          hotelId,
          name: typeName,
          basePrice: data.basePrice || 0,
          maxOccupancy: data.maxOccupancy || 2,
          createdBy: userId,
          updatedBy: userId,
        }
      });
    }

    const { type, description, amenities, ...roomData } = data;
    const taxRate = data.taxRate || roomType.taxRate || 12.00;

    return prisma.room.create({
      data: {
        ...roomData,
        basePrice: data.basePrice || roomType.basePrice,
        taxRate: taxRate,
        maxOccupancy: data.maxOccupancy || roomType.maxOccupancy,
        typeId: roomType.id,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        roomType: true,
      },
    });
  }

  async updateRoom(roomId: string, hotelId: string, data: any, userId: string) {
    // Ensure room exists and belongs to hotel
    await this.getRoomById(roomId, hotelId);

    // Filter out fields that shouldn't be updated directly via basic PUT
    const { id, hotelId: hid, createdBy, updatedBy, createdAt, updatedAt, type, description, amenities, roomType, typeId, ...updateData } = data;

    if (data.taxRate !== undefined) {
      updateData.taxRate = data.taxRate;
    }

    return prisma.room.update({
      where: { id: roomId },
      data: {
        ...updateData,
        updatedBy: userId,
      },
      include: {
        roomType: true,
      }
    });
  }

  async deleteRoom(roomId: string, hotelId: string) {
    await this.getRoomById(roomId, hotelId);

    const activeBookings = await prisma.booking.count({
      where: {
        roomId,
        status: { in: ['pending', 'confirmed', 'checked_in'] },
        isDeleted: false
      }
    });

    if (activeBookings > 0) {
      throw new BadRequestError('Cannot delete room with active bookings.');
    }

    return prisma.room.delete({
      where: { id: roomId }
    });
  }

  async updateRoomStatus(
    roomId: string,
    status: RoomStatus,
    hotelId: string,
    userId: string,
    maintenanceNote?: string
  ) {
    const room = await this.getRoomById(roomId, hotelId);

    // Business logic validation
    if (room.status === 'occupied' && status === 'vacant') {
      throw new BadRequestError('Cannot mark occupied room as vacant. Use checkout process.');
    }

    return prisma.room.update({
      where: { id: roomId },
      data: {
        status,
        maintenanceNote: status === 'maintenance' ? maintenanceNote : null,
        updatedBy: userId,
      },
    });
  }

  async checkRoomAvailability(
    hotelId: string,
    roomId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<boolean> {
    // Check if room exists and is in correct hotel
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        hotelId,
      },
    });

    if (!room) {
      return false;
    }

    // Check for overlapping bookings
    const overlappingBookings = await prisma.booking.count({
      where: {
        roomId,
        status: {
          in: ['pending', 'confirmed', 'checked_in'],
        },
        OR: [
          {
            // Booking starts during the requested period
            checkInDate: {
              gte: checkInDate,
              lt: checkOutDate,
            },
          },
          {
            // Booking ends during the requested period
            checkOutDate: {
              gt: checkInDate,
              lte: checkOutDate,
            },
          },
          {
            // Booking spans the entire requested period
            checkInDate: {
              lte: checkInDate,
            },
            checkOutDate: {
              gte: checkOutDate,
            },
          },
        ],
      },
    });

    return overlappingBookings === 0;
  }

  async getAvailableRooms(
    hotelId: string,
    checkInDate: Date,
    checkOutDate: Date
  ) {
    const allRooms = await prisma.room.findMany({
      where: {
        hotelId,
        status: {
          not: 'maintenance',
        },
      },
      include: {
        roomType: true,
      },
    });

    // Filter rooms by availability
    const availableRooms = [];
    for (const room of allRooms) {
      const isAvailable = await this.checkRoomAvailability(
        hotelId,
        room.id,
        checkInDate,
        checkOutDate
      );
      if (isAvailable) {
        availableRooms.push(room);
      }
    }

    return availableRooms;
  }
}
