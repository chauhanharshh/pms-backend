import { Router } from 'express';
import { GstReportsController } from './gst-reports.controller';
import { authenticate } from '../../middleware/authenticate';
import { tenantIsolation } from '../../middleware/tenantIsolation';

const router = Router();
const gstReportsController = new GstReportsController();

router.use(authenticate, tenantIsolation);

router.get('/summary', gstReportsController.getSummaryReport.bind(gstReportsController));
router.get('/room', gstReportsController.getRoomGstReport.bind(gstReportsController));
router.get('/restaurant', gstReportsController.getRestaurantGstReport.bind(gstReportsController));
router.get('/misc', gstReportsController.getMiscGstReport.bind(gstReportsController));
router.get('/invoice-wise', gstReportsController.getInvoiceWiseReport.bind(gstReportsController));
router.get('/sac-hsn', gstReportsController.getSacHsnReport.bind(gstReportsController));

export default router;
