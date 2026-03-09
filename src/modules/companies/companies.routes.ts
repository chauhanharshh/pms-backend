import { Router } from 'express';
import { CompaniesController } from './companies.controller';
import { authenticate } from '../../middleware/authenticate';

import { tenantIsolation } from '../../middleware/tenantIsolation';
const router = Router();
const companiesController = new CompaniesController();

router.use(authenticate, tenantIsolation);

router.get('/', companiesController.getCompanies.bind(companiesController));
router.get('/:id', companiesController.getCompanyById.bind(companiesController));
router.post('/', companiesController.createCompany.bind(companiesController));
router.put('/:id', companiesController.updateCompany.bind(companiesController));
router.delete('/:id', companiesController.deleteCompany.bind(companiesController));
router.patch('/:id/toggle-status', companiesController.toggleStatus.bind(companiesController));

export default router;
