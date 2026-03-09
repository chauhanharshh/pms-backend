import { Router } from 'express';
import { DayClosingController } from './day-closing.controller';
import { authenticate } from '../../middleware/authenticate';
import { tenantIsolation } from '../../middleware/tenantIsolation';

const router = Router();
const controller = new DayClosingController();

// All routes require authentication and tenant isolation
router.use(authenticate);
router.use(tenantIsolation);

router.get('/records', controller.getClosingRecords);
router.get('/preview', controller.getPreview);
router.post('/close', controller.closeDay);
router.delete('/last', controller.deleteLastClosing);
router.get('/pending-dates', controller.getPendingDates);
router.get('/pending-processes', controller.getPendingProcesses);

export default router;
