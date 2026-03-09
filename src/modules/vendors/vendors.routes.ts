import { Router } from 'express';
import { VendorsController } from './vendors.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const vendorsController = new VendorsController();

router.use(authenticate);

router.get('/', vendorsController.getVendors);
router.post('/', vendorsController.createVendor);
router.patch('/:id', vendorsController.updateVendor);
router.delete('/:id', vendorsController.deleteVendor);

export default router;
