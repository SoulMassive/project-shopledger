import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { tenantSchema } from '../../middleware/tenantSchema.js';
import { getSummaryReport, downloadPDFReport, getReportData } from './reports.controller.js';

const router = Router();
router.use(authenticate);
router.use(tenantSchema);

router.get('/summary', getSummaryReport);
router.get('/download-pdf', downloadPDFReport);
router.get('/data', getReportData);

export default router;
