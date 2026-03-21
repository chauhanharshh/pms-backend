import prisma from '../../config/database';
import { MENU_DATA } from '../../constants/menuData';
import { CreateHotelInput, UpdateHotelInput } from './hotels.validation';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import logger from '../../utils/logger';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

export class HotelsService {
  async getBranding(hotelId: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        brandName: true,
        logoUrl: true,
      },
    });

    if (!hotel) throw new NotFoundError('Hotel not found');
    return hotel;
  }

  async updateBranding(hotelId: string, data: { brandName?: string | null }, userId: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId }, select: { id: true } });
    if (!hotel) throw new NotFoundError('Hotel not found');

    return prisma.hotel.update({
      where: { id: hotelId },
      data: {
        brandName: data.brandName ?? null,
        updatedBy: userId,
      },
      select: {
        id: true,
        name: true,
        brandName: true,
        logoUrl: true,
      },
    });
  }

  async updateBrandingLogo(hotelId: string, logoUrl: string, userId: string) {
    const current = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, logoUrl: true },
    });
    if (!current) throw new NotFoundError('Hotel not found');

    // Cleanup previous local logo file if it exists.
    if (current.logoUrl && current.logoUrl.startsWith('/uploads/logos/')) {
      const oldPath = path.join(process.cwd(), current.logoUrl.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          // Best-effort cleanup; ignore deletion failures.
        }
      }
    }

    return prisma.hotel.update({
      where: { id: hotelId },
      data: {
        logoUrl,
        updatedBy: userId,
      },
      select: {
        id: true,
        name: true,
        brandName: true,
        logoUrl: true,
      },
    });
  }

  async updateBrandingLogoForAdmin(adminUserId: string, logoUrl: string, requestedHotelId?: string) {
    const ownedHotels = await prisma.hotel.findMany({
      where: {
        OR: [
          { adminId: adminUserId },
          { adminId: null, createdBy: adminUserId },
        ],
      },
      select: { id: true },
    });

    if (ownedHotels.length === 0) {
      throw new NotFoundError('No hotels found for this admin');
    }

    const ownedHotelIds = ownedHotels.map((hotel) => hotel.id);
    if (requestedHotelId && !ownedHotelIds.includes(requestedHotelId)) {
      throw new ForbiddenError('Selected hotel is not accessible for this admin');
    }

    await prisma.hotel.updateMany({
      where: { id: { in: ownedHotelIds } },
      data: {
        logoUrl,
        updatedBy: adminUserId,
      },
    });

    const representativeHotelId = requestedHotelId || ownedHotelIds[0];
    const representative = await prisma.hotel.findUnique({
      where: { id: representativeHotelId },
      select: {
        id: true,
        name: true,
        brandName: true,
        logoUrl: true,
      },
    });

    if (!representative) {
      throw new NotFoundError('Hotel not found');
    }

    return {
      ...representative,
      propagatedToHotelCount: ownedHotelIds.length,
    };
  }

  async getAllHotels(userId: string, role: string, hotelId?: string, ownedHotelIds?: string[]) {
    try {
      if (role === 'super_admin') {
        return prisma.hotel.findMany({
          where: hotelId ? { id: hotelId } : {},
          orderBy: { name: 'asc' },
        });
      }

      if (role === 'admin') {
        const where: any = {};
        if (hotelId) {
          where.id = hotelId;
        } else if (ownedHotelIds && ownedHotelIds.length > 0) {
          where.id = { in: ownedHotelIds };
        } else {
          where.OR = [
            { adminId: userId },
            { adminId: null, createdBy: userId },
          ];
        }

        return prisma.hotel.findMany({
          where,
          orderBy: { name: 'asc' },
        });
      }

      if (!hotelId) {
        throw new ForbiddenError('Hotel user must have assigned hotel');
      }

      const assignedHotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
      });

      if (!assignedHotel) return [];

      // If POS Boss Mode is enabled for this hotel, allow seeing all hotels
      if ((assignedHotel as any).posBossMode) {
        const assignedAdminId = (assignedHotel as any).adminId;
        const assignedCreatedBy = (assignedHotel as any).createdBy;

        if (!assignedAdminId && !assignedCreatedBy) {
          return [assignedHotel];
        }

        return prisma.hotel.findMany({
          where: {
            OR: [
              ...(assignedAdminId ? [{ adminId: assignedAdminId }] : []),
              ...(assignedCreatedBy ? [{ adminId: null, createdBy: assignedCreatedBy }] : []),
            ],
          },
          orderBy: { name: 'asc' },
        });
      }

      return [assignedHotel];
    } catch (error) {
      if (error instanceof ForbiddenError) throw error;
      if (typeof logger !== 'undefined' && logger.error) {
        logger.error('Error fetching hotels:', error);
      } else {
        console.error('Error fetching hotels (no logger):', error);
      }
      return []; // Return empty array on failure to prevent crash
    }
  }

  async getHotelById(hotelId: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundError('Hotel not found');
    }

    return hotel;
  }

  /**
   * Creates a hotel. If hotelUsername + hotelPassword provided, also creates
   * a hotel_manager user linked to the new hotel in the same transaction.
   * Auto-creates a default Room Type, generic Restaurant Categories, and Room structure if specified.
   */
  async createHotel(input: CreateHotelInput & {
    hotelUsername?: string;
    hotelPassword?: string;
  }, userId: string, role?: string) {
    const { hotelUsername, hotelPassword, ...hotelData } = input as any;

    return prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.create({
        data: {
          ...hotelData,
          adminId: role === 'admin' ? userId : (hotelData as any).adminId || null,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // 1. Optionally create hotel manager user
      if (hotelUsername && hotelPassword) {
        const passwordHash = await bcrypt.hash(hotelPassword, 10);
        await tx.user.create({
          data: {
            username: hotelUsername,
            passwordHash,
            fullName: `${hotel.name} Manager`,
            role: 'hotel_manager',
            hotelId: hotel.id,
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        logger.info(`Created hotel manager user "${hotelUsername}" for hotel ${hotel.id}`);
      }


      // 2. Auto-create full Restaurant Menu
      for (let i = 0; i < MENU_DATA.length; i++) {
        const catData = MENU_DATA[i];
        const category = await tx.restaurantCategory.create({
          data: {
            hotelId: hotel.id,
            name: catData.category,
            sortOrder: i,
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
          }
        });

        for (const item of catData.items) {
          let isVeg = true;
          const nameLower = item.name.toLowerCase();
          if (nameLower.includes('chicken') || nameLower.includes('mutton') || nameLower.includes('fish') || nameLower.includes('egg') || nameLower.includes('omlette')) {
            isVeg = false;
          }

          await tx.restaurantMenu.create({
            data: {
              hotelId: hotel.id,
              categoryId: category.id,
              itemName: item.name,
              price: item.price,
              taxRate: 5,
              isAvailable: true,
              isVeg: isVeg,
              createdBy: userId,
              updatedBy: userId,
            }
          });
        }
      }

      // 3. Auto-create rooms
      const totalRooms = hotelData.totalRooms || 0;
      const floors = hotelData.floors || 2;

      if (totalRooms > 0) {
        // Create a default Room Type
        const roomType = await tx.roomType.create({
          data: {
            hotelId: hotel.id,
            name: "Standard",
            basePrice: 1000,
            maxOccupancy: 2,
            createdBy: userId,
            updatedBy: userId,
          }
        });

        const roomsPerFloor = Math.ceil(totalRooms / floors);
        let createdRooms = 0;

        for (let f = 1; f <= floors; f++) {
          for (let r = 1; r <= roomsPerFloor; r++) {
            if (createdRooms >= totalRooms) break;

            const roomNumberStr = `${f}${r.toString().padStart(2, '0')}`;
            await tx.room.create({
              data: {
                hotelId: hotel.id,
                roomNumber: roomNumberStr,
                floor: f,
                typeId: roomType.id,
                status: 'vacant',
                basePrice: roomType.basePrice,
                maxOccupancy: roomType.maxOccupancy,
                createdBy: userId,
                updatedBy: userId,
              }
            });
            createdRooms++;
          }
        }
        logger.info(`Auto-created ${createdRooms} rooms for hotel ${hotel.id}`);
      }

      return hotel;
    });
  }

  async updateHotel(hotelId: string, input: UpdateHotelInput, userId: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundError('Hotel not found');
    }

    return prisma.hotel.update({
      where: { id: hotelId },
      data: {
        ...input,
        updatedBy: userId,
      },
    });
  }

  /**
   * Reset / set credentials for the hotel_manager user linked to this hotel.
   */
  async setHotelCredentials(hotelId: string, username: string, password: string, adminUserId: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundError('Hotel not found');

    const passwordHash = await bcrypt.hash(password, 10);

    // Check if a manager user already exists for this hotel
    const existingUser = await prisma.user.findFirst({
      where: { hotelId, role: { in: ['hotel_manager', 'hotel_user'] } },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { username, passwordHash, updatedBy: adminUserId },
      });
      logger.info(`Updated credentials for hotel ${hotelId} user ${existingUser.id}`);
      return { action: 'updated', username };
    } else {
      await prisma.user.create({
        data: {
          username,
          passwordHash,
          fullName: `${hotel.name} Manager`,
          role: 'hotel_manager',
          hotelId,
          isActive: true,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      logger.info(`Created new hotel manager user "${username}" for hotel ${hotelId}`);
      return { action: 'created', username };
    }
  }

  async cloneHotel(sourceHotelId: string, payload: { targetHotelId: string, options?: any }, userId: string) {
    const { targetHotelId, options = {} } = payload;
    logger.info(`Starting hotel clone: ${sourceHotelId} -> target: ${targetHotelId} with options ${JSON.stringify(options)}`);

    const sourceHotel = await prisma.hotel.findUnique({
      where: { id: sourceHotelId },
      include: {
        roomTypes: true,
        rooms: true,
        restaurantCategories: true,
        restaurantMenu: true,
      },
    });

    const targetHotel = await prisma.hotel.findUnique({
      where: { id: targetHotelId },
    });

    if (!sourceHotel || !targetHotel) {
      throw new NotFoundError('Source or target hotel not found');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Tax & Time Settings
      if (options.taxSettings) {
        await tx.hotel.update({
          where: { id: targetHotelId },
          data: {
            checkInTime: sourceHotel.checkInTime,
            checkOutTime: sourceHotel.checkOutTime,
            taxRate: sourceHotel.taxRate,
            currency: sourceHotel.currency,
            updatedBy: userId,
          }
        });
      }

      // 2. Room Types & Pricing
      const roomTypeMapping = new Map<string, string>();
      if (options.roomTypesPricing) {
        const existingTypes = await tx.roomType.findMany({ where: { hotelId: targetHotelId } });
        const existingTypeNames = new Set(existingTypes.map(t => t.name));

        for (const roomType of sourceHotel.roomTypes) {
          if (!existingTypeNames.has(roomType.name)) {
            const newRoomType = await tx.roomType.create({
              data: {
                hotelId: targetHotelId,
                name: roomType.name,
                description: roomType.description,
                basePrice: roomType.basePrice,
                maxOccupancy: roomType.maxOccupancy,
                amenities: roomType.amenities,
                createdBy: userId,
                updatedBy: userId,
              },
            });
            roomTypeMapping.set(roomType.id, newRoomType.id);
          } else {
            const existing = existingTypes.find(t => t.name === roomType.name);
            if (existing) roomTypeMapping.set(roomType.id, existing.id);
          }
        }
      }

      // 3. Room Structure
      if (options.roomStructure) {
        const existingRooms = await tx.room.findMany({ where: { hotelId: targetHotelId } });
        const existingRoomNumbers = new Set(existingRooms.map(r => r.roomNumber));

        for (const room of sourceHotel.rooms) {
          if (!existingRoomNumbers.has(room.roomNumber)) {
            let targetTypeId = roomTypeMapping.get(room.typeId);

            if (!targetTypeId) {
              const sourceCat = sourceHotel.roomTypes.find(c => c.id === room.typeId);
              if (sourceCat) {
                const targetCat = await tx.roomType.findFirst({ where: { hotelId: targetHotelId, name: sourceCat.name } });
                if (targetCat) targetTypeId = targetCat.id;
              }
            }

            if (targetTypeId) {
              await tx.room.create({
                data: {
                  hotelId: targetHotelId,
                  roomNumber: room.roomNumber,
                  floor: room.floor,
                  typeId: targetTypeId,
                  status: 'vacant',
                  basePrice: room.basePrice,
                  maxOccupancy: room.maxOccupancy,
                  createdBy: userId,
                  updatedBy: userId,
                },
              });
            }
          }
        }
      }

      // 4. Restaurant Categories
      const categoryMapping = new Map<string, string>();
      if (options.restaurantCategories) {
        const existingCats = await tx.restaurantCategory.findMany({ where: { hotelId: targetHotelId } });
        const existingCatNames = new Set(existingCats.map(c => c.name));

        for (const category of sourceHotel.restaurantCategories) {
          if (!existingCatNames.has(category.name)) {
            const newCategory = await tx.restaurantCategory.create({
              data: {
                hotelId: targetHotelId,
                name: category.name,
                description: category.description,
                sortOrder: category.sortOrder,
                isActive: category.isActive,
                createdBy: userId,
                updatedBy: userId,
              },
            });
            categoryMapping.set(category.id, newCategory.id);
          } else {
            const existing = existingCats.find(c => c.name === category.name);
            if (existing) categoryMapping.set(category.id, existing.id);
          }
        }
      }

      // 5. Restaurant Menu
      if (options.restaurantMenu) {
        const existingMenu = await tx.restaurantMenu.findMany({ where: { hotelId: targetHotelId } });
        const existingMenuNames = new Set(existingMenu.map(m => m.itemName));

        for (const menuItem of sourceHotel.restaurantMenu) {
          let targetCategoryId = categoryMapping.get(menuItem.categoryId);

          if (!targetCategoryId) {
            const sourceCat = sourceHotel.restaurantCategories.find(c => c.id === menuItem.categoryId);
            if (sourceCat) {
              const targetCat = await tx.restaurantCategory.findFirst({ where: { hotelId: targetHotelId, name: sourceCat.name } });
              if (targetCat) targetCategoryId = targetCat.id;
            }
          }

          if (targetCategoryId && !existingMenuNames.has(menuItem.itemName)) {
            await tx.restaurantMenu.create({
              data: {
                hotelId: targetHotelId,
                categoryId: targetCategoryId,
                itemName: menuItem.itemName,
                description: menuItem.description,
                price: menuItem.price,
                taxRate: menuItem.taxRate,
                isAvailable: menuItem.isAvailable,
                isVeg: menuItem.isVeg,
                preparationTime: menuItem.preparationTime,
                createdBy: userId,
                updatedBy: userId,
              },
            });
          }
        }
      }

      logger.info(`Hotel cloned successfully: ${targetHotelId}`);
      return targetHotel;
    });
  }

  async deleteHotel(hotelId: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundError('Hotel not found');
    }

    // This will cascade delete related data due to Prisma schema onDelete: Cascade
    return prisma.hotel.delete({
      where: { id: hotelId },
    });
  }

  async getDashboardStats(hotelId?: string) {
    const safeCount = async (query: Promise<number>): Promise<number> => {
      try {
        return await query;
      } catch (error) {
        logger.error('Dashboard count query failed', error);
        return 0;
      }
    };

    try {
      if (hotelId) {
        const [totalRooms, occupiedRooms, vacantRooms] = await Promise.all([
          safeCount(prisma.room.count({ where: { hotelId } })),
          safeCount(prisma.room.count({ where: { hotelId, status: 'occupied' } })),
          safeCount(prisma.room.count({ where: { hotelId, status: 'vacant' } })),
        ]);

        return {
          totalHotels: 1,
          totalRooms,
          occupiedRooms,
          vacantRooms,
          occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
        };
      }

      const [totalHotels, totalRooms, occupiedRooms, vacantRooms] = await Promise.all([
        safeCount(prisma.hotel.count({ where: { isActive: true } })),
        safeCount(prisma.room.count()),
        safeCount(prisma.room.count({ where: { status: 'occupied' } })),
        safeCount(prisma.room.count({ where: { status: 'vacant' } })),
      ]);

      return {
        totalHotels,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      };
    } catch (error) {
      logger.error('Dashboard API error in getDashboardStats', error);
      return {
        totalHotels: hotelId ? 1 : 0,
        totalRooms: 0,
        occupiedRooms: 0,
        vacantRooms: 0,
        occupancyRate: 0,
      };
    }
  }
}
