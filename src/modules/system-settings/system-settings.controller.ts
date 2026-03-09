import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSystemSettings = async (req: Request, res: Response) => {
    try {
        // There should only be one system settings record
        let settings = await prisma.systemSettings.findFirst();

        if (!settings) {
            // Create default settings if they don't exist
            settings = await prisma.systemSettings.create({
                data: {
                    globalSidebarColor: '#1F2937',
                    globalHeaderColor: '#ffffff',
                    globalAccentColor: '#C6A75E',
                }
            });
        }

        res.status(200).json({
            status: 'success',
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch system settings',
        });
    }
};

export const updateSystemSettings = async (req: Request, res: Response) => {
    try {
        const { globalSidebarColor, globalHeaderColor, globalAccentColor } = req.body;

        let settings = await prisma.systemSettings.findFirst();

        if (settings) {
            settings = await prisma.systemSettings.update({
                where: { id: settings.id },
                data: {
                    globalSidebarColor: globalSidebarColor !== undefined ? globalSidebarColor : settings.globalSidebarColor,
                    globalHeaderColor: globalHeaderColor !== undefined ? globalHeaderColor : settings.globalHeaderColor,
                    globalAccentColor: globalAccentColor !== undefined ? globalAccentColor : settings.globalAccentColor,
                }
            });
        } else {
            settings = await prisma.systemSettings.create({
                data: {
                    globalSidebarColor: globalSidebarColor || '#1F2937',
                    globalHeaderColor: globalHeaderColor || '#ffffff',
                    globalAccentColor: globalAccentColor || '#C6A75E',
                }
            });
        }

        res.status(200).json({
            status: 'success',
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to update system settings',
        });
    }
};
