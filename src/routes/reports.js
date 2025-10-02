/**
 * Rutas de Reportes - Define endpoints para reportes de ingresos, costos y disponibilidad
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getIncomeReports,
  getMaintenanceCostReports,
  getFleetAvailabilityReports,
  getExecutiveSummary
} = require('../controllers/reportsController');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

/**
 * @route GET /api/reports/income
 * @desc Obtener reportes de ingresos por alquileres
 * @access Private
 * @query {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @query {string} endDate - Fecha de fin (YYYY-MM-DD)
 * @query {string} groupBy - Agrupación: day, week, month, year (default: month)
 * @query {number} vehicleId - ID del vehículo específico (opcional)
 */
router.get('/income', getIncomeReports);

/**
 * @route GET /api/reports/maintenance-costs
 * @desc Obtener reportes de costos de mantenimiento
 * @access Private
 * @query {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @query {string} endDate - Fecha de fin (YYYY-MM-DD)
 * @query {string} groupBy - Agrupación: day, week, month, year (default: month)
 * @query {number} vehicleId - ID del vehículo específico (opcional)
 * @query {string} maintenanceType - Tipo de mantenimiento (opcional)
 */
router.get('/maintenance-costs', getMaintenanceCostReports);

/**
 * @route GET /api/reports/fleet-availability
 * @desc Obtener reportes de disponibilidad de la flota
 * @access Private
 * @query {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @query {string} endDate - Fecha de fin (YYYY-MM-DD)
 * @query {string} groupBy - Agrupación: day, week, month, year (default: month)
 */
router.get('/fleet-availability', getFleetAvailabilityReports);

/**
 * @route GET /api/reports/executive-summary
 * @desc Obtener resumen ejecutivo de todos los reportes
 * @access Private
 * @query {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @query {string} endDate - Fecha de fin (YYYY-MM-DD)
 */
router.get('/executive-summary', getExecutiveSummary);

module.exports = router;