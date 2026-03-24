import { Router } from 'express';
import { RestaurantController } from './restaurant.controller';
import { authenticate } from '../../middleware/authenticate';
import { tenantIsolation } from '../../middleware/tenantIsolation';

const router = Router();
const restaurantController = new RestaurantController();

router.use(authenticate);
router.use(tenantIsolation);

// Categories
router.get('/categories', restaurantController.getCategories.bind(restaurantController));
router.post('/categories', restaurantController.createCategory.bind(restaurantController));
router.put('/categories/:id', restaurantController.updateCategory.bind(restaurantController));
router.delete('/categories/:id', restaurantController.deleteCategory.bind(restaurantController));

// Menu Items
router.get('/menu', restaurantController.getMenuItems.bind(restaurantController));
router.post('/menu', restaurantController.createMenuItem.bind(restaurantController));
router.put('/menu/:id', restaurantController.updateMenuItem.bind(restaurantController));
router.delete('/menu/:id', restaurantController.deleteMenuItem.bind(restaurantController));

// Orders
router.get('/orders', restaurantController.getOrders.bind(restaurantController));
router.get('/service-charge-report', restaurantController.getServiceChargeReport.bind(restaurantController));
router.post('/orders', restaurantController.createOrder.bind(restaurantController));
router.put('/orders/:id', restaurantController.updateOrder.bind(restaurantController));
router.patch('/orders/:id/status', restaurantController.updateOrderStatus.bind(restaurantController));
router.post('/orders/:id/invoice', restaurantController.generateInvoice.bind(restaurantController));
router.post('/orders/:id/kot', restaurantController.generateKOTAndInvoice.bind(restaurantController));
router.get('/orders/:id/kots', restaurantController.getKOTHistory.bind(restaurantController));

// Tables
router.get('/tables', restaurantController.getTables.bind(restaurantController));
router.post('/tables', restaurantController.createTable.bind(restaurantController));
router.patch('/tables/:id', restaurantController.updateTable.bind(restaurantController));
router.delete('/tables/:id', restaurantController.deleteTable.bind(restaurantController));


// All rooms for restaurant (respects POS Boss Mode for cross-hotel access)
router.get('/rooms', restaurantController.getRoomsForRestaurant.bind(restaurantController));

// Active Rooms (checked-in only)
router.get('/checked-in-rooms', restaurantController.getCheckedInRooms.bind(restaurantController));

// KOTs (New Section)
router.get('/kots', restaurantController.getKOTs.bind(restaurantController));
router.get('/day-closing', restaurantController.getRestaurantDayClosingSummary.bind(restaurantController));
router.post('/day-closing', restaurantController.closeRestaurantDay.bind(restaurantController));
router.post('/kots/invoice/combined', restaurantController.generateCombinedInvoiceFromKOTs.bind(restaurantController));
router.put('/kots/:id', restaurantController.updateKOT.bind(restaurantController));
router.delete('/kots/:id', restaurantController.deleteKOT.bind(restaurantController));
router.post('/kots/:id/convert', restaurantController.convertKOTToInvoice.bind(restaurantController));

// Invoices
router.get('/invoices', restaurantController.getInvoices.bind(restaurantController));
router.put('/invoices/:id', restaurantController.updateInvoice.bind(restaurantController));
router.post('/invoices/:id/pay', restaurantController.payInvoice.bind(restaurantController));

export default router;
