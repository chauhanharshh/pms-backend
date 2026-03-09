import { Router } from 'express';
import { InvoicesController } from './invoices.controller';
import { authenticate } from '../../middleware/authenticate';

import { tenantIsolation } from '../../middleware/tenantIsolation';
const router = Router();
const invoicesController = new InvoicesController();

router.use(authenticate, tenantIsolation);

router.get('/', invoicesController.getInvoices.bind(invoicesController));
router.get('/:id', invoicesController.getInvoiceById.bind(invoicesController));
router.post('/', invoicesController.generateInvoice.bind(invoicesController));
router.post('/:id/pay', invoicesController.payInvoice.bind(invoicesController));
router.patch('/:id/status', invoicesController.updateStatus.bind(invoicesController));

export default router;
