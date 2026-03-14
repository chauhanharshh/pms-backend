import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { CompaniesService } from './companies.service';

const companiesService = new CompaniesService();

export class CompaniesController {
    async getCompanies(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
            // Admins can fetch all, frontdesk might only fetch active ones. Here we give options.
            const statusFilter = req.query.activeOnly === 'true' ? true : undefined;
            const companies = await companiesService.getCompaniesByHotel(hotelId, statusFilter);
            res.json({ status: 'success', data: companies });
        } catch (e) { next(e); }
    }

    async getCompanyById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
            const company = await companiesService.getCompanyById(req.params.id, hotelId);
            res.json({ status: 'success', data: company });
        } catch (e) { next(e); }
    }

    async createCompany(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;

            if (hotelId === 'all') {
                const companies = await companiesService.createCompanyForAllHotels(req.body, req.user!.userId);
                return res.status(201).json({ status: 'success', data: companies[0] }); // Return one for UI compatibility
            }

            const company = await companiesService.createCompany(hotelId, req.body, req.user!.userId);
            res.status(201).json({ status: 'success', data: company });
        } catch (e) { next(e); }
    }

    async updateCompany(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const company = await companiesService.updateCompany(req.params.id, hotelId, req.body, req.user!.userId);
            res.json({ status: 'success', data: company });
        } catch (e) { next(e); }
    }

    async deleteCompany(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
            await companiesService.deleteCompany(req.params.id, hotelId, req.user!.userId);
            res.json({ status: 'success', message: 'Company removed successfully' });
        } catch (e) { next(e); }
    }

    async toggleStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
            const company = await companiesService.toggleStatus(req.params.id, hotelId, req.user!.userId);
            res.json({ status: 'success', data: company });
        } catch (e) { next(e); }
    }
}
