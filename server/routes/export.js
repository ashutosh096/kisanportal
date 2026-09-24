import express from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import { query } from '../db.js';
import { authenticateToken, requireRole, getTeamAdminId } from '../middleware/auth.js';

const router = express.Router();

// ─── Font Setup Helper ───
function setupFonts(doc) {
  const fontCandidates = [
    { regular: 'C:/Windows/Fonts/segoeui.ttf', bold: 'C:/Windows/Fonts/segoeuib.ttf' },
    { regular: 'C:/Windows/Fonts/arial.ttf', bold: 'C:/Windows/Fonts/arialbd.ttf' },
    { regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' },
  ];

  let regularFont = 'Helvetica';
  let boldFont = 'Helvetica-Bold';

  for (const f of fontCandidates) {
    if (fs.existsSync(f.regular) && fs.existsSync(f.bold)) {
      try {
        doc.registerFont('AppFont', f.regular);
        doc.registerFont('AppFont-Bold', f.bold);
        regularFont = 'AppFont';
        boldFont = 'AppFont-Bold';
        break;
      } catch (err) {
        console.warn('Font register warning:', err.message);
      }
    }
  }

  return { regular: regularFont, bold: boldFont };
}

// ─── Format Date Helper ───
function formatDDMMYYYY(dateVal) {
  if (!dateVal) return '-';
  try {
    const clean = String(dateVal).trim().split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}-${month}-${d.getFullYear()}`;
    }
  } catch (e) {}
  return String(dateVal);
}

// ─── Safe String Truncate / Sanitize Helper ───
function cleanStr(val, fallback = '-') {
  if (val === null || val === undefined || val === '') return fallback;
  return String(val).trim();
}

// ─── Draw Page Header ───
function drawHeader(doc, fonts, title, subtitle) {
  doc.rect(35, 30, 525, 52).fill('#0d3c26');
  doc.fillColor('#ffffff').fontSize(16).font(fonts.bold).text(title, 48, 40, { width: 500 });
  doc.fontSize(8.5).font(fonts.regular).fillColor('#bbf7d0').text(subtitle, 48, 62, { width: 500 });
  doc.fillColor('#0f172a');
}

// ─── Draw Page Footer with Page Number ───
function drawFooter(doc, fonts, pageNum) {
  doc.fontSize(7.5).font(fonts.regular).fillColor('#94a3b8');
  doc.text(
    `KisanSurvey Official Export  •  Page ${pageNum}  •  Confidential`,
    35,
    800,
    { align: 'center', width: 525 }
  );
}

// ─── Draw Table Header ───
function drawTableHeader(doc, fonts, y, columns) {
  doc.rect(35, y, 525, 20).fill('#0d3c26');
  doc.fillColor('#ffffff').fontSize(8).font(fonts.bold);
  columns.forEach((col) => {
    doc.text(col.header, col.x, y + 6, {
      width: col.width,
      align: col.align || 'left',
    });
  });
  return y + 20;
}

// ─── GET /api/export/pdf - Standard PDF Report Export ───
router.get(
  '/pdf',
  authenticateToken,
  requireRole('admin', 'coadmin', 'manager', 'viewer', 'superadmin'),
  async (req, res) => {
    const { type, location, surveyor, startDate, endDate } = req.query;
    const teamAdminId = getTeamAdminId(req.user);

    try {
      // 1. Fetch Farmers Data
      let farmerSql = `
        SELECT f.*, u.name as surveyor_display_name,
               adm.name as admin_name,
               s2a.crop, s2a.area, s2a.season_name
        FROM farmers f
        LEFT JOIN users u ON u.id = f.surveyor_id
        LEFT JOIN users adm ON adm.id = COALESCE(f.admin_id, u.admin_id)
        LEFT JOIN form2a_seasonal s2a ON s2a.farmer_id = f.farmer_id AND s2a.is_active = true
        WHERE 1=1
      `;
      const farmerParams = [];

      if (teamAdminId) {
        farmerSql += ' AND (f.admin_id = ? OR f.surveyor_id IN (SELECT id FROM users WHERE admin_id = ?))';
        farmerParams.push(teamAdminId, teamAdminId);
      }
      if (location) {
        farmerSql += ' AND (LOWER(f.location) LIKE LOWER(?) OR LOWER(f.name) LIKE LOWER(?))';
        farmerParams.push(`%${location}%`, `%${location}%`);
      }
      if (surveyor) {
        farmerSql += ' AND (LOWER(f.surveyor_name) LIKE LOWER(?) OR LOWER(u.name) LIKE LOWER(?))';
        farmerParams.push(`%${surveyor}%`, `%${surveyor}%`);
      }
      if (startDate) {
        farmerSql += ' AND (f.date >= ? OR f.created_at >= ?::timestamp)';
        farmerParams.push(startDate, `${startDate} 00:00:00`);
      }
      if (endDate) {
        farmerSql += ' AND (f.date <= ? OR f.created_at <= ?::timestamp)';
        farmerParams.push(endDate, `${endDate} 23:59:59`);
      }
      farmerSql += ' ORDER BY f.id DESC LIMIT 1500';
      const farmers = await query(farmerSql, farmerParams);

      // 2. Fetch Form2b Visits Data
      let visitSql = `
        SELECT v.*, f.name as farmer_name, f.location as farmer_location,
               u.name as surveyor_display_name
        FROM form2b_visits v
        JOIN farmers f ON v.farmer_id = f.farmer_id
        LEFT JOIN users u ON u.id = v.surveyor_id
        WHERE 1=1
      `;
      const visitParams = [];

      if (teamAdminId) {
        visitSql += ' AND (v.admin_id = ? OR f.admin_id = ?)';
        visitParams.push(teamAdminId, teamAdminId);
      }
      if (location) {
        visitSql += ' AND (LOWER(f.location) LIKE LOWER(?) OR LOWER(f.name) LIKE LOWER(?))';
        visitParams.push(`%${location}%`, `%${location}%`);
      }
      if (surveyor) {
        visitSql += ' AND (LOWER(v.surveyor_name) LIKE LOWER(?) OR LOWER(u.name) LIKE LOWER(?))';
        visitParams.push(`%${surveyor}%`, `%${surveyor}%`);
      }
      if (startDate) {
        visitSql += ' AND (v.visit_date >= ?::timestamp)';
        visitParams.push(`${startDate} 00:00:00`);
      }
      if (endDate) {
        visitSql += ' AND (v.visit_date <= ?::timestamp)';
        visitParams.push(`${endDate} 23:59:59`);
      }
      visitSql += ' ORDER BY v.visit_date DESC, v.id DESC LIMIT 1500';
      const visits = await query(visitSql, visitParams);

      // 3. Initialize PDFKit document
      const doc = new PDFDocument({ margin: 35, size: 'A4', bufferPages: true });
      const fonts = setupFonts(doc);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Farmer_Survey_Report_${new Date().toISOString().split('T')[0]}.pdf`
      );
      doc.pipe(res);

      let pageCount = 1;

      // Header Banner
      drawHeader(
        doc,
        fonts,
        'KisanSurvey Analytics & Data Report',
        `Exported by: ${req.user.name || req.user.username} (${req.user.role.toUpperCase()})  •  Date: ${new Date().toLocaleString('en-IN')}`
      );

      let y = 92;

      // Filter & Statistics Pill Summary Bar
      doc.rect(35, y, 525, 34).fill('#f0fdf4');
      doc.strokeColor('#bbf7d0').lineWidth(1).rect(35, y, 525, 34).stroke();

      doc.fillColor('#0d3c26').fontSize(8.5).font(fonts.bold).text('REPORT SUMMARY & FILTERS', 45, y + 6);
      doc.fontSize(7.5).font(fonts.regular).fillColor('#334155');
      doc.text(
        `Total Farmers: ${farmers.length}  |  Total Visits: ${visits.length}  |  Location: ${location || 'All'}  |  Date Range: ${startDate || 'All'} to ${endDate || 'All'}`,
        45,
        y + 19,
        { width: 505 }
      );

      y += 44;

      // ─── SECTION 1: Farmer Registrations ───
      if (type !== 'surveys') {
        doc.fillColor('#0d3c26').fontSize(11).font(fonts.bold).text('1. Farmer Registrations (Master Database)', 35, y);
        y += 16;

        const farmerCols = [
          { header: 'Farmer ID', x: 40, width: 70 },
          { header: 'Farmer Name & Contact', x: 115, width: 125 },
          { header: 'Village / Location', x: 245, width: 110 },
          { header: 'Crop & Land Area', x: 360, width: 105 },
          { header: 'Surveyor / Admin', x: 470, width: 85 },
        ];

        y = drawTableHeader(doc, fonts, y, farmerCols);

        if (farmers.length === 0) {
          doc.rect(35, y, 525, 22).fill('#ffffff');
          doc.fillColor('#64748b').fontSize(8).font(fonts.regular).text('No farmer records match the specified filters.', 45, y + 6);
          y += 26;
        } else {
          farmers.forEach((f, idx) => {
            // Dynamic text calculation to prevent overlaps
            const nameContact = `${cleanStr(f.name)}\nPh: ${cleanStr(f.contact)}`;
            const locText = cleanStr(f.location);
            const cropArea = `${cleanStr(f.crop || 'Crop: -')}\nArea: ${cleanStr(f.area || '-')}`;
            const surveyorText = `${cleanStr(f.surveyor_name || f.surveyor_display_name || '-')}\n${cleanStr(f.admin_name || '')}`;

            doc.fontSize(7.5).font(fonts.regular);
            const h1 = doc.heightOfString(nameContact, { width: 125 });
            const h2 = doc.heightOfString(locText, { width: 110 });
            const h3 = doc.heightOfString(cropArea, { width: 105 });
            const h4 = doc.heightOfString(surveyorText, { width: 85 });
            const rowHeight = Math.max(h1, h2, h3, h4, 18) + 8;

            if (y + rowHeight > 780) {
              doc.addPage();
              pageCount++;
              drawHeader(doc, fonts, 'KisanSurvey Analytics & Data Report', 'Continued...');
              y = 92;
              y = drawTableHeader(doc, fonts, y, farmerCols);
            }

            // Alternating Row Background
            const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(35, y, 525, rowHeight).fill(bgColor);
            doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(35, y, 525, rowHeight).stroke();

            // Row Content
            doc.fillColor('#0f172a').fontSize(7.5).font(fonts.bold).text(cleanStr(f.farmer_id), 40, y + 4, { width: 70 });
            doc.fillColor('#1e293b').font(fonts.regular).text(nameContact, 115, y + 4, { width: 125 });
            doc.text(locText, 245, y + 4, { width: 110 });
            doc.text(cropArea, 360, y + 4, { width: 105 });
            doc.fillColor('#475569').text(surveyorText, 470, y + 4, { width: 85 });

            y += rowHeight;
          });
        }
        y += 18;
      }

      // ─── SECTION 2: Farm Visits Logbook ───
      if (type !== 'farmers') {
        if (y > 680) {
          doc.addPage();
          pageCount++;
          drawHeader(doc, fonts, 'KisanSurvey Analytics & Data Report', 'Continued...');
          y = 92;
        }

        doc.fillColor('#0d3c26').fontSize(11).font(fonts.bold).text('2. Farm Visits & Crop Inspection Logbook', 35, y);
        y += 16;

        const visitCols = [
          { header: 'Farmer & Date', x: 40, width: 105 },
          { header: 'Plowing / Pesticide', x: 150, width: 130 },
          { header: 'Fertilizer / Supplement', x: 285, width: 140 },
          { header: 'Irrigation & Weeding', x: 430, width: 125 },
        ];

        y = drawTableHeader(doc, fonts, y, visitCols);

        if (visits.length === 0) {
          doc.rect(35, y, 525, 22).fill('#ffffff');
          doc.fillColor('#64748b').fontSize(8).font(fonts.regular).text('No farm visit records match the specified filters.', 45, y + 6);
          y += 26;
        } else {
          visits.forEach((v, idx) => {
            const vDate = formatDDMMYYYY(v.visit_date);
            const farmerCell = `${cleanStr(v.farmer_name)}\nID: ${cleanStr(v.farmer_id)}\nDate: ${vDate}`;
            const plowPest = `Plowing: ${v.plowing === 'yes' ? `Yes (${cleanStr(v.plowing_count || 1)}x)` : 'No'}\nPesticide: ${v.pesticide_used === 'yes' ? cleanStr(v.pesticide_brand || 'Yes') : 'No'}`;
            const fertSupp = `Fertilizer: ${v.fertilizer_used === 'yes' ? cleanStr(v.fertilizer_brand || 'Yes') : 'No'}\nSupp: ${v.supplement_used === 'yes' ? cleanStr(v.supplement_brand || 'Yes') : 'No'}`;
            const irrigWeed = `Irrigation: ${v.irrigation_done === 'yes' ? cleanStr(v.irrigation_type || 'Yes') : 'No'}\nWeeding: ${v.weeding_done === 'yes' ? 'Yes' : 'No'}`;

            doc.fontSize(7.5).font(fonts.regular);
            const h1 = doc.heightOfString(farmerCell, { width: 105 });
            const h2 = doc.heightOfString(plowPest, { width: 130 });
            const h3 = doc.heightOfString(fertSupp, { width: 140 });
            const h4 = doc.heightOfString(irrigWeed, { width: 125 });
            const rowHeight = Math.max(h1, h2, h3, h4, 22) + 8;

            if (y + rowHeight > 780) {
              doc.addPage();
              pageCount++;
              drawHeader(doc, fonts, 'KisanSurvey Analytics & Data Report', 'Continued...');
              y = 92;
              y = drawTableHeader(doc, fonts, y, visitCols);
            }

            const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(35, y, 525, rowHeight).fill(bgColor);
            doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(35, y, 525, rowHeight).stroke();

            doc.fillColor('#0f172a').fontSize(7.5).font(fonts.bold).text(farmerCell, 40, y + 4, { width: 105 });
            doc.fillColor('#1e293b').font(fonts.regular).text(plowPest, 150, y + 4, { width: 130 });
            doc.text(fertSupp, 285, y + 4, { width: 140 });
            doc.text(irrigWeed, 430, y + 4, { width: 125 });

            y += rowHeight;
          });
        }
      }

      // Add page footers to all buffered pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, fonts, `${i + 1} of ${range.count}`);
      }

      doc.end();
    } catch (err) {
      console.error('PDF export error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate PDF report: ' + err.message });
      }
    }
  }
);

// ─── GET /api/export/pdf-matrix - Export Per-Farmer PDF Matrix Report ───
router.get(
  '/pdf-matrix',
  authenticateToken,
  requireRole('admin', 'coadmin', 'manager', 'viewer', 'superadmin'),
  async (req, res) => {
    const teamAdminId = getTeamAdminId(req.user);

    try {
      let farmerSql = `
        SELECT f.*, u.name as surveyor_display_name, adm.name as admin_name
        FROM farmers f
        LEFT JOIN users u ON u.id = f.surveyor_id
        LEFT JOIN users adm ON adm.id = COALESCE(f.admin_id, u.admin_id)
        WHERE 1=1
      `;
      const params = [];
      if (teamAdminId) {
        farmerSql += ' AND (f.admin_id = ? OR f.surveyor_id IN (SELECT id FROM users WHERE admin_id = ?))';
        params.push(teamAdminId, teamAdminId);
      }
      farmerSql += ' ORDER BY f.id ASC LIMIT 500';
      const farmers = await query(farmerSql, params);

      const doc = new PDFDocument({ margin: 35, size: 'A4', bufferPages: true });
      const fonts = setupFonts(doc);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Farmer_Matrix_Logbook_${new Date().toISOString().split('T')[0]}.pdf`
      );
      doc.pipe(res);

      let isFirstPage = true;

      for (const farmer of farmers) {
        const visits = await query(
          'SELECT * FROM form2b_visits WHERE farmer_id = ? ORDER BY visit_date ASC, id ASC',
          [farmer.farmer_id]
        );

        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        drawHeader(
          doc,
          fonts,
          'Farm Visit & Activity Matrix Logbook',
          `Official Field Verification Logbook  •  Date: ${formatDDMMYYYY(new Date())}`
        );

        let y = 92;

        // Farmer Info Banner Card
        doc.rect(35, y, 525, 48).fill('#f0fdf4');
        doc.strokeColor('#15803d').lineWidth(1.2).rect(35, y, 525, 48).stroke();

        doc.fillColor('#0d3c26').fontSize(12).font(fonts.bold).text(`Farmer: ${cleanStr(farmer.name)}`, 48, y + 8);
        doc.fontSize(8.5).font(fonts.regular).fillColor('#15803d').text(`ID: ${cleanStr(farmer.farmer_id)}`, 48, y + 26);

        doc.fontSize(8).font(fonts.regular).fillColor('#334155');
        doc.text(`Village: ${cleanStr(farmer.location)}`, 240, y + 8, { width: 150 });
        doc.text(`Contact: ${cleanStr(farmer.contact)}`, 240, y + 24, { width: 150 });

        doc.text(`Surveyor: ${cleanStr(farmer.surveyor_name || farmer.surveyor_display_name)}`, 400, y + 8, { width: 150 });
        doc.text(`Admin: ${cleanStr(farmer.admin_name || 'Central Admin')}`, 400, y + 24, { width: 150 });

        y += 60;

        if (visits.length === 0) {
          doc.rect(35, y, 525, 30).fill('#ffffff');
          doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(35, y, 525, 30).stroke();
          doc.fillColor('#94a3b8').fontSize(9).font(fonts.regular).text('No farm visit surveys logged yet for this farmer.', 48, y + 10);
          continue;
        }

        // Section Title
        doc.fillColor('#0d3c26').fontSize(10.5).font(fonts.bold).text(`Visit Operations Matrix (${visits.length} Total Visits Logged)`, 35, y);
        y += 16;

        // Structured Matrix Rows
        const matrixRows = [
          { label: 'Visit Date', getVal: (v) => formatDDMMYYYY(v.visit_date) },
          { label: 'Ploughing / Deep Till', getVal: (v) => (v.plowing === 'yes' ? `Yes (${cleanStr(v.plowing_count || 1)}x)` : 'No') },
          { label: 'Pesticide Application', getVal: (v) => (v.pesticide_used === 'yes' ? `${cleanStr(v.pesticide_brand || 'Applied')} (${cleanStr(v.pesticide_qty || '-')})` : 'No') },
          { label: 'Bio / Supplement Used', getVal: (v) => (v.supplement_used === 'yes' ? `${cleanStr(v.supplement_brand || 'Applied')} (${cleanStr(v.supplement_qty || '-')})` : 'No') },
          { label: 'Fertilizer Application', getVal: (v) => (v.fertilizer_used === 'yes' ? `${cleanStr(v.fertilizer_brand || 'Applied')} (${cleanStr(v.fertilizer_qty || '-')})` : 'No') },
          { label: 'Irrigation Operation', getVal: (v) => (v.irrigation_done === 'yes' ? `${cleanStr(v.irrigation_type || 'Yes')} (${cleanStr(v.irrigation_source || '-')})` : 'No') },
          { label: 'Weeding / De-weeding', getVal: (v) => (v.weeding_done === 'yes' ? 'Yes' : 'No') },
          { label: 'Crop Growth Stage', getVal: (v) => cleanStr(v.crop_stage || v.growth_stage || 'Inspected') },
        ];

        // Table Header for Matrix
        doc.rect(35, y, 525, 20).fill('#0d3c26');
        doc.fillColor('#ffffff').fontSize(8).font(fonts.bold);
        doc.text('Activity / Operation', 42, y + 6, { width: 140 });
        doc.text('Visit Logs Record Breakdown', 190, y + 6, { width: 360 });
        y += 20;

        matrixRows.forEach((rowDef, rIdx) => {
          const visitLogSummary = visits
            .map((v, vIdx) => `[V${vIdx + 1} (${formatDDMMYYYY(v.visit_date)})]: ${rowDef.getVal(v)}`)
            .join('  •  ');

          doc.fontSize(7.5).font(fonts.regular);
          const textHeight = Math.max(doc.heightOfString(visitLogSummary, { width: 360 }), 16) + 8;

          if (y + textHeight > 780) {
            doc.addPage();
            drawHeader(doc, fonts, 'Farm Visit & Activity Matrix Logbook', `Farmer: ${cleanStr(farmer.name)} (Continued)`);
            y = 92;
            doc.rect(35, y, 525, 20).fill('#0d3c26');
            doc.fillColor('#ffffff').fontSize(8).font(fonts.bold);
            doc.text('Activity / Operation', 42, y + 6, { width: 140 });
            doc.text('Visit Logs Record Breakdown', 190, y + 6, { width: 360 });
            y += 20;
          }

          const bgColor = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(35, y, 525, textHeight).fill(bgColor);
          doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(35, y, 525, textHeight).stroke();

          doc.fillColor('#0f172a').fontSize(7.5).font(fonts.bold).text(rowDef.label, 42, y + 4, { width: 140 });
          doc.fillColor('#334155').font(fonts.regular).text(visitLogSummary, 190, y + 4, { width: 360 });

          y += textHeight;
        });
      }

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, fonts, `${i + 1} of ${range.count}`);
      }

      doc.end();
    } catch (err) {
      console.error('PDF matrix export error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate PDF matrix report: ' + err.message });
      }
    }
  }
);

// ─── GET /api/export/farmer/:farmer_id/pdf - Export Single Farmer Profile PDF ───
router.get('/farmer/:farmer_id/pdf', authenticateToken, async (req, res) => {
  const { farmer_id } = req.params;

  try {
    const farmers = await query(
      `SELECT f.*, u.name as surveyor_display_name, adm.name as admin_name,
              s2a.crop, s2a.area, s2a.season_name, s2a.variety, s2a.sowing_date,
              s2a.harvest_date, s2a.expected_yield, s2a.soil_testing, s2a.water_testing,
              s2a.ownership, s2a.total_land
       FROM farmers f
       LEFT JOIN users u ON u.id = f.surveyor_id
       LEFT JOIN users adm ON adm.id = COALESCE(f.admin_id, u.admin_id)
       LEFT JOIN form2a_seasonal s2a ON s2a.farmer_id = f.farmer_id AND s2a.is_active = true
       WHERE f.farmer_id = ?`,
      [farmer_id]
    );

    if (!farmers || farmers.length === 0) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const farmer = farmers[0];
    const visits = await query(
      'SELECT * FROM form2b_visits WHERE farmer_id = ? ORDER BY visit_date DESC, id DESC',
      [farmer_id]
    );

    const doc = new PDFDocument({ margin: 35, size: 'A4', bufferPages: true });
    const fonts = setupFonts(doc);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Farmer_Profile_${farmer_id}.pdf`);
    doc.pipe(res);

    drawHeader(
      doc,
      fonts,
      'KisanPortal • Official Farmer Profile & Survey Report',
      `Farmer ID: ${farmer_id}  •  Exported on: ${new Date().toLocaleString('en-IN')}`
    );

    let y = 92;

    // SECTION: Primary Farmer Master Info Card
    doc.rect(35, y, 525, 75).fill('#f0fdf4');
    doc.strokeColor('#15803d').lineWidth(1.2).rect(35, y, 525, 75).stroke();

    doc.fillColor('#0d3c26').fontSize(14).font(fonts.bold).text(cleanStr(farmer.name), 48, y + 10);
    doc.fontSize(8.5).font(fonts.regular).fillColor('#15803d').text(`Official ID: ${farmer_id}  |  Registration Date: ${formatDDMMYYYY(farmer.date)}`, 48, y + 28);

    doc.fontSize(8).font(fonts.regular).fillColor('#334155');
    doc.text(`Mobile: ${cleanStr(farmer.contact)}`, 48, y + 46);
    doc.text(`Village: ${cleanStr(farmer.location)}`, 180, y + 46);
    doc.text(`Total Land: ${cleanStr(farmer.total_land || '-')}`, 330, y + 46);
    doc.text(`Surveyor: ${cleanStr(farmer.surveyor_name || farmer.surveyor_display_name || '-')}`, 430, y + 46);

    y += 88;

    // SECTION: Form 2A Seasonal Crop Details
    doc.fillColor('#0d3c26').fontSize(11).font(fonts.bold).text('Form 2A: Seasonal Crop Baseline', 35, y);
    y += 16;

    doc.rect(35, y, 525, 50).fill('#f8fafc');
    doc.strokeColor('#e2e8f0').lineWidth(1).rect(35, y, 525, 50).stroke();

    doc.fontSize(8).font(fonts.regular).fillColor('#1e293b');
    doc.text(`Season: ${cleanStr(farmer.season_name || 'Kharif 2026')}`, 48, y + 8);
    doc.text(`Primary Crop: ${cleanStr(farmer.crop || '-')}`, 180, y + 8);
    doc.text(`Crop Area: ${cleanStr(farmer.area || '-')}`, 330, y + 8);
    doc.text(`Seed Variety: ${cleanStr(farmer.variety || '-')}`, 430, y + 8);

    doc.text(`Sowing Date: ${formatDDMMYYYY(farmer.sowing_date)}`, 48, y + 28);
    doc.text(`Expected Harvest: ${formatDDMMYYYY(farmer.harvest_date)}`, 180, y + 28);
    doc.text(`Exp. Yield: ${cleanStr(farmer.expected_yield || '-')}`, 330, y + 28);
    doc.text(`Soil/Water Tested: ${cleanStr(farmer.soil_testing)} / ${cleanStr(farmer.water_testing)}`, 430, y + 28);

    y += 62;

    // SECTION: Form 2B Visit Logbook History Table
    doc.fillColor('#0d3c26').fontSize(11).font(fonts.bold).text(`Form 2B: Farm Visit Inspections (${visits.length} Logs)`, 35, y);
    y += 16;

    const vCols = [
      { header: 'Visit Date & Stage', x: 40, width: 110 },
      { header: 'Plowing & Pesticides', x: 155, width: 130 },
      { header: 'Fertilizers & Supplements', x: 290, width: 135 },
      { header: 'Irrigation & Weeding', x: 430, width: 125 },
    ];

    y = drawTableHeader(doc, fonts, y, vCols);

    if (visits.length === 0) {
      doc.rect(35, y, 525, 24).fill('#ffffff');
      doc.fillColor('#94a3b8').fontSize(8.5).font(fonts.regular).text('No recurring farm visit surveys logged for this farmer.', 48, y + 6);
    } else {
      visits.forEach((v, idx) => {
        const vDateStage = `Date: ${formatDDMMYYYY(v.visit_date)}\nStage: ${cleanStr(v.crop_stage || v.growth_stage || 'Inspected')}`;
        const plowPest = `Plowing: ${v.plowing === 'yes' ? `Yes (${cleanStr(v.plowing_count || 1)}x)` : 'No'}\nPesticide: ${v.pesticide_used === 'yes' ? cleanStr(v.pesticide_brand || 'Applied') : 'No'}`;
        const fertSupp = `Fertilizer: ${v.fertilizer_used === 'yes' ? cleanStr(v.fertilizer_brand || 'Applied') : 'No'}\nSupp: ${v.supplement_used === 'yes' ? cleanStr(v.supplement_brand || 'Applied') : 'No'}`;
        const irrigWeed = `Irrigation: ${v.irrigation_done === 'yes' ? cleanStr(v.irrigation_type || 'Yes') : 'No'}\nWeeding: ${v.weeding_done === 'yes' ? 'Yes' : 'No'}`;

        doc.fontSize(7.5).font(fonts.regular);
        const h1 = doc.heightOfString(vDateStage, { width: 110 });
        const h2 = doc.heightOfString(plowPest, { width: 130 });
        const h3 = doc.heightOfString(fertSupp, { width: 135 });
        const h4 = doc.heightOfString(irrigWeed, { width: 125 });
        const rowHeight = Math.max(h1, h2, h3, h4, 20) + 8;

        if (y + rowHeight > 780) {
          doc.addPage();
          drawHeader(doc, fonts, 'KisanPortal • Official Farmer Profile', `Farmer: ${cleanStr(farmer.name)} (Continued)`);
          y = 92;
          y = drawTableHeader(doc, fonts, y, vCols);
        }

        const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(35, y, 525, rowHeight).fill(bgColor);
        doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(35, y, 525, rowHeight).stroke();

        doc.fillColor('#0f172a').fontSize(7.5).font(fonts.bold).text(vDateStage, 40, y + 4, { width: 110 });
        doc.fillColor('#1e293b').font(fonts.regular).text(plowPest, 155, y + 4, { width: 130 });
        doc.text(fertSupp, 290, y + 4, { width: 135 });
        doc.text(irrigWeed, 430, y + 4, { width: 125 });

        y += rowHeight;
      });
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      drawFooter(doc, fonts, `${i + 1} of ${range.count}`);
    }

    doc.end();
  } catch (err) {
    console.error('Single farmer PDF export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate farmer PDF report: ' + err.message });
    }
  }
});

export default router;
