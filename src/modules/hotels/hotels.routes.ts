import { Router } from 'express';
import { HotelsController } from './hotels.controller';
import { authenticate } from '../../middleware/authenticate';
import { tenantIsolation } from '../../middleware/tenantIsolation';
import { adminOnly, managerAndAbove } from '../../guards/authorization';

const router = Router();
const hotelsController = new HotelsController();

// All routes require authentication
router.use(authenticate);

// Get all hotels (with tenant isolation)
router.get('/', tenantIsolation, hotelsController.getAllHotels.bind(hotelsController));

// Get dashboard stats
router.get('/stats', hotelsController.getStats.bind(hotelsController));
router.get('/:id/stats', hotelsController.getStats.bind(hotelsController));

// Get hotel by ID
router.get('/:id', hotelsController.getHotelById.bind(hotelsController));

// Create hotel (admin only)
router.post('/', adminOnly, hotelsController.createHotel.bind(hotelsController));

// Update hotel (manager and above)
router.put('/:id', managerAndAbove, hotelsController.updateHotel.bind(hotelsController));

// Set / reset hotel user credentials (admin only)
router.post('/:id/credentials', adminOnly, hotelsController.setCredentials.bind(hotelsController));

// Clone hotel (admin only)
router.post('/:id/clone', adminOnly, hotelsController.cloneHotel.bind(hotelsController));

// Delete hotel (admin only)
router.delete('/:id', adminOnly, hotelsController.deleteHotel.bind(hotelsController));

export default router;
