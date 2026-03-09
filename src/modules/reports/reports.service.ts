import prisma from '../../config/database';
import { Decimal } from '@prisma/client/runtime/library';

export class ReportsService {
  async getOccupancyReport(hotelId: string, startDate: Date, endDate: Date) {
    const totalRooms = await prisma.room.count({
      where: { hotelId },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        status: {
          in: ['checked_in', 'checked_out'],
        },
        OR: [
          {
            checkInDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            checkOutDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      include: {
        room: true,
      },
    });

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalRoomNights = totalRooms * days;
    const occupiedRoomNights = bookings.reduce((sum, booking) => {
      const checkIn = new Date(Math.max(booking.checkInDate.getTime(), startDate.getTime()));
      const checkOut = new Date(Math.min(booking.checkOutDate.getTime(), endDate.getTime()));
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return sum + nights;
    }, 0);

    const occupancyRate = (occupiedRoomNights / totalRoomNights) * 100;

    return {
      totalRooms,
      totalRoomNights,
      occupiedRoomNights,
      occupancyRate: occupancyRate.toFixed(2),
      period: {
        startDate,
        endDate,
      },
    };
  }

  async getRevenueReport(hotelId: string, startDate: Date, endDate: Date) {
    const bills = await prisma.bill.findMany({
      where: {
        hotelId,
        status: 'finalized',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalRevenue = new Decimal(0);
    let roomRevenue = new Decimal(0);
    let restaurantRevenue = new Decimal(0);
    let miscRevenue = new Decimal(0);
    let totalTax = new Decimal(0);

    for (const bill of bills) {
      totalRevenue = totalRevenue.add(bill.totalAmount);
      roomRevenue = roomRevenue.add(bill.roomCharges);
      restaurantRevenue = restaurantRevenue.add(bill.restaurantCharges);
      miscRevenue = miscRevenue.add(bill.miscCharges);
      totalTax = totalTax.add(bill.taxAmount);
    }

    return {
      totalRevenue: totalRevenue.toFixed(2),
      roomRevenue: roomRevenue.toFixed(2),
      restaurantRevenue: restaurantRevenue.toFixed(2),
      miscRevenue: miscRevenue.toFixed(2),
      totalTax: totalTax.toFixed(2),
      numberOfBills: bills.length,
      period: {
        startDate,
        endDate,
      },
    };
  }

  async getExpenseReport(hotelId: string, startDate: Date, endDate: Date) {
    const expenses = await prisma.expense.findMany({
      where: {
        hotelId,
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
        isDeleted: false,
      },
    });

    let totalExpenses = new Decimal(0);
    const categoryBreakdown: Record<string, string> = {};

    for (const expense of expenses) {
      totalExpenses = totalExpenses.add(expense.amount);
      
      if (!categoryBreakdown[expense.category]) {
        categoryBreakdown[expense.category] = '0';
      }
      
      const currentAmount = new Decimal(categoryBreakdown[expense.category]);
      categoryBreakdown[expense.category] = currentAmount.add(expense.amount).toFixed(2);
    }

    return {
      totalExpenses: totalExpenses.toFixed(2),
      categoryBreakdown,
      numberOfExpenses: expenses.length,
      period: {
        startDate,
        endDate,
      },
    };
  }

  async getConsolidatedReport(startDate?: Date, endDate?: Date) {
    // Admin consolidated report across all hotels
    const hotels = await prisma.hotel.findMany({
      where: { isActive: true },
    });

    const hotelReports = await Promise.all(
      hotels.map(async (hotel) => {
        const start = startDate || new Date(new Date().setDate(1));
        const end = endDate || new Date();

        const [occupancy, revenue, expenses] = await Promise.all([
          this.getOccupancyReport(hotel.id, start, end),
          this.getRevenueReport(hotel.id, start, end),
          this.getExpenseReport(hotel.id, start, end),
        ]);

        return {
          hotelId: hotel.id,
          hotelName: hotel.name,
          city: hotel.city,
          occupancy,
          revenue,
          expenses,
        };
      })
    );

    return hotelReports;
  }
}
