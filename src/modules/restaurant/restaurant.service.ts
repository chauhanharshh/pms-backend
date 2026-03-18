import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { Decimal } from '@prisma/client/runtime/library';
import { calculateRoomTax } from '../../utils/tax';

export class RestaurantService {
    async getServiceChargeReport(filters: {
        hotelId?: string;
        startDate?: string;
        endDate?: string;
        stewardName?: string;
        orderId?: string;
    }) {
        const where: any = {
            isDeleted: false,
            serviceCharge: { gt: 0 }
        };

        if (filters.hotelId) {
            where.hotelId = filters.hotelId;
        }

        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = new Date(`${filters.startDate}T00:00:00.000Z`);
            }
            if (filters.endDate) {
                where.createdAt.lte = new Date(`${filters.endDate}T23:59:59.999Z`);
            }
        }

        if (filters.stewardName) {
            where.stewardName = { contains: filters.stewardName, mode: 'insensitive' };
        }

        if (filters.orderId) {
            where.OR = [
                { orderNumber: { contains: filters.orderId, mode: 'insensitive' } },
                { id: { equals: filters.orderId } }
            ];
        }

        const orders = await prisma.restaurantOrder.findMany({
            where,
            select: {
                id: true,
                orderNumber: true,
                createdAt: true,
                tableNumber: true,
                room: { select: { roomNumber: true } },
                stewardId: true,
                stewardName: true,
                serviceCharge: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        const detailed = orders.map((o) => ({
            stewardId: o.stewardId || null,
            stewardName: o.stewardName || 'Unassigned',
            orderId: o.id,
            orderNumber: o.orderNumber,
            date: o.createdAt,
            tableOrRoom: o.tableNumber ? `Table ${o.tableNumber}` : (o.room?.roomNumber ? `Room ${o.room.roomNumber}` : 'N/A'),
            serviceChargeAmount: Number(o.serviceCharge || 0),
        }));

        const grouped = new Map<string, { stewardId?: string | null; stewardName: string; totalServiceCharge: number; orderCount: number }>();

        for (const row of detailed) {
            const key = row.stewardId || row.stewardName;
            const existing = grouped.get(key);
            if (existing) {
                existing.totalServiceCharge += row.serviceChargeAmount;
                existing.orderCount += 1;
            } else {
                grouped.set(key, {
                    stewardId: row.stewardId,
                    stewardName: row.stewardName,
                    totalServiceCharge: row.serviceChargeAmount,
                    orderCount: 1,
                });
            }
        }

        const summary = Array.from(grouped.values())
            .sort((a, b) => b.totalServiceCharge - a.totalServiceCharge)
            .map((s) => ({
                ...s,
                totalServiceCharge: Number(s.totalServiceCharge.toFixed(2)),
            }));

        const grandTotal = Number(detailed.reduce((sum, row) => sum + row.serviceChargeAmount, 0).toFixed(2));

        return {
            detailed,
            summary,
            totals: {
                grandTotal,
                totalOrders: detailed.length,
                totalStewards: summary.length,
            }
        };
    }

    // ── CATEGORIES ──
    async getCategories(hotelId?: string) {
        return prisma.restaurantCategory.findMany({
            where: hotelId ? { hotelId } : {},
            include: { menuItems: { where: { isAvailable: true } } },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async createCategory(data: any, hotelId: string, userId: string) {
        return prisma.restaurantCategory.create({
            data: {
                hotelId, name: data.name, description: data.description,
                sortOrder: data.sortOrder ?? 0,
                createdBy: userId, updatedBy: userId,
            },
        });
    }

    async updateCategory(categoryId: string, hotelId: string, data: any, userId: string) {
        const cat = await prisma.restaurantCategory.findFirst({ where: { id: categoryId, hotelId } });
        if (!cat) throw new NotFoundError('Category not found');
        return prisma.restaurantCategory.update({
            where: { id: categoryId },
            data: { ...data, updatedBy: userId },
        });
    }

    async deleteCategory(categoryId: string, hotelId: string) {
        const cat = await prisma.restaurantCategory.findFirst({ where: { id: categoryId, hotelId } });
        if (!cat) throw new NotFoundError('Category not found');
        return prisma.restaurantCategory.delete({ where: { id: categoryId } });
    }

    // ── MENU ITEMS ──
    async getMenuItems(hotelId?: string, categoryId?: string) {
        const where: any = {};
        if (hotelId) where.hotelId = hotelId;
        if (categoryId) where.categoryId = categoryId;
        return prisma.restaurantMenu.findMany({
            where,
            include: { category: true },
            orderBy: { itemName: 'asc' },
        });
    }

    async createMenuItem(data: any, hotelId: string, userId: string) {
        return prisma.restaurantMenu.create({
            data: {
                hotelId, categoryId: data.categoryId,
                itemName: data.itemName, description: data.description,
                price: data.price, taxRate: data.taxRate ?? 5,
                isAvailable: data.isAvailable ?? true,
                isVeg: data.isVeg ?? true,
                preparationTime: data.preparationTime,
                createdBy: userId, updatedBy: userId,
            },
            include: { category: true },
        });
    }

    async updateMenuItem(itemId: string, hotelId: string, data: any, userId: string) {
        const item = await prisma.restaurantMenu.findFirst({ where: { id: itemId, hotelId } });
        if (!item) throw new NotFoundError('Menu item not found');
        return prisma.restaurantMenu.update({
            where: { id: itemId },
            data: { ...data, updatedBy: userId },
            include: { category: true },
        });
    }

    async deleteMenuItem(itemId: string, hotelId: string) {
        const item = await prisma.restaurantMenu.findFirst({ where: { id: itemId, hotelId } });
        if (!item) throw new NotFoundError('Menu item not found');
        return prisma.restaurantMenu.delete({ where: { id: itemId } });
    }

    // ── ORDERS ──
    async getOrders(hotelId?: string, status?: string, bookingId?: string) {
        try {
            const where: any = { isDeleted: false };
            if (hotelId && hotelId !== 'all') where.hotelId = hotelId;
            if (status && status !== 'all') where.status = status;
            if (bookingId) where.bookingId = bookingId;
            
            return await prisma.restaurantOrder.findMany({
                where,
                include: {
                    orderItems: { include: { menuItem: true } },
                    booking: true,
                    room: true,
                },
                orderBy: { createdAt: 'desc' },
            });
        } catch (error) {
            console.error('Error fetching restaurant orders:', error);
            // Return empty array to prevent 500 errors as per user request
            return [];
        }
    }

    async getCheckedInRooms(hotelId?: string) {
        const where: any = { status: 'checked_in' };
        if (hotelId) where.hotelId = hotelId;
        const bookings = await prisma.booking.findMany({
            where,
            select: {
                id: true,
                guestName: true,
                status: true,
                roomId: true,
                room: {
                    select: {
                        id: true,
                        roomNumber: true,
                    },
                },
            },
            orderBy: {
                room: {
                    roomNumber: 'asc',
                },
            },
        });

        // Map it so the frontend shape matches the old standard room object with nested bookings
        return bookings.map(b => ({
            id: b.room?.id,
            roomNumber: b.room?.roomNumber,
            bookings: [
                {
                    id: b.id,
                    status: b.status,
                    guest: { name: b.guestName }
                }
            ]
        }));
    }

    async createOrder(data: any, hotelId: string, userId: string) {
        return prisma.$transaction(async (tx) => {
            // Auto-generate order number
            const last = await tx.restaurantOrder.findFirst({
                where: { hotelId }, orderBy: { createdAt: 'desc' },
            });
            const count = last ? parseInt(last.orderNumber.split('-').pop() || '0') + 1 : 1;
            const orderNumber = `ORD-${String(count).padStart(4, '0')}`;

            // Calculate totals
            const items: any[] = data.items || [];
            let subtotal = 0;
            for (const item of items) {
                subtotal += Number(item.price) * item.quantity;
            }
            const discount = Number(data.discount || 0);
            const netSubtotal = Math.max(0, subtotal - discount);
            const gst = 0; // GST removed from restaurant charges
            const serviceCharge = netSubtotal * 0.10; // 10% Service Charge
            const totalAmount = netSubtotal + gst + serviceCharge;

            // Subtotal used for invoice should exclude discount but include GST/Service if needed. 
            // In our case, total is what matters.

            return tx.restaurantOrder.create({
                data: {
                    hotelId, orderNumber,
                    bookingId: data.bookingId || null,
                    roomId: data.roomId || null,
                    tableNumber: data.tableNumber,
                    guestName: data.guestName,
                    stewardName: data.stewardName,
                    stewardId: data.stewardId || null,
                    subtotal, discount, gst, serviceCharge, totalAmount,
                    paymentMethod: data.paymentMethod || null,
                    status: data.status || 'pending',
                    createdBy: userId, updatedBy: userId,
                    orderItems: {
                        create: items.map((item: any) => ({
                            menuItemId: item.menuItemId,
                            quantity: item.quantity,
                            price: item.price,
                            itemTotal: Number(item.price) * item.quantity,
                            specialNote: item.specialNote,
                        })),
                    },
                },
                include: {
                    orderItems: { include: { menuItem: true } },
                },
            });
        });
    }

    async updateOrder(orderId: string, hotelId: string, data: any, userId: string) {
        const order = await (prisma.restaurantOrder as any).findFirst({
            where: { id: orderId, hotelId },
            include: { invoice: true }
        });
        if (!order) throw new NotFoundError('Order not found');
        if (order.invoice || order.invoicedAt || order.status === 'billed') {
            throw new BadRequestError('Cannot modify an invoiced or billed order');
        }

        return prisma.$transaction(async (tx) => {
            // If items are provided, replace them
            if (data.items) {
                // Delete old items
                await tx.restaurantOrderItem.deleteMany({ where: { orderId } });

                const items: any[] = data.items;
                let subtotal = 0;
                for (const item of items) {
                    subtotal += Number(item.price) * item.quantity;
                }
                const discount = Number(data.discount !== undefined ? data.discount : order.discount);
                const netSubtotal = Math.max(0, subtotal - discount);
                const gst = 0; // GST removed from restaurant charges
                const serviceCharge = netSubtotal * 0.10;
                const totalAmount = netSubtotal + gst + serviceCharge;

                return tx.restaurantOrder.update({
                    where: { id: orderId },
                    data: {
                        bookingId: data.bookingId !== undefined ? data.bookingId : order.bookingId,
                        roomId: data.roomId !== undefined ? data.roomId : order.roomId,
                        tableNumber: data.tableNumber !== undefined ? data.tableNumber : order.tableNumber,
                        guestName: data.guestName !== undefined ? data.guestName : order.guestName,
                        stewardName: data.stewardName !== undefined ? data.stewardName : order.stewardName,
                        stewardId: data.stewardId !== undefined ? data.stewardId : order.stewardId,
                        subtotal, discount, gst, serviceCharge, totalAmount,
                        status: data.status || order.status,
                        paymentMethod: data.paymentMethod || order.paymentMethod,
                        updatedBy: userId,
                        orderItems: {
                            create: items.map((item: any) => ({
                                menuItemId: item.menuItemId,
                                quantity: item.quantity,
                                price: item.price,
                                itemTotal: Number(item.price) * item.quantity,
                                specialNote: item.specialNote,
                            })),
                        },
                    },
                    include: { orderItems: { include: { menuItem: true } } },
                });
            } else {
                // Just update basic info
                return tx.restaurantOrder.update({
                    where: { id: orderId },
                    data: { ...data, updatedBy: userId },
                    include: { orderItems: { include: { menuItem: true } } },
                });
            }
        });
    }

    async updateOrderStatus(orderId: string, hotelId: string, status: string, userId: string, paymentMethod?: string) {
        const order = await (prisma.restaurantOrder as any).findFirst({
            where: { id: orderId, hotelId },
            include: { invoice: true }
        });
        if (!order) throw new NotFoundError('Order not found');
        if ((order.invoice || order.invoicedAt) && status === 'cancelled') {
            throw new BadRequestError('Cannot cancel an invoiced order');
        }

        const updateData: any = { status: status as any, updatedBy: userId };
        if (paymentMethod) updateData.paymentMethod = paymentMethod as any;
        if (status === 'kot_printed') updateData.kotPrintedAt = new Date();
        if (status === 'served') updateData.servedAt = new Date();
        if (status === 'billed') updateData.billedAt = new Date();

        return prisma.restaurantOrder.update({
            where: { id: orderId },
            data: updateData,
            include: { orderItems: { include: { menuItem: true } } },
        });
    }

    async generateInvoice(orderId: string, hotelId: string, userId: string, source: string = 'POS') {
        const order = await prisma.restaurantOrder.findFirst({
            where: { id: orderId, hotelId },
            include: { orderItems: { include: { menuItem: true } } }
        });

        if (!order) throw new NotFoundError('Order not found');
        if (order.status === 'billed' || order.status === 'cancelled') {
            throw new BadRequestError('Cannot generate invoice for billed or cancelled order');
        }

        return prisma.$transaction(async (tx) => {
            // Generate sequence invoice number: INV-RES-YYYYMMDD-XXXX
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const invoices = await (tx.invoice as any).findMany({
                where: {
                    hotelId,
                    type: 'RESTAURANT',
                    createdAt: { gte: startOfDay }
                } as any
            });
            const invoiceNumber = `INV-RES-${dateStr}-${(invoices.length + 1).toString().padStart(4, '0')}`;

            // Create Invoice
            const invoice = await (tx.invoice as any).create({
                data: {
                    hotelId,
                    restaurantOrderId: orderId,
                    invoiceNumber,
                    subtotal: (order as any).subtotal,
                    cgst: new Decimal(0), // Removed GST
                    sgst: new Decimal(0), // Removed GST
                    serviceCharge: (order as any).serviceCharge,
                    totalAmount: (order as any).totalAmount,
                    status: 'issued',
                    type: 'RESTAURANT',
                    source,
                    createdBy: userId,
                    updatedBy: userId
                } as any
            });

            // Update order status and set issuedAt/issuedBy
            await (tx.restaurantOrder as any).update({
                where: { id: orderId },
                data: {
                    status: 'billed',
                    billedAt: new Date(),
                    invoicedAt: new Date(),
                    issuedAt: new Date(),
                    issuedBy: userId,
                    updatedBy: userId
                } as any
            });

            // IF linked to a booking/room, synchronize the room bill totals
            if (order.bookingId) {
                const bill = await tx.bill.findFirst({ where: { bookingId: order.bookingId, hotelId } });
                if (bill) {
                    const allBilledOrders = await tx.restaurantOrder.findMany({
                        where: { bookingId: order.bookingId, status: 'billed' }
                    });
                    const restaurantTotal = allBilledOrders.reduce(
                        (sum: Decimal, o: any) => {
                            const amt = new Decimal(o.totalAmount?.toString() || '0');
                            return sum.add(amt);
                        }, new Decimal(0)
                    );

                    const miscCharges = await tx.miscCharge.findMany({
                        where: { bookingId: order.bookingId, isDeleted: false }
                    });
                    const miscTotal = miscCharges.reduce(
                        (sum: Decimal, m: any) => {
                            const amt = new Decimal(m.amount?.toString() || '0');
                            const qty = new Decimal(m.quantity?.toString() || '1');
                            return sum.add(amt.mul(qty));
                        }, new Decimal(0)
                    );

                    // Recalculate bill totals
                    const roomCharges = new Decimal(bill.roomCharges?.toString() || '0');
                    const subtotal = roomCharges.add(restaurantTotal).add(miscTotal);
                    const discount = new Decimal(bill.discount?.toString() || '0');
                    const netSubtotal = subtotal.sub(discount);

                    // Recalculate Tax (Room Rent based)
                    const booking = await tx.booking.findUnique({ where: { id: order.bookingId } });
                    if (booking) {
                        const nights = Math.max(1, Math.ceil(
                            (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000
                        ));
                        const dailyRent = roomCharges.div(nights);
                        const taxInfo = calculateRoomTax(dailyRent, nights);
                        const taxAmount = taxInfo.amount;
                        const totalAmount = subtotal.add(taxAmount);

                        await tx.bill.update({
                            where: { id: bill.id },
                            data: {
                                restaurantCharges: restaurantTotal,
                                miscCharges: miscTotal,
                                subtotal,
                                taxAmount,
                                totalAmount,
                                balanceDue: totalAmount.sub(bill.paidAmount),
                                updatedBy: userId
                            }
                        });
                    }
                }
            }

            return invoice;
        });
    }

    async generateKOT(orderId: string, hotelId: string, userId: string) {
        const order = await (prisma.restaurantOrder as any).findFirst({
            where: { id: orderId, hotelId },
            include: {
                orderItems: { include: { menuItem: true } }
            }
        });

        if (!order) throw new NotFoundError('Order not found');
        if ((order as any).status === 'billed' || (order as any).status === 'cancelled') {
            throw new BadRequestError('Cannot generate KOT for billed or cancelled order');
        }

        return prisma.$transaction(async (tx) => {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const kotCount = await (tx.restaurantKOT as any).count({
                where: { hotelId, printedAt: { gte: startOfDay } } as any
            });
            const kotNumber = `KOT-${dateStr}-${(kotCount + 1).toString().padStart(4, '0')}`;

            const kot = await (tx.restaurantKOT as any).create({
                data: {
                    hotelId,
                    orderId: (order as any).id,
                    kotNumber,
                    items: (order as any).orderItems.map((i: any) => ({
                        menuItemId: i.menuItemId,
                        itemName: (i.menuItem as any).itemName,
                        quantity: i.quantity,
                        price: i.price
                    })) as any,
                    status: 'OPEN',
                    printedBy: userId
                } as any
            });

            // Update order status to kot_printed if it was pending
            if ((order as any).status === 'pending') {
                await (tx.restaurantOrder as any).update({
                    where: { id: (order as any).id },
                    data: {
                        status: 'kot_printed',
                        kotPrintedAt: new Date(),
                        updatedBy: userId
                    } as any
                });
            }

            return kot;
        });
    }

    async generateKOTAndInvoice(orderId: string, hotelId: string, userId: string) {
        // Updated to only generate KOT as per new requirement to separate sections
        return { kot: await this.generateKOT(orderId, hotelId, userId), invoice: null as any };
    }

    async convertToInvoiceFromKOT(kotId: string, hotelId: string, userId: string) {
        const kot = await (prisma.restaurantKOT as any).findFirst({
            where: { id: kotId, hotelId, isDeleted: false } as any,
            include: { order: { include: { orderItems: { include: { menuItem: true } } } } }
        });

        if (!kot) throw new NotFoundError('KOT not found');
        if ((kot as any).status !== 'OPEN') throw new BadRequestError(`KOT already ${(kot as any).status}`);

        return prisma.$transaction(async (tx) => {
            const order = (kot as any).order;
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const invCount = await (tx.invoice as any).count({
                where: { hotelId, type: 'RESTAURANT', createdAt: { gte: startOfDay } } as any
            });
            const invoiceNumber = `INV-RES-${dateStr}-${(invCount + 1).toString().padStart(4, '0')}`;

            // Create Invoice
            const invoice = await (tx.invoice as any).create({
                data: {
                    hotelId,
                    restaurantOrderId: (order as any).id,
                    invoiceNumber,
                    subtotal: (order as any).subtotal,
                    cgst: new Decimal(0), // GST removed
                    sgst: new Decimal(0), // GST removed
                    serviceCharge: (order as any).serviceCharge,
                    totalAmount: (order as any).totalAmount,
                    status: 'issued',
                    type: 'RESTAURANT',
                    source: 'KOT',
                    createdBy: userId,
                    updatedBy: userId
                } as any
            });

            // Update KOT
            await (tx.restaurantKOT as any).update({
                where: { id: kotId },
                data: {
                    status: 'CONVERTED',
                    linkedInvoiceId: (invoice as any).id
                } as any
            });

            // Update Order
            await (tx.restaurantOrder as any).update({
                where: { id: (order as any).id },
                data: {
                    status: 'billed',
                    billedAt: new Date(),
                    invoicedAt: new Date(),
                    issuedAt: new Date(),
                    issuedBy: userId,
                    updatedBy: userId
                } as any
            });

            // Update room bill if attached to a booking
            if ((order as any).bookingId) {
                const billedOrders = await (tx.restaurantOrder as any).findMany({
                    where: {
                        bookingId: (order as any).bookingId,
                        status: 'billed',
                        isDeleted: false
                    }
                });

                const totalRestaurantCharges = billedOrders.reduce(
                    (sum: Decimal, o: any) => sum.plus(new Decimal(o.totalAmount || 0)),
                    new Decimal(0)
                );

                const bill = await (tx.bill as any).findFirst({
                    where: { bookingId: (order as any).bookingId, isDeleted: false }
                });

                if (bill) {
                    const subtotal = new Decimal(bill.roomCharges || 0)
                        .plus(totalRestaurantCharges)
                        .plus(new Decimal(bill.miscCharges || 0));

                    const discountAmount = new Decimal(bill.discount || 0);
                    const previousSubtotal = new Decimal(
                        bill.subtotal ||
                        new Decimal(bill.roomCharges || 0)
                            .plus(new Decimal(bill.restaurantCharges || 0))
                            .plus(new Decimal(bill.miscCharges || 0))
                    );
                    const previousTaxable = previousSubtotal.minus(discountAmount);
                    const effectiveTaxRate = previousTaxable.gt(0)
                        ? new Decimal(bill.taxAmount || 0).div(previousTaxable)
                        : new Decimal(0);

                    const newTaxable = subtotal.minus(discountAmount);
                    const taxAmount = newTaxable.mul(effectiveTaxRate);
                    const totalAmount = newTaxable.plus(taxAmount);

                    await (tx.bill as any).update({
                        where: { id: (bill as any).id },
                        data: {
                            restaurantCharges: totalRestaurantCharges,
                            subtotal,
                            taxAmount,
                            totalAmount,
                            balanceDue: totalAmount.minus(new Decimal(bill.paidAmount || 0)),
                            updatedBy: userId
                        }
                    });
                }
            }

            return invoice;
        });
    }

    async getKOTs(hotelId?: string, status?: string) {
        const where: any = { isDeleted: false };
        if (hotelId) where.hotelId = hotelId;
        if (status) where.status = status;

        return (prisma.restaurantKOT as any).findMany({
            where,
            include: {
                order: {
                    include: {
                        room: true,
                        booking: true
                    }
                }
            },
            orderBy: { printedAt: 'desc' }
        });
    }

    async updateKOT(kotId: string, hotelId: string, data: any, userId: string) {
        const kot = await (prisma.restaurantKOT as any).findFirst({
            where: { id: kotId, hotelId, isDeleted: false } as any,
            include: { order: true }
        });

        if (!kot) throw new NotFoundError('KOT not found');
        if ((kot as any).status !== 'OPEN') throw new BadRequestError('Cannot edit converted or cancelled KOT');

        return prisma.$transaction(async (tx) => {
            // Update items in KOT and Order if provided
            if (data.items) {
                const items: any[] = data.items;
                let subtotal = 0;
                for (const item of items) {
                    subtotal += Number(item.price) * item.quantity;
                }
                const discount = Number(data.discount !== undefined ? data.discount : (kot as any).order.discount);
                const netSubtotal = Math.max(0, subtotal - discount);
                const gst = 0; // GST removed
                const serviceCharge = netSubtotal * 0.10;
                const totalAmount = netSubtotal + gst + serviceCharge;

                // 1. Update Restaurant Order Items
                await (tx.restaurantOrderItem as any).deleteMany({ where: { orderId: (kot as any).orderId } });
                await (tx.restaurantOrderItem as any).createMany({
                    data: items.map(item => ({
                        orderId: (kot as any).orderId,
                        menuItemId: item.menuItemId,
                        quantity: item.quantity,
                        price: item.price,
                        itemTotal: Number(item.price) * item.quantity,
                        specialNote: item.specialNote
                    })) as any
                });

                // 2. Update Order Totals
                await (tx.restaurantOrder as any).update({
                    where: { id: (kot as any).orderId },
                    data: {
                        subtotal, discount, gst, serviceCharge, totalAmount,
                        updatedBy: userId
                    } as any
                });

                // 3. Update KOT items snapshot
                return (tx.restaurantKOT as any).update({
                    where: { id: kotId },
                    data: {
                        ...(data.status && { status: data.status }),
                        items: items.map(i => ({
                            menuItemId: i.menuItemId,
                            itemName: i.itemName,
                            quantity: i.quantity,
                            price: i.price
                        })) as any
                    } as any
                });
            } else if (data.status) {
                return (tx.restaurantKOT as any).update({
                    where: { id: kotId },
                    data: { status: data.status }
                });
            }

            return kot;
        });
    }

    async deleteKOT(kotId: string, hotelId: string) {
        const kot = await (prisma.restaurantKOT as any).findFirst({
            where: { id: kotId, hotelId, isDeleted: false } as any
        });

        if (!kot) throw new NotFoundError('KOT not found');
        if ((kot as any).status === 'CONVERTED') throw new BadRequestError('Cannot delete converted KOT');

        return (prisma.restaurantKOT as any).update({
            where: { id: kotId },
            data: { isDeleted: true, status: 'CANCELLED' } as any
        });
    }

    async payRestaurantInvoice(invoiceId: string, hotelId: string, paymentMethod: string, userId: string) {
        const invoice = await (prisma.invoice as any).findFirst({
            where: { id: invoiceId, hotelId, type: 'RESTAURANT' },
            include: { restaurantOrder: true }
        });

        if (!invoice) throw new NotFoundError('Invoice not found');
        if ((invoice as any).status === 'paid') throw new BadRequestError('Invoice already paid');
        if (!(invoice as any).restaurantOrderId) throw new BadRequestError('Invoice not linked to a restaurant order');

        return prisma.$transaction(async (tx) => {
            // 1. Update Invoice
            const updatedInvoice = await (tx.invoice as any).update({
                where: { id: invoiceId },
                data: {
                    status: 'paid',
                    paymentMethod,
                    updatedBy: userId
                } as any
            });

            // 2. Update Order
            if ((invoice as any).restaurantOrderId) {
                await (tx.restaurantOrder as any).update({
                    where: { id: (invoice as any).restaurantOrderId! },
                    data: {
                        status: 'billed',
                        paymentMethod: paymentMethod as any,
                        billedAt: new Date(),
                        paidAt: new Date(),
                        paidBy: userId,
                        updatedBy: userId
                    } as any
                });
            }

            return updatedInvoice;
        });
    }

    async getKOTHistory(orderId: string, hotelId: string) {
        return (prisma.restaurantKOT as any).findMany({
            where: { orderId, hotelId },
            orderBy: { printedAt: 'desc' }
        });
    }

    async getInvoices(hotelId?: string, status?: string) {
        const where: any = { type: 'RESTAURANT', isDeleted: false };
        if (hotelId) where.hotelId = hotelId;
        if (status) where.status = status;

        return (prisma.invoice as any).findMany({
            where,
            include: {
                restaurantOrder: {
                    include: {
                        room: true,
                        booking: true,
                        orderItems: { include: { menuItem: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateInvoice(invoiceId: string, hotelId: string, data: any, userId: string) {
        const invoice = await (prisma.invoice as any).findFirst({
            where: { id: invoiceId, hotelId, type: 'RESTAURANT' },
            include: { restaurantOrder: { include: { orderItems: true } } }
        });

        if (!invoice) throw new NotFoundError('Invoice not found');
        if (invoice.status === 'paid' || invoice.status === 'cancelled') {
            throw new BadRequestError(`Cannot edit an invoice with status: ${invoice.status}`);
        }

        const restaurantOrder = invoice.restaurantOrder;
        if (!restaurantOrder) throw new BadRequestError('Invoice not linked to a restaurant order');

        return prisma.$transaction(async (tx) => {
            // If items are provided, update order items
            if (data.items) {
                await tx.restaurantOrderItem.deleteMany({ where: { orderId: restaurantOrder.id } });

                const items: any[] = data.items;
                let subtotal = 0;
                for (const item of items) {
                    subtotal += Number(item.price) * item.quantity;
                }

                const discount = Number(data.discount !== undefined ? data.discount : restaurantOrder.discount);
                const netSubtotal = Math.max(0, subtotal - discount);
                const gst = 0; // GST removed
                const serviceCharge = netSubtotal * 0.10;
                const totalAmount = netSubtotal + gst + serviceCharge;

                // Update Order
                await tx.restaurantOrder.update({
                    where: { id: restaurantOrder.id },
                    data: {
                        subtotal,
                        discount,
                        gst,
                        serviceCharge,
                        totalAmount,
                        updatedBy: userId,
                        orderItems: {
                            create: items.map((item: any) => ({
                                menuItemId: item.menuItemId,
                                quantity: item.quantity,
                                price: item.price,
                                itemTotal: Number(item.price) * item.quantity,
                                specialNote: item.specialNote,
                            })),
                        },
                    }
                });

                // Update Invoice
                return tx.invoice.update({
                    where: { id: invoiceId },
                    data: {
                        subtotal: subtotal,
                        cgst: new Decimal(0), // GST removed
                        sgst: new Decimal(0), // GST removed
                        serviceCharge: serviceCharge,
                        totalAmount: totalAmount,
                        updatedBy: userId
                    }
                });
            } else {
                // Just update status if provided
                if (data.status) {
                    await tx.restaurantOrder.update({
                        where: { id: restaurantOrder.id },
                        data: {
                            status: data.status === 'paid' ? 'billed' : (data.status === 'cancelled' ? 'cancelled' : restaurantOrder.status),
                            updatedBy: userId
                        }
                    });

                    return tx.invoice.update({
                        where: { id: invoiceId },
                        data: { status: data.status, updatedBy: userId }
                    });
                }
                return invoice;
            }
        });
    }
}
