import { Router } from 'express';
import { BillsController } from './bills.controller';
import { authenticate } from '../../middleware/authenticate';

import { tenantIsolation } from '../../middleware/tenantIsolation';
const router = Router();
const billsController = new BillsController();

router.use(authenticate, tenantIsolation);

router.get('/', billsController.getBills.bind(billsController));
router.get('/:id', billsController.getBillById.bind(billsController));
router.put('/:id', billsController.updateBill.bind(billsController));

export default router;
