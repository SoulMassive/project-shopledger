import { pool } from '../../config/db.js';
import { ok } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';


// GET /api/reports/summary
export const getSummaryReport = asyncHandler(async (req, res) => {
  // Calculate various stats from isolated schema
  const { rows: custStats } = await pool.query(
    `SELECT 
       COUNT(*)::int AS customers,
       COALESCE(SUM(balance) FILTER (WHERE balance > 0), 0) AS receivable,
       COALESCE(SUM(ABS(balance)) FILTER (WHERE balance < 0), 0) AS payable
     FROM "${req.tenantSchema}".customers`
  );

  const { rows: cashStats } = await pool.query(
    `SELECT 
       COALESCE(SUM(amount) FILTER (WHERE type = 'cash_in'), 0) AS total_in,
       COALESCE(SUM(amount) FILTER (WHERE type = 'cash_out'), 0) AS total_out
     FROM "${req.tenantSchema}".cashbook`
  );

  const { rows: recentActivity } = await pool.query(
    `SELECT type, amount, entry_date as date, 'cash' as source FROM "${req.tenantSchema}".cashbook
     UNION ALL
     SELECT type, amount, txn_date as date, 'ledger' as source FROM "${req.tenantSchema}".transactions
     ORDER BY date DESC LIMIT 10`
  );

  ok(res, {
    ledger: custStats[0],
    cash: cashStats[0],
    recent: recentActivity
  });
});

// GET /api/reports/download-pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
export const downloadPDFReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const shopName = req.shop?.name || 'My Shop';

  if (!from || !to) {
    return res.status(400).send('From and To dates are required');
  }

  // 1. Fetch data in range
  const { rows: ledgerRows } = await pool.query(
    `SELECT 
       COALESCE(SUM(amount) FILTER (WHERE type = 'cash_in'), 0) AS total_in,
       COALESCE(SUM(amount) FILTER (WHERE type = 'cash_out'), 0) AS total_out
     FROM "${req.tenantSchema}".transactions
     WHERE txn_date >= $1 AND txn_date <= $2`,
     [from, to]
  );

  const { rows: cashRows } = await pool.query(
    `SELECT 
       COALESCE(SUM(amount) FILTER (WHERE type = 'cash_in'), 0) AS total_in,
       COALESCE(SUM(amount) FILTER (WHERE type = 'cash_out'), 0) AS total_out
     FROM "${req.tenantSchema}".cashbook
     WHERE entry_date >= $1 AND entry_date <= $2`,
     [from, to]
  );

  const { rows: activity } = await pool.query(
    `SELECT type, amount, entry_date as date, 'cash' as source, note FROM "${req.tenantSchema}".cashbook WHERE entry_date >= $1 AND entry_date <= $2
     UNION ALL
     SELECT type, amount, txn_date as date, 'ledger' as source, note FROM "${req.tenantSchema}".transactions WHERE txn_date >= $1 AND txn_date <= $2
     ORDER BY date ASC`,
     [from, to]
  );

  // 2. Generate PDF
  let PDFDocument;
  try {
    const pdfkit = await import('pdfkit');
    PDFDocument = pdfkit.default;
  } catch (err) {
    return res.status(503).send('PDF Engine is still heating up (installing). Please try again in a minute.');
  }

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Financial_Report_${from}_to_${to}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fillColor('#0F172A').fontSize(24).font('Helvetica-Bold').text(shopName, { align: 'center' });
  doc.fillColor('#64748B').fontSize(12).font('Helvetica').text('Financial Summary Report', { align: 'center' });
  doc.fontSize(10).text(`Period: ${from} to ${to}`, { align: 'center' }).moveDown(2);

  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(2);

  // Summary Grid
  const summaryY = doc.y;
  doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('Summary Metrics').moveDown(1);
  
  const colWidth = 250;
  doc.fontSize(10).font('Helvetica-Bold').text('Cashbook Stats', 50, doc.y);
  doc.font('Helvetica').text(`Total In: Rs. ${Number(cashRows[0].total_in).toLocaleString()}`);
  doc.text(`Total Out: Rs. ${Number(cashRows[0].total_out).toLocaleString()}`);
  doc.text(`Balance: Rs. ${(Number(cashRows[0].total_in) - Number(cashRows[0].total_out)).toLocaleString()}`).moveDown(1);

  doc.font('Helvetica-Bold').text('Ledger Stats', 50, doc.y);
  doc.font('Helvetica').text(`Total Collections: Rs. ${Number(ledgerRows[0].total_in).toLocaleString()}`);
  doc.text(`Total Payments: Rs. ${Number(ledgerRows[0].total_out).toLocaleString()}`);
  doc.text(`Balance: Rs. ${(Number(ledgerRows[0].total_in) - Number(ledgerRows[0].total_out)).toLocaleString()}`).moveDown(2);

  const netResult = (Number(cashRows[0].total_in) + Number(ledgerRows[0].total_in)) - (Number(cashRows[0].total_out) + Number(ledgerRows[0].total_out));
  doc.fillColor(netResult >= 0 ? '#059669' : '#DC2626').fontSize(16).font('Helvetica-Bold').text(`Net Cash Result: Rs. ${netResult.toLocaleString()}`, 50, doc.y).moveDown(2);

  doc.strokeColor('#F1F5F9').moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(2);

  // Activity List
  doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('Transaction Timeline').moveDown(1);
  
  // Table Header
  const headerY = doc.y;
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('Date', 50, headerY);
  doc.text('Source', 120, headerY);
  doc.text('Type', 180, headerY);
  doc.text('Amount', 250, headerY);
  doc.text('Note', 330, headerY);
  doc.moveDown(0.5);
  doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);

  doc.font('Helvetica').fontSize(8);
  activity.forEach(row => {
    if (doc.y > 700) doc.addPage();
    const currentY = doc.y;
    doc.fillColor('#64748B').text(new Date(row.date).toLocaleDateString(), 50, currentY);
    doc.text(row.source.toUpperCase(), 120, currentY);
    doc.fillColor(row.type === 'cash_in' ? '#059669' : '#DC2626').text(row.type, 180, currentY);
    doc.fillColor('#0F172A').text(`Rs. ${Number(row.amount).toLocaleString()}`, 250, currentY);
    doc.fillColor('#94A3B8').text(row.note || '-', 330, currentY, { width: 220 });
    doc.moveDown();
  });

  doc.end();
});

// GET /api/reports/data?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getReportData = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return ok(res, {}, 400);
  }

  // 1. Fetch data in range
  const { rows: ledgerRows } = await pool.query(
    `SELECT 
       COALESCE(SUM(amount) FILTER (WHERE type = 'cash_in'), 0) AS total_in,
       COALESCE(SUM(amount) FILTER (WHERE type = 'cash_out'), 0) AS total_out
     FROM "${req.tenantSchema}".transactions
     WHERE txn_date >= $1 AND txn_date <= $2`,
     [from, to]
  );

  const { rows: cashRows } = await pool.query(
    `SELECT 
       COALESCE(SUM(amount) FILTER (WHERE type = 'cash_in'), 0) AS total_in,
       COALESCE(SUM(amount) FILTER (WHERE type = 'cash_out'), 0) AS total_out
     FROM "${req.tenantSchema}".cashbook
     WHERE entry_date >= $1 AND entry_date <= $2`,
     [from, to]
  );

  const { rows: activity } = await pool.query(
    `SELECT type, amount, entry_date as date, 'cash' as source, note FROM "${req.tenantSchema}".cashbook WHERE entry_date >= $1 AND entry_date <= $2
     UNION ALL
     SELECT type, amount, txn_date as date, 'ledger' as source, note FROM "${req.tenantSchema}".transactions WHERE txn_date >= $1 AND txn_date <= $2
     ORDER BY date ASC`,
     [from, to]
  );

  ok(res, {
    shopName: req.shop?.name || 'My Shop',
    period: { from, to },
    summary: {
      cash: cashRows[0],
      ledger: ledgerRows[0],
      total_in: Number(cashRows[0].total_in) + Number(ledgerRows[0].total_in),
      total_out: Number(cashRows[0].total_out) + Number(ledgerRows[0].total_out),
      net: (Number(cashRows[0].total_in) + Number(ledgerRows[0].total_in)) - (Number(cashRows[0].total_out) + Number(ledgerRows[0].total_out))
    },
    activity
  });
});

