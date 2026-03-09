import { Router } from 'express';
import { VouchersController } from './vouchers.controller';
import { authenticate } from '../../middleware/authenticate';

import { tenantIsolation } from '../../middleware/tenantIsolation';
const router = Router();
const vouchersController = new VouchersController();

router.use(authenticate, tenantIsolation);

router.get('/', vouchersController.getVouchers.bind(vouchersController));
router.post('/', vouchersController.createVoucher.bind(vouchersController));
router.put('/:id', vouchersController.updateVoucher.bind(vouchersController));
router.delete('/:id', vouchersController.deleteVoucher.bind(vouchersController));

export default router;
