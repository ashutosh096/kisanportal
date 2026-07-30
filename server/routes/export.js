import express from 'express';
import ExcelJS from 'exceljs';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/export/excel - Export farmers registration & survey data as Excel file
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

    // Fetch matching survey visits
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

    // Styling header rows
    [farmerSheet, surveySheet].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2E7D32' },
      };
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Farmer_Survey_Report_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Failed to export Excel file' });
  }
});

export default router;
