import express from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../db.js';
import { authenticateToken, requireRole, getTeamAdminId } from '../middleware/auth.js';

const router = express.Router();

// Helper: Format any date string to DD-MM-YYYY
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

// Helper: Draw horizontal table line in PDF
function drawTableLine(doc, y) {
  doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, y).lineTo(570, y).stroke();
}

// ─── GET /api/export/pdf - Standard PDF Report Export ───
router.get('/pdf', authenticateToken, requireRole('admin', 'coadmin', 'manager', 'viewer', 'superadmin'), async (req, res) => {
  const { type, location, surveyor, startDate, endDate } = req.query;
  const teamAdminId = getTeamAdminId(req.user);

  try {
    // 1. Fetch Farmers Data
    let farmerSql = `
      SELECT f.*, u.name as surveyor_display_name,
             s2a.crop, s2a.area, s2a.season_name
      FROM farmers f
      LEFT JOIN users u ON u.id = f.surveyor_id
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
      farmerSql += ' AND (f.date >= ? OR f.created_at::text >= ?)';
      farmerParams.push(startDate, startDate);
    }
    if (endDate) {
      farmerSql += ' AND (f.date <= ? OR f.created_at::text <= ?)';
      farmerParams.push(endDate, `${endDate} 23:59:59`);
    }
    farmerSql += ' ORDER BY f.id DESC';
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
      visitSql += ' AND (v.visit_date >= ? OR v.created_at::text >= ?)';
      visitParams.push(startDate, startDate);
    }
    if (endDate) {
      visitSql += ' AND (v.visit_date <= ? OR v.created_at::text <= ?)';
      visitParams.push(endDate, `${endDate} 23:59:59`);
    }
    visitSql += ' ORDER BY v.id DESC';
    const visits = await query(visitSql, visitParams);

    // 3. Create PDF Document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Farmer_Survey_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    // Header Banner
    doc.rect(40, 40, 515, 60).fill('#0d3c26');
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('KisanSurvey Analytics Report', 55, 52);
    doc.fontSize(9).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN')}  |  Exported by: ${req.user.name || req.user.username} (${req.user.role.toUpperCase()})`, 55, 76);

    let y = 115;

    // Filters Applied Summary
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Report Filters & Summary:', 40, y);
    y += 16;
    doc.fontSize(8.5).font('Helvetica').fillColor('#475569');
    doc.text(`Total Farmers: ${farmers.length}  |  Total Farm Visits Logged: ${visits.length}  |  Location Filter: ${location || 'All Villages'}  |  Date Range: ${startDate || 'All Time'} to ${endDate || 'Present'}`, 40, y);
    y += 24;

    // SECTION 1: Farmer Registrations (if not explicitly filtered to visits only)
    if (type !== 'surveys') {
      doc.fillColor('#0d3c26').fontSize(12).font('Helvetica-Bold').text('1. Farmer Registrations (Master Profile)', 40, y);
      y += 18;

      // Table Headers
      doc.rect(40, y, 515, 20).fill('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold');
      doc.text('Farmer ID', 45, y + 6, { width: 75 });
      doc.text('Farmer Name', 125, y + 6, { width: 110 });
      doc.text('Contact', 240, y + 6, { width: 80 });
      doc.text('Village / Location', 325, y + 6, { width: 110 });
      doc.text('Crop / Area', 440, y + 6, { width: 110 });
      y += 22;

      if (farmers.length === 0) {
        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('No registered farmers match the specified criteria.', 45, y);
        y += 20;
      } else {
        farmers.slice(0, 100).forEach((f) => {
          if (y > 750) {
            doc.addPage();
            y = 40;
          }
          doc.fillColor('#1e293b').fontSize(8).font('Helvetica');
          doc.text(f.farmer_id || 'N/A', 45, y, { width: 75 });
          doc.font('Helvetica-Bold').text(f.name || 'N/A', 125, y, { width: 110 });
          doc.font('Helvetica').text(f.contact || 'N/A', 240, y, { width: 80 });
          doc.text((f.location || 'N/A').substring(0, 25), 325, y, { width: 110 });
          doc.text(`${f.crop || 'N/A'} (${f.area || '-'})`, 440, y, { width: 110 });
          y += 16;
          drawTableLine(doc, y - 4);
        });
      }
      y += 15;
    }

    // SECTION 2: Farm Visits Logbook (if not explicitly filtered to farmers only)
    if (type !== 'farmers') {
      if (y > 650) {
        doc.addPage();
        y = 40;
      }
      doc.fillColor('#0d3c26').fontSize(12).font('Helvetica-Bold').text('2. Farm Visits Logbook (Recurring Surveys)', 40, y);
      y += 18;

      // Table Headers
      doc.rect(40, y, 515, 20).fill('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold');
      doc.text('Farmer ID & Name', 45, y + 6, { width: 120 });
      doc.text('Visit Date', 170, y + 6, { width: 75 });
      doc.text('Plowing / Pesticide', 250, y + 6, { width: 100 });
      doc.text('Fertilizer / Supplement', 355, y + 6, { width: 110 });
      doc.text('Irrigation / Weeding', 470, y + 6, { width: 80 });
      y += 22;

      if (visits.length === 0) {
        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('No farm visits recorded matching the specified criteria.', 45, y);
        y += 20;
      } else {
        visits.slice(0, 100).forEach((v) => {
          if (y > 740) {
            doc.addPage();
            y = 40;
          }
          const vDate = formatDDMMYYYY(v.visit_date);
          doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold');
          doc.text(v.farmer_name || v.farmer_id || 'N/A', 45, y, { width: 120 });
          doc.font('Helvetica').fontSize(7.5).text(`ID: ${v.farmer_id}`, 45, y + 10, { width: 120 });

          doc.fillColor('#1e293b').fontSize(8).text(vDate, 170, y, { width: 75 });

          const plowingText = v.plowing === 'yes' ? `Plow: Yes (${v.plowing_count || 1}x)` : 'Plow: No';
          const pestText = v.pesticide_used === 'yes' ? `Pest: ${v.pesticide_brand || 'Yes'}` : 'Pest: No';
          doc.text(`${plowingText}\n${pestText}`, 250, y, { width: 100 });

          const fertText = v.fertilizer_used === 'yes' ? `Fert: ${v.fertilizer_brand || 'Yes'}` : 'Fert: No';
          const suppText = v.supplement_used === 'yes' ? `Supp: ${v.supplement_brand || 'Yes'}` : 'Supp: No';
          doc.text(`${fertText}\n${suppText}`, 355, y, { width: 110 });

          const irrigText = v.irrigation_done === 'yes' ? `Irrig: ${v.irrigation_type || 'Yes'}` : 'Irrig: No';
          const weedText = v.weeding_done === 'yes' ? 'Weed: Yes' : 'Weed: No';
          doc.text(`${irrigText}\n${weedText}`, 470, y, { width: 80 });

          y += 26;
          drawTableLine(doc, y - 4);
        });
      }
    }

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF report' });
    }
  }
});

// ─── GET /api/export/pdf-matrix - Export Per-Farmer PDF Matrix Report ───
router.get('/pdf-matrix', authenticateToken, requireRole('admin', 'coadmin', 'manager', 'viewer', 'superadmin'), async (req, res) => {
  const teamAdminId = getTeamAdminId(req.user);

  try {
    let farmerSql = 'SELECT * FROM farmers WHERE 1=1';
    const params = [];
    if (teamAdminId) {
      farmerSql += ' AND (admin_id = ? OR surveyor_id IN (SELECT id FROM users WHERE admin_id = ?))';
      params.push(teamAdminId, teamAdminId);
    }
    farmerSql += ' ORDER BY id ASC';
    const farmers = await query(farmerSql, params);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Farmer_Matrix_Logbook_${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    // Title Header
    doc.rect(40, 40, 515, 55).fill('#0d3c26');
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('Farm Management Matrix Logbook', 55, 50);
    doc.fontSize(8.5).font('Helvetica').text(`Comprehensive per-farmer visit history matrix  |  Exported on ${formatDDMMYYYY(new Date())}`, 55, 72);

    let isFirstPage = true;

    for (const farmer of farmers) {
      const visits = await query(
        'SELECT * FROM form2b_visits WHERE farmer_id = ? ORDER BY visit_date ASC',
        [farmer.farmer_id]
      );

      if (!isFirstPage) doc.addPage();
      isFirstPage = false;

      let y = 110;
      doc.rect(40, y, 515, 28).fill('#f1f5f9');
      doc.fillColor('#0d3c26').fontSize(11).font('Helvetica-Bold').text(`Farmer: ${farmer.name} (ID: ${farmer.farmer_id})`, 50, y + 8);
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(`Location: ${farmer.location || 'N/A'}  |  Contact: ${farmer.contact || 'N/A'}`, 320, y + 9);
      y += 36;

      if (visits.length === 0) {
        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('No recurring farm visit surveys logged for this farmer.', 50, y);
        continue;
      }

      // Matrix Table Headers
      doc.rect(40, y, 515, 18).fill('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold');
      doc.text('Activity / Operation', 45, y + 5, { width: 170 });
      doc.text(`Recorded Visit Logs (${visits.length} Visits)`, 220, y + 5, { width: 330 });
      y += 22;

      const rowsDef = [
        { label: 'Ploughing Done', getValue: (v) => (v.plowing === 'yes' ? `Yes (${v.plowing_count || 1}x)` : 'No') },
        { label: 'Pesticide Applied', getValue: (v) => (v.pesticide_used === 'yes' ? `${v.pesticide_brand || 'Yes'} (${v.pesticide_qty || '-'})` : 'No') },
        { label: 'Supplement Applied', getValue: (v) => (v.supplement_used === 'yes' ? `${v.supplement_brand || 'Yes'} (${v.supplement_qty || '-'})` : 'No') },
        { label: 'Fertilizer Applied', getValue: (v) => (v.fertilizer_used === 'yes' ? `${v.fertilizer_brand || 'Yes'} (${v.fertilizer_qty || '-'})` : 'No') },
        { label: 'Irrigation Operation', getValue: (v) => (v.irrigation_done === 'yes' ? `${v.irrigation_type || 'Yes'} (${v.irrigation_source || '-'})` : 'No') },
        { label: 'Weeding Operation', getValue: (v) => (v.weeding_done === 'yes' ? 'Yes' : 'No') },
        { label: 'Visit Date', getValue: (v) => (v.visit_date ? formatDDMMYYYY(v.visit_date) : '-') },
      ];

      rowsDef.forEach((r) => {
        if (y > 750) {
          doc.addPage();
          y = 40;
        }
        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text(r.label, 45, y, { width: 170 });
        const visitValues = visits.map((v) => r.getValue(v)).join('  |  ');
        doc.fillColor('#334155').fontSize(8).font('Helvetica').text(visitValues, 220, y, { width: 330 });
        y += 18;
        drawTableLine(doc, y - 4);
      });
    }

    doc.end();
  } catch (err) {
    console.error('PDF matrix export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF matrix report' });
    }
  }
});

export default router;
