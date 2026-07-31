import express from 'express';
import ExcelJS from 'exceljs';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/export/excel - Standard export
router.get('/excel', authenticateToken, requireRole('admin'), async (req, res) => {
  const { location, surveyor, startDate, endDate } = req.query;

  try {
    let farmerSql = 'SELECT * FROM farmers WHERE 1=1';
    const params = [];

    if (location) {
      farmerSql += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }
    if (surveyor) {
      farmerSql += ' AND surveyor_name LIKE ?';
      params.push(`%${surveyor}%`);
    }
    if (startDate) {
      farmerSql += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      farmerSql += ' AND date <= ?';
      params.push(endDate);
    }

    farmerSql += ' ORDER BY id DESC';
    const farmers = await query(farmerSql, params);

    let surveySql = `
      SELECT s.*, f.name as farmer_name, f.location as farmer_location 
      FROM surveys s 
      JOIN farmers f ON s.farmer_id = f.farmer_id 
      WHERE 1=1
    `;
    const surveyParams = [];

    if (location) {
      surveySql += ' AND f.location LIKE ?';
      surveyParams.push(`%${location}%`);
    }
    if (surveyor) {
      surveySql += ' AND s.surveyor_name LIKE ?';
      surveyParams.push(`%${surveyor}%`);
    }
    if (startDate) {
      surveySql += ' AND s.visit_date >= ?';
      surveyParams.push(startDate);
    }
    if (endDate) {
      surveySql += ' AND s.visit_date <= ?';
      surveyParams.push(endDate);
    }

    surveySql += ' ORDER BY s.id DESC';
    const surveys = await query(surveySql, surveyParams);

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Farmer Registrations
    const farmerSheet = workbook.addWorksheet('Farmer Registrations');
    farmerSheet.columns = [
      { header: 'Farmer ID', key: 'farmer_id', width: 15 },
      { header: 'Farmer Name', key: 'name', width: 22 },
      { header: 'Contact', key: 'contact', width: 15 },
      { header: 'Location / Village', key: 'location', width: 20 },
      { header: 'Registration Date', key: 'date', width: 15 },
      { header: 'Soil Testing', key: 'soil_testing', width: 12 },
      { header: 'Water Testing', key: 'water_testing', width: 12 },
      { header: 'Cow Dung Used', key: 'cow_dung_used', width: 15 },
      { header: 'Cow Dung Qty', key: 'cow_dung_qty', width: 15 },
      { header: 'Crop', key: 'crop', width: 15 },
      { header: 'Reason Chosen', key: 'crop_reason', width: 25 },
      { header: 'Area (Acre/Ha)', key: 'area', width: 15 },
      { header: 'Sowing Date', key: 'sowing_date', width: 15 },
      { header: 'Variety', key: 'variety', width: 15 },
      { header: 'Seed Qty/Acre', key: 'seed_qty_per_acre', width: 15 },
      { header: 'Seed Type', key: 'seed_type', width: 12 },
      { header: 'Sowing Type', key: 'sowing_type', width: 15 },
      { header: 'Harvest Date', key: 'harvest_date', width: 15 },
      { header: 'Yield', key: 'yield', width: 15 },
      { header: 'Expert Advice', key: 'expert_advice', width: 15 },
      { header: 'Surveyor Name', key: 'surveyor_name', width: 20 },
    ];
    farmerSheet.addRows(farmers);

    // Sheet 2: Farm Visit Surveys
    const surveySheet = workbook.addWorksheet('Farm Visits Logbook');
    surveySheet.columns = [
      { header: 'Farmer ID', key: 'farmer_id', width: 15 },
      { header: 'Farmer Name', key: 'farmer_name', width: 22 },
      { header: 'Location', key: 'farmer_location', width: 20 },
      { header: 'Visit Date', key: 'visit_date', width: 15 },
      { header: 'Plowing Done', key: 'plowing', width: 15 },
      { header: 'Plowing Count', key: 'plowing_count', width: 15 },
      { header: 'Pesticide Used', key: 'pesticide_used', width: 15 },
      { header: 'Pesticide Qty', key: 'pesticide_qty', width: 15 },
      { header: 'Pesticide Brand', key: 'pesticide_brand', width: 18 },
      { header: 'Supplement Used', key: 'supplement_used', width: 18 },
      { header: 'Supplement Qty', key: 'supplement_qty', width: 15 },
      { header: 'Supplement Brand', key: 'supplement_brand', width: 18 },
      { header: 'Fertilizer Used', key: 'fertilizer_used', width: 15 },
      { header: 'Fertilizer Qty', key: 'fertilizer_qty', width: 15 },
      { header: 'Fertilizer Brand', key: 'fertilizer_brand', width: 18 },
      { header: 'Irrigation Done', key: 'irrigation_done', width: 15 },
      { header: 'Irrigation Source', key: 'irrigation_source', width: 18 },
      { header: 'Irrigation Type', key: 'irrigation_type', width: 18 },
      { header: 'Irrigation Depth', key: 'irrigation_depth', width: 15 },
      { header: 'Weeding Done', key: 'weeding_done', width: 15 },
      { header: 'Additional Notes', key: 'additional_activities', width: 30 },
      { header: 'Surveyor Name', key: 'surveyor_name', width: 20 },
    ];
    surveySheet.addRows(surveys);

    [farmerSheet, surveySheet].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0D3C26' },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Farmer_Survey_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Failed to export Excel file' });
  }
});

// GET /api/export/excel-matrix - Export Per-Farmer Multi-Tab Matrix Workbook matching user's template exactly!
router.get('/excel-matrix', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const farmers = await query('SELECT * FROM farmers ORDER BY id ASC');
    const workbook = new ExcelJS.Workbook();

    for (const farmer of farmers) {
      const visits = await query('SELECT * FROM surveys WHERE farmer_id = ? ORDER BY visit_date ASC', [farmer.farmer_id]);
      
      const cleanSheetName = (farmer.name || farmer.farmer_id).replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30) || 'Farmer Sheet';
      const sheet = workbook.addWorksheet(cleanSheetName);

      // Row 1: Farm Management Details Header
      sheet.addRow(['Farm Management Details']);
      sheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0D3C26' } };

      // Row 2: Farmer Name
      sheet.addRow(['Farmer Name', farmer.name]);
      sheet.getRow(2).font = { bold: true };

      // Row 3: Dates Header
      const dateHeaders = ['Date', ...visits.map((v) => v.visit_date)];
      sheet.addRow(dateHeaders);
      sheet.getRow(3).font = { bold: true, color: { argb: '15803D' } };
      sheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };

      // Rows 4 to 22: Activity Rows matching paper form template
      const rowsDef = [
        { label: 'Ploughing (Yes/No)', getValue: (v) => (v.plowing === 'yes' ? 'Yes' : 'No') },
        { label: 'No. Of ploughing', getValue: (v) => (v.plowing === 'yes' ? `${v.plowing_count || 1} times` : '-') },
        { label: 'Pesticide (yes/no)', getValue: (v) => (v.pesticide_used === 'yes' ? 'Yes' : 'No') },
        { label: 'Pesticide Quantity', getValue: (v) => v.pesticide_qty || '-' },
        { label: 'Pesticide Brand', getValue: (v) => v.pesticide_brand || '-' },
        { label: 'Supplement (Yes/No)', getValue: (v) => (v.supplement_used === 'yes' ? 'Yes' : 'No') },
        { label: 'Supplement Quantity', getValue: (v) => v.supplement_qty || '-' },
        { label: 'Supplement Brand', getValue: (v) => v.supplement_brand || '-' },
        { label: 'Fertilizer (Yes/No)', getValue: (v) => (v.fertilizer_used === 'yes' ? 'Yes' : 'No') },
        { label: 'Fertilizer Quantity', getValue: (v) => v.fertilizer_qty || '-' },
        { label: 'Fertilizer Brand', getValue: (v) => v.fertilizer_brand || '-' },
        { label: 'Irrigation (Yes/No)', getValue: (v) => (v.irrigation_done === 'yes' ? 'Yes' : 'No') },
        { label: 'Irrigation Source (Tubewell/Canal)', getValue: (v) => v.irrigation_source || '-' },
        { label: 'Irrigation type (sprinkle/Flood)', getValue: (v) => v.irrigation_type || '-' },
        { label: 'Irrigation Depth', getValue: (v) => v.irrigation_depth || '-' },
        { label: 'Weeding', getValue: (v) => (v.weeding_done === 'yes' ? 'Yes' : 'No') },
        { label: 'Additional Activities', getValue: (v) => v.additional_activities || '-' },
        { label: 'Data Collection Date', getValue: (v) => v.visit_date || '-' },
      ];

      rowsDef.forEach((r) => {
        const rowVals = [r.label, ...visits.map((v) => r.getValue(v))];
        sheet.addRow(rowVals);
      });

      sheet.getColumn(1).width = 32;
      for (let i = 2; i <= visits.length + 1; i++) {
        sheet.getColumn(i).width = 16;
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Farmer_Matrix_Logbook_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Matrix export error:', err);
    res.status(500).json({ error: 'Failed to export matrix workbook' });
  }
});

export default router;
