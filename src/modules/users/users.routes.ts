import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/authenticate';
import { adminOnly, superAdminOnly } from '../../guards/authorization';

const router = Router();
const usersController = new UsersController();

router.use(authenticate);

// Super Admin routes for Admin account management
router.get('/admins', superAdminOnly, usersController.getAdminAccounts.bind(usersController));
router.post('/admins', superAdminOnly, usersController.createAdminAccount.bind(usersController));
router.put('/admins/:id', superAdminOnly, usersController.updateAdminAccount.bind(usersController));
router.patch('/admins/:id/reset-password', superAdminOnly, usersController.resetAdminPassword.bind(usersController));
router.patch('/admins/:id/status', superAdminOnly, usersController.setAdminStatus.bind(usersController));

router.get('/', usersController.getAllUsers.bind(usersController));
router.post('/', adminOnly, usersController.createUser.bind(usersController));
router.put('/:id', adminOnly, usersController.updateUser.bind(usersController));
router.delete('/:id', adminOnly, usersController.deleteUser.bind(usersController));

export default router;
