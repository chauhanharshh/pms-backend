import prisma from '../../config/database';
import { randomUUID } from 'crypto';
import { BadRequestError, ConflictError } from '../../utils/errors';

interface RestaurantDaySummary {
  date: string;
  hotelId: string;
  hotelName: string;
  totalKotsToday: number;
  openKots: number;
  convertedKots: number;
  cancelledKots: number;
  totalOrdersAmount: number;
  serviceChargeAmount: number;
  totalRevenueToday: number;
  totalInvoicesToday: number;
  dayClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
}

type DayClosingRow = {
  id: string;
  hotelId: string;
  hotel_name?: string;
  closingDate: Date;
  totalKots: number;
  openKots: number;
  convertedKots: number;
  cancelledKots: number;
  totalOrdersAmount: string; 
  serviceChargeAmount: string;
  totalRevenue: string;
  totalInvoices: number;
  closedBy: string;
  closedAt: Date;
  createdAt: Date;
};

type DayClosingHistoryRow = DayClosingRow;

export class RestaurantDayClosingService {
  private readonly dayClosingTableSql = `
    CREATE TABLE IF NOT EXISTS restaurant_day_closings (
      id UUID PRIMARY KEY,
      "hotelId" UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
      "closingDate" DATE NOT NULL,
      "totalKots" INTEGER NOT NULL DEFAULT 0,
      "openKots" INTEGER NOT NULL DEFAULT 0,
      "convertedKots" INTEGER NOT NULL DEFAULT 0,
      "cancelledKots" INTEGER NOT NULL DEFAULT 0,
      "totalOrdersAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "serviceChargeAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "totalRevenue" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "totalInvoices" INTEGER NOT NULL DEFAULT 0,
      "closedBy" UUID NOT NULL REFERENCES users(id),
      "closedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("hotelId", "closingDate")
    );
  `;

  private readonly addClosedKotStatusSql = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'KOTStatus' AND e.enumlabel = 'CLOSED'
      ) THEN
        ALTER TYPE "KOTStatus" ADD VALUE 'CLOSED';
      END IF;
    END $$;
  `;

  private async ensureRestaurantDayClosingInfrastructure() {
    await prisma.$executeRawUnsafe(this.dayClosingTableSql);
    await prisma.$executeRawUnsafe(this.addClosedKotStatusSql);
  }

  private parseDateInput(rawDate?: string) {
    if (!rawDate) {
      const now = new Date();
      return this.normalizeDayRange(now);
    }

    const trimmed = String(rawDate).trim();

    const ddmmyyyyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, dd, mm, yyyy] = ddmmyyyyMatch;
      const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestError('Invalid date format');
      }
      return this.normalizeDayRange(parsed);
    }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, yyyy, mm, dd] = isoMatch;
      const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestError('Invalid date format');
      }
      return this.normalizeDayRange(parsed);
    }

    throw new BadRequestError('Date must be in DD-MM-YYYY or YYYY-MM-DD format');
  }

  private normalizeDayRange(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const dd = String(start.getDate()).padStart(2, '0');
    const mm = String(start.getMonth() + 1).padStart(2, '0');
    const yyyy = String(start.getFullYear());

    return {
      start,
      end,
      displayDate: `${dd}-${mm}-${yyyy}`,
      dateOnly: new Date(start),
    };
  }

  private async getStoredClosing(hotelId: string, dateOnly: Date) {
    const rows = await prisma.$queryRawUnsafe<DayClosingRow[]>(
      `SELECT * FROM restaurant_day_closings WHERE "hotelId" = $1::uuid AND "closingDate" = $2::date LIMIT 1`,
      hotelId,
      dateOnly.toISOString().slice(0, 10),
    );

    return rows[0] || null;
  }

  private mapStoredClosingToSummary(row: DayClosingHistoryRow): RestaurantDaySummary {
    const dateValue = new Date(row.closingDate);
    const dd = String(dateValue.getDate()).padStart(2, '0');
    const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
    const yyyy = String(dateValue.getFullYear());

    return {
      date: `${dd}-${mm}-${yyyy}`,
      hotelId: row.hotelId,
      hotelName: row.hotel_name || 'Unknown Hotel',
      totalKotsToday: Number(row.totalKots || 0),
      openKots: Number(row.openKots || 0),
      convertedKots: Number(row.convertedKots || 0),
      cancelledKots: Number(row.cancelledKots || 0),
      totalOrdersAmount: Number(row.totalOrdersAmount || 0),
      serviceChargeAmount: Number(row.serviceChargeAmount || 0),
      totalRevenueToday: Number(row.totalRevenue || 0),
      totalInvoicesToday: Number(row.totalInvoices || 0),
      dayClosed: true,
      closedAt: row.closedAt ? new Date(row.closedAt).toISOString() : null,
      closedBy: row.closedBy || null,
    };
  }

  async getHistory(hotelId: string | string[], rawFromDate?: string, rawToDate?: string): Promise<RestaurantDaySummary[]> {
    await this.ensureRestaurantDayClosingInfrastructure();

    const hotelIds = Array.isArray(hotelId) ? hotelId : [hotelId];
    if (hotelIds.length === 0) return [];

    const params: Array<any> = [hotelIds];
    const whereClauses: string[] = ['"hotelId" = ANY($1::uuid[])'];

    if (rawFromDate) {
      const { dateOnly } = this.parseDateInput(rawFromDate);
      params.push(dateOnly.toISOString().slice(0, 10));
      whereClauses.push(`"closingDate" >= $${params.length}::date`);
    }

    if (rawToDate) {
      const { dateOnly } = this.parseDateInput(rawToDate);
      params.push(dateOnly.toISOString().slice(0, 10));
      whereClauses.push(`"closingDate" <= $${params.length}::date`);
    }

    const rows = await prisma.$queryRawUnsafe<DayClosingHistoryRow[]>(
      `
        SELECT dc.*, h.name as hotel_name
        FROM restaurant_day_closings dc
        JOIN hotels h ON dc."hotelId" = h.id
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY "closingDate" DESC, h.name ASC
      `,
      ...params,
    );

    return rows.map((row) => this.mapStoredClosingToSummary(row));
  }

  async getSummary(hotelId: string | string[], rawDate?: string): Promise<RestaurantDaySummary | RestaurantDaySummary[]> {
    await this.ensureRestaurantDayClosingInfrastructure();
    const { start, end, displayDate, dateOnly } = this.parseDateInput(rawDate);

    const hotelIds = Array.isArray(hotelId) ? hotelId : [hotelId];
    if (hotelIds.length === 0) return [];

    const summaries = await Promise.all(hotelIds.map(async (hid) => {
      const [
        hotel,
        totalKotsToday,
        openKots,
        convertedKots,
        cancelledKots,
        ordersAggregate,
        totalInvoicesToday,
        storedClosing,
      ] = await Promise.all([
        prisma.hotel.findUnique({ where: { id: hid }, select: { name: true } }),
        (prisma.restaurantKOT as any).count({
          where: {
            hotelId: hid,
            isDeleted: false,
            printedAt: { gte: start, lte: end },
          },
        }),
        (prisma.restaurantKOT as any).count({
          where: {
            hotelId: hid,
            isDeleted: false,
            status: 'OPEN',
            printedAt: { gte: start, lte: end },
          },
        }),
        (prisma.restaurantKOT as any).count({
          where: {
            hotelId: hid,
            isDeleted: false,
            status: 'CONVERTED',
            printedAt: { gte: start, lte: end },
          },
        }),
        (prisma.restaurantKOT as any).count({
          where: {
            hotelId: hid,
            isDeleted: false,
            status: 'CANCELLED',
            printedAt: { gte: start, lte: end },
          },
        }),
        (prisma.restaurantOrder as any).aggregate({
          where: {
            hotelId: hid,
            isDeleted: false,
            createdAt: { gte: start, lte: end },
          },
          _sum: {
            subtotal: true,
            serviceCharge: true,
          },
        }),
        (prisma.invoice as any).count({
          where: {
            hotelId: hid,
            type: 'RESTAURANT',
            isDeleted: false,
            createdAt: { gte: start, lte: end },
          },
        }),
        this.getStoredClosing(hid, dateOnly),
      ]);

      const totalOrdersAmount = Number(ordersAggregate?._sum?.subtotal || 0);
      const serviceChargeAmount = Number(ordersAggregate?._sum?.serviceCharge || 0);
      const totalRevenueToday = totalOrdersAmount + serviceChargeAmount;

      if (storedClosing) {
        return {
          ...this.mapStoredClosingToSummary({ ...storedClosing, hotel_name: hotel?.name || 'Unknown Hotel' } as any),
          date: displayDate,
        };
      }

      return {
        date: displayDate,
        hotelId: hid,
        hotelName: hotel?.name || 'Unknown Hotel',
        totalKotsToday,
        openKots,
        convertedKots,
        cancelledKots,
        totalOrdersAmount,
        serviceChargeAmount,
        totalRevenueToday,
        totalInvoicesToday,
        dayClosed: false,
        closedAt: null,
        closedBy: null,
      } as RestaurantDaySummary;
    }));

    return Array.isArray(hotelId) ? summaries : summaries[0];
  }

  async closeDay(hotelId: string, rawDate: string | undefined, userId: string) {
    await this.ensureRestaurantDayClosingInfrastructure();
    const { start, end, displayDate, dateOnly } = this.parseDateInput(rawDate);

    const existing = await this.getStoredClosing(hotelId, dateOnly);
    if (existing) {
      throw new ConflictError(`Restaurant day already closed for ${displayDate}`);
    }

    const summary = (await this.getSummary(hotelId, displayDate)) as RestaurantDaySummary;

    await prisma.$transaction(async (tx) => {
      await (tx.restaurantKOT as any).updateMany({
        where: {
          hotelId,
          isDeleted: false,
          status: 'OPEN',
          printedAt: { gte: start, lte: end },
        },
        data: {
          status: 'CLOSED',
        },
      });

      await tx.$executeRawUnsafe(
        `
          INSERT INTO restaurant_day_closings (
            id,
            "hotelId",
            "closingDate",
            "totalKots",
            "openKots",
            "convertedKots",
            "cancelledKots",
            "totalOrdersAmount",
            "serviceChargeAmount",
            "totalRevenue",
            "totalInvoices",
            "closedBy"
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::date,
            $4::int,
            $5::int,
            $6::int,
            $7::int,
            $8::numeric,
            $9::numeric,
            $10::numeric,
            $11::int,
            $12::uuid
          )
        `,
        randomUUID(),
        hotelId,
        dateOnly.toISOString().slice(0, 10),
        summary.totalKotsToday,
        summary.openKots,
        summary.convertedKots,
        summary.cancelledKots,
        summary.totalOrdersAmount,
        summary.serviceChargeAmount,
        summary.totalRevenueToday,
        summary.totalInvoicesToday,
        userId,
      );
    });

    return {
      ...summary,
      dayClosed: true,
      closedAt: new Date().toISOString(),
      closedBy: userId,
    };
  }
}
