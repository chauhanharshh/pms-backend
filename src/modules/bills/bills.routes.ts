import { Router } from 'express';
import { BillsController } from './bills.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const billsController = new BillsController();

router.use(authenticate);

router.get('/', billsController.getBills.bind(billsController));
router.get('/:id', billsController.getBillById.bind(billsController));
router.put('/:id', billsController.updateBill.bind(billsController));

export default router;
