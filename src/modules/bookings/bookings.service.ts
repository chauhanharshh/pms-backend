import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { RoomsService } from '../rooms/rooms.service';
import logger from '../../utils/logger';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceStatus } from '@prisma/client';
import { calculateRoomTax } from '../../utils/tax';

const roomsService = new RoomsService();

/** Map frontend payment mode string to Prisma PaymentMethod enum */
function mapPaymentMethod(mode: string): 'cash' | 'card' | 'upi' | 'bank' {
  const m = (mode || '').toLowerCase();
  if (m === 'card' || m === 'credit' || m === 'debit') return 'card';
  if (m === 'upi') return 'upi';
  if (m === 'bank transfer' || m === 'bank' || m === 'cheque') return 'bank';
  return 'cash'; // default
}

export class BookingsService {
  async getBookingsByHotel(hotelId: string, status?: string, startDate?: Date, endDate?: Date) {
    const where: any = { hotelId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.checkInDate = {};
      if (startDate) where.checkInDate.gte = startDate;
      if (endDate) where.checkInDate.lte = endDate;
    }

    try {
      return await prisma.booking.findMany({
        where,
        include: { room: { include: { roomType: true } }, bill: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      console.error('findAll bookings error:', error?.message || error);
      console.error('findAll bookings stack:', error?.stack);
      logger.error('getBookingsByHotel failed', error);
      return [];
    }
  }

  async getBookingById(bookingId: string, hotelId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: { room: { include: { roomType: true } }, bill: true, advancePayments: true },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    return booking;
  }

  async updateBooking(bookingId: string, hotelId: string, userId: string, data: any) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: { room: { include: { roomType: true } }, bill: true },
    });

    if (!booking) throw new NotFoundError('Booking not found');

    if (data?.status === 'cancelled') {
      if (booking.status !== 'pending' && booking.status !== 'confirmed') {
        throw new BadRequestError('Only pending or confirmed reservations can be cancelled');
      }

      return prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'cancelled',
          updatedBy: userId,
        },
        include: { room: { include: { roomType: true } }, bill: true },
      });
    }

    throw new BadRequestError('Unsupported booking update');
  }

  async createReservation(data: any, hotelId: string, userId: string) {
    const isAvailable = await roomsService.checkRoomAvailability(
      hotelId,
      data.roomId,
      new Date(data.checkInDate),
      new Date(data.checkOutDate)
    );
    if (!isAvailable) {
      throw new BadRequestError("Room is not available for selected dates");
    }

    const {
      roomId,
      plan,
      guestName,
      guestPhone,
      guestEmail,
      idProof,
      addressLine,
      checkInDate,
      checkOutDate,
      adults,
      children,
      totalAmount,
      advanceAmount,
      companyId,
      companyName,
      companyGst,
      comingFrom,
      goingTo,
      purposeOfVisit,
      marketSegment,
      businessSource,
      vehicleDetails,
      remarks,
      checkInTime,
      checkOutTime,
      source,
      roomPrice,
    } = data;

    return prisma.booking.create({
      data: {
        hotelId,
        roomId,
        plan: plan || null,
        guestName,
        guestPhone,
        guestEmail,
        idProof,
        addressLine,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        adults: Number(adults),
        children: Number(children),
        totalAmount: new Decimal(totalAmount || 0),
        advanceAmount: new Decimal(advanceAmount || 0),
        status: "pending",
        source: source === "reservation" ? "reservation" : "walk_in",
        createdBy: userId,
        updatedBy: userId,
        companyId: companyId || undefined,
        companyName: companyName || undefined,
        companyGst: companyGst || undefined,
        comingFrom,
        goingTo,
        purposeOfVisit: purposeOfVisit || "Tourism",
        marketSegment,
        businessSource,
        vehicleDetails,
        remarks,
        checkInTime,
        checkOutTime,
        roomPrice: roomPrice ? new Decimal(roomPrice.toString()) : null,
      },
      include: { room: { include: { roomType: true } } },
    });
  }

  /**
   * Walk-In Check-In: creates booking + bill + advance payment in one transaction.
   */
  async walkInCheckIn(data: {
    roomId: string;
    plan?: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    address?: string;
    idProof?: string;
    adults: number;
    children?: number;
    checkInDate: string;
    checkOutDate: string;
    checkInTime?: string;
    checkOutTime?: string;
    advanceAmount: number;
    paymentMode: string;
    specialRequests?: string;
    companyId?: string;
    companyName?: string;
    companyGst?: string;
    roomRate: number;
    taxAmount: number;
    comingFrom?: string;
    goingTo?: string;
    purposeOfVisit?: string;
    marketSegment?: string;
    businessSource?: string;
    vehicleDetails?: string;
    remarks?: string;
  }, hotelId: string, userId: string) {
    console.log("walkInCheckIn payload received:", data);
    const room = await prisma.room.findFirst({ where: { id: data.roomId, hotelId } });
    if (!room) throw new NotFoundError('Room not found');
    if (room.status !== 'vacant') throw new BadRequestError('Room is not vacant');

    const nights = Math.max(1, Math.ceil(
      (new Date(data.checkOutDate).getTime() - new Date(data.checkInDate).getTime()) / 86400000
    ));
    const roomRate = new Decimal(data.roomRate.toString());
    const roomCharges = roomRate.mul(nights);
    // Recalculate tax on backend for consistency
    const taxInfo = calculateRoomTax(roomRate, nights);
    const taxAmount = taxInfo.amount;
    const totalAmount = roomCharges.add(taxAmount);
    const advanceRaw = new Decimal(data.advanceAmount.toString());
    const advance = advanceRaw.gt(totalAmount) ? totalAmount : advanceRaw;
    const balanceDue = totalAmount.sub(advance);

    return prisma.$transaction(async (tx) => {
      // 1. Create booking at checked_in status
      const booking = await tx.booking.create({
        data: {
          hotelId,
          roomId: data.roomId,
          plan: data.plan || null,
          companyId: data.companyId || undefined,
          companyName: data.companyName || undefined,
          companyGst: data.companyGst || undefined,
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          guestEmail: data.guestEmail,
          addressLine: data.address,
          idProof: data.idProof,
          adults: data.adults,
          children: data.children || 0,
          checkInDate: new Date(data.checkInDate),
          checkOutDate: new Date(data.checkOutDate),
          checkInTime: data.checkInTime,
          checkOutTime: data.checkOutTime,
          totalAmount,
          advanceAmount: advance,
          status: 'checked_in',
          source: 'walk_in',
          specialRequests: data.specialRequests,
          createdBy: userId,
          updatedBy: userId,
          comingFrom: data.comingFrom,
          goingTo: data.goingTo,
          purposeOfVisit: data.purposeOfVisit || 'Tourism',
          marketSegment: data.marketSegment,
          businessSource: data.businessSource,
          vehicleDetails: data.vehicleDetails,
          remarks: data.remarks,
          roomPrice: roomRate,
        },
        include: { room: { include: { roomType: true } } },
      });

      // 2. Create bill
      const bill = await tx.bill.create({
        data: {
          hotelId,
          bookingId: booking.id,
          roomCharges,
          subtotal: roomCharges,
          taxAmount,
          totalAmount,
          paidAmount: advance,
          balanceDue,
          status: balanceDue.lte(0) ? 'paid' : 'partial',
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // 3. Create advance payment record if advance > 0
      if (advance.gt(0)) {
        await tx.advancePayment.create({
          data: {
            hotelId,
            bookingId: booking.id,
            guestName: data.guestName,
            amount: advance,
            paymentMethod: mapPaymentMethod(data.paymentMode),
            status: 'adjusted',
            usedAmount: advance,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }

      // 4. Update room to occupied
      await tx.room.update({
        where: { id: data.roomId },
        data: { status: 'occupied', updatedBy: userId },
      });

      logger.info(`Walk-in check-in completed: booking ${booking.id}, room ${data.roomId}`);
      return { booking, bill };
    });
  }

  async checkIn(
    bookingId: string,
    hotelId: string,
    userId: string,
    data?: {
      checkInDate?: string;
      checkOutDate?: string;
      checkInTime?: string;
      checkOutTime?: string;
      plan?: string;
      roomPrice?: number;
    }
  ) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: { room: true },
    });

    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.status !== 'confirmed' && booking.status !== 'pending') throw new BadRequestError('Only pending or confirmed bookings can be checked in');
    if (booking.room.status !== 'vacant') throw new BadRequestError('Room is not vacant');

    const parsedCheckInDate = data?.checkInDate ? new Date(data.checkInDate) : null;
    const parsedCheckOutDate = data?.checkOutDate ? new Date(data.checkOutDate) : null;
    const resolvedCheckInDate = parsedCheckInDate && !Number.isNaN(parsedCheckInDate.getTime())
      ? parsedCheckInDate
      : booking.checkInDate;
    const resolvedCheckOutDate = parsedCheckOutDate && !Number.isNaN(parsedCheckOutDate.getTime())
      ? parsedCheckOutDate
      : booking.checkOutDate;

    return prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'checked_in',
          checkInDate: resolvedCheckInDate,
          checkOutDate: resolvedCheckOutDate,
          checkInTime: data?.checkInTime ?? booking.checkInTime,
          checkOutTime: data?.checkOutTime ?? booking.checkOutTime,
          plan: data?.plan ?? booking.plan,
          roomPrice: data?.roomPrice ? new Decimal(data.roomPrice.toString()) : booking.roomPrice,
          updatedBy: userId,
        },
        include: { room: true, advancePayments: true },
      });

      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'occupied', updatedBy: userId },
      });

      const checkIn = new Date(resolvedCheckInDate);
      const checkOut = new Date(resolvedCheckOutDate);
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      const basePrice = booking.roomPrice ? new Decimal(booking.roomPrice.toString()) : booking.room.basePrice;
      const roomCharges = basePrice.mul(nights);
      
      // Calculate taxes based on 5%/18% rule
      const taxInfo = calculateRoomTax(basePrice, nights);
      const taxAmount = taxInfo.amount;
      const totalAmount = roomCharges.add(taxAmount);

      const bill = await tx.bill.create({
        data: {
          hotelId,
          bookingId: booking.id,
          roomCharges,
          taxAmount,
          subtotal: roomCharges,
          totalAmount: totalAmount,
          balanceDue: totalAmount,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      if (booking.advanceAmount.gt(0)) {
        const advancePayment = await tx.advancePayment.findFirst({
          where: { bookingId: booking.id, status: 'pending' },
        });
        if (advancePayment) {
          const usedAmount = advancePayment.amount.gt(bill.totalAmount)
            ? bill.totalAmount
            : advancePayment.amount;
          await tx.advancePayment.update({
            where: { id: advancePayment.id },
            data: {
              usedAmount,
              status: usedAmount.equals(advancePayment.amount) ? 'adjusted' : 'linked',
            },
          });
          await tx.bill.update({
            where: { id: bill.id },
            data: {
              paidAmount: usedAmount,
              balanceDue: totalAmount.sub(usedAmount),
              status: totalAmount.sub(usedAmount).lte(0) ? 'paid' : 'partial',
            },
          });
        }
      }

      logger.info(`Check-in completed for booking ${bookingId}`);
      return updatedBooking;
    });
  }

  async getCheckoutPreview(bookingId: string, hotelId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: {
        room: true,
        bill: true,
        miscCharges: true,
        restaurantOrders: { where: { status: { not: 'cancelled' } } },
      },
    });

    if (!booking) throw new NotFoundError('Booking not found');
    const bill = booking.bill;
    if (!bill) throw new BadRequestError('No bill found for this booking');
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });

    // Aggregate active values for a live preview
    const miscTotal = booking.miscCharges.reduce(
      (sum, charge) => sum.add(charge.amount.mul(charge.quantity)), new Decimal(0)
    );
    const restaurantTotal = booking.restaurantOrders.reduce(
      (sum, order) => sum.add(order.totalAmount), new Decimal(0)
    );

    const roomCharges = new Decimal(bill.roomCharges.toString());
    const subtotal = roomCharges.add(miscTotal).add(restaurantTotal);

    // Tax Recalculation logic: GST ONLY ON ROOM RENT using new rules
    const nights = Math.max(1, Math.ceil(
      (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000
    ));
    const dailyRent = roomCharges.div(nights);
    const taxInfo = calculateRoomTax(dailyRent, nights);
    const taxAmount = taxInfo.amount;

    const discount = new Decimal(bill.discount?.toString() || '0');
    const totalAmount = subtotal.sub(discount).add(taxAmount);
    const paidAmount = new Decimal(bill.paidAmount?.toString() || '0');
    let balanceDue = totalAmount.sub(paidAmount);
    if (balanceDue.lt(0)) balanceDue = new Decimal(0);

    return {
      bookingId: booking.id,
      guestName: booking.guestName,
      roomNumber: booking.room.roomNumber,
      roomCharges: roomCharges.toNumber(),
      miscCharges: miscTotal.toNumber(),
      restaurantCharges: restaurantTotal.toNumber(),
      subtotal: subtotal.toNumber(),
      discount: discount.toNumber(),
      taxAmount: taxAmount.toNumber(),
      totalAmount: totalAmount.toNumber(),
      paidAmount: paidAmount.toNumber(),
      balanceDue: balanceDue.toNumber(),
    };
  }

  async checkOut(bookingId: string, hotelId: string, userId: string, finalPayment?: number, paymentMode?: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: {
        room: true,
        bill: true,
        miscCharges: true,
        restaurantOrders: { where: { status: { not: 'cancelled' } } },
      },
    });

    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.status !== 'checked_in') throw new BadRequestError('Only checked-in bookings can be checked out');

    const bill = booking.bill;
    if (!bill) throw new BadRequestError('No bill found for this booking');

    return prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.findUnique({ where: { id: hotelId } });
      const miscTotal = booking.miscCharges.reduce(
        (sum, charge) => sum.add(charge.amount.mul(charge.quantity)), new Decimal(0)
      );
      const restaurantTotal = booking.restaurantOrders.reduce(
        (sum, order) => sum.add(order.totalAmount), new Decimal(0)
      );

      const roomCharges = new Decimal(bill.roomCharges.toString());
      const subtotal = roomCharges.add(miscTotal).add(restaurantTotal);

      // GST ONLY ON ROOM RENT using new rules
      const nights = Math.max(1, Math.ceil(
        (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000
      ));
      const dailyRent = roomCharges.div(nights);
      const taxInfo = calculateRoomTax(dailyRent, nights);
      const taxAmount = taxInfo.amount;

      const discount = new Decimal(bill.discount?.toString() || '0');
      const totalAmount = subtotal.sub(discount).add(taxAmount);

      const currentPaidAmount = new Decimal(bill.paidAmount?.toString() || '0');
      let currentBalance = totalAmount.sub(currentPaidAmount);
      if (currentBalance.lt(0)) currentBalance = new Decimal(0);

      const submittedPayment = new Decimal(finalPayment?.toString() || '0');

      const totalPaidAmount = currentPaidAmount.add(submittedPayment);
      const resultingBalance = totalAmount.sub(totalPaidAmount);

      // Block checkout if strict underpayment remains (outstanding balance > 0)
      if (resultingBalance.gt(0)) {
        throw new BadRequestError(`Outstanding payment pending. Amount ₹${resultingBalance.toNumber()} is due.`);
      }

      // Block overpayments too
      if (submittedPayment.gt(currentBalance)) {
        throw new BadRequestError(`Payment amount ${submittedPayment.toNumber()} exceeds outstanding balance of ${currentBalance.toNumber()}`);
      }

      // Create an AdvancePayment record mapping the final checkout payment exclusively to properly trace cash vs upi
      if (submittedPayment.gt(0)) {
        await tx.advancePayment.create({
          data: {
            hotelId,
            bookingId: booking.id,
            guestName: booking.guestName,
            amount: submittedPayment,
            paymentMethod: mapPaymentMethod(paymentMode || 'cash'),
            status: 'adjusted',
            usedAmount: submittedPayment,
            remarks: 'Final check-out payment',
            createdBy: userId,
            updatedBy: userId,
          }
        });
      }

      await tx.bill.update({
        where: { id: bill.id },
        data: {
          miscCharges: miscTotal,
          restaurantCharges: restaurantTotal,
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount: totalPaidAmount,
          balanceDue: resultingBalance.lt(0) ? new Decimal(0) : resultingBalance,
          status: resultingBalance.lte(0) ? 'paid' : 'partial',
          updatedBy: userId,
        },
      });

      // Synchronize associated Invoice strictly setting to 'paid' on successful checkout
      const linkedInvoice = await tx.invoice.findUnique({ where: { billId: bill.id } });
      if (linkedInvoice) {
        await tx.invoice.update({
          where: { id: linkedInvoice.id },
          data: { status: InvoiceStatus.paid, updatedBy: userId },
        });
      }

      // Close pending restaurant orders securely tying status to generated billed amounts
      const pendingOrders = await tx.restaurantOrder.findMany({
        where: {
          bookingId: booking.id,
          hotelId,
          status: { in: ['pending', 'kot_printed', 'served'] }
        }
      });

      if (pendingOrders.length > 0) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        let resInvoiceCount = await tx.invoice.count({
          where: { hotelId, type: 'RESTAURANT', createdAt: { gte: startOfDay } }
        });

        for (const order of pendingOrders) {
          const resInvoiceNumber = `INV-RES-${dateStr}-${(++resInvoiceCount).toString().padStart(4, '0')}`;

          await tx.invoice.create({
            data: {
              hotelId,
              restaurantOrderId: order.id,
              invoiceNumber: resInvoiceNumber,
              subtotal: order.subtotal,
              cgst: 0,
              sgst: 0,
              serviceCharge: order.serviceCharge,
              totalAmount: order.totalAmount,
              status: InvoiceStatus.issued,
              type: 'RESTAURANT',
              source: 'Checkout',
              createdBy: userId,
              updatedBy: userId
            }
          });

          await tx.restaurantOrder.update({
            where: { id: order.id },
            data: {
              status: 'billed',
              billedAt: new Date(),
              invoicedAt: new Date(),
              issuedAt: new Date(),
              issuedBy: userId,
              updatedBy: userId
            }
          });
        }
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'checked_out', updatedBy: userId },
      });

      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'cleaning', updatedBy: userId },
      });

      logger.info(`Check-out completed for booking ${bookingId}`);
      return { bookingId, totalAmount, paidAmount: totalPaidAmount, balanceDue: resultingBalance };
    });
  }
}
