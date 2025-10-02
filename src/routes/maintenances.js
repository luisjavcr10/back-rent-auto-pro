const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getMaintenances,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  startMaintenance,
  completeMaintenance,
  getMaintenanceStats,
  getVehiclesDueForMaintenance
} = require('../controllers/maintenanceController');

/**
 * @swagger
 * tags:
 *   name: Maintenances
 *   description: Vehicle maintenance management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Maintenance:
 *       type: object
 *       required:
 *         - vehicle_id
 *         - maintenance_type
 *         - title
 *         - description
 *         - scheduled_date
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Maintenance unique identifier
 *         maintenance_number:
 *           type: string
 *           description: Auto-generated maintenance number
 *         vehicle_id:
 *           type: string
 *           format: uuid
 *           description: Vehicle ID
 *         maintenance_type:
 *           type: string
 *           enum: [preventive, corrective, predictive, scheduled]
 *           description: Type of maintenance
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 100
 *           description: Maintenance title
 *         description:
 *           type: string
 *           description: Detailed description of maintenance
 *         scheduled_date:
 *           type: string
 *           format: date
 *           description: Scheduled maintenance date
 *         completed_date:
 *           type: string
 *           format: date
 *           description: Actual completion date
 *         mileage_at_maintenance:
 *           type: integer
 *           minimum: 0
 *           description: Vehicle mileage at maintenance
 *         estimated_cost:
 *           type: number
 *           minimum: 0
 *           description: Estimated cost
 *         actual_cost:
 *           type: number
 *           minimum: 0
 *           description: Actual cost
 *         service_provider:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: Service provider name
 *         service_provider_contact:
 *           type: string
 *           minLength: 8
 *           maxLength: 50
 *           description: Service provider contact
 *         parts_replaced:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               cost:
 *                 type: number
 *               part_number:
 *                 type: string
 *           description: List of replaced parts
 *         labor_hours:
 *           type: number
 *           minimum: 0
 *           description: Labor hours
 *         labor_cost:
 *           type: number
 *           minimum: 0
 *           description: Labor cost
 *         status:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled, overdue]
 *           description: Maintenance status
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *           description: Maintenance priority
 *         next_maintenance_mileage:
 *           type: integer
 *           minimum: 0
 *           description: Next maintenance mileage
 *         next_maintenance_date:
 *           type: string
 *           format: date
 *           description: Next maintenance date
 *         warranty_expiry:
 *           type: string
 *           format: date
 *           description: Warranty expiry date
 *         invoice_number:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           description: Invoice number
 *         notes:
 *           type: string
 *           description: Additional notes
 */

// Validation rules
const maintenanceValidation = [
  body('vehicle_id')
    .isUUID()
    .withMessage('ID de vehículo inválido'),
  body('maintenance_type')
    .isIn(['preventive', 'corrective', 'predictive', 'scheduled'])
    .withMessage('Tipo de mantenimiento inválido'),
  body('title')
    .isLength({ min: 5, max: 100 })
    .withMessage('El título debe tener entre 5 y 100 caracteres'),
  body('description')
    .notEmpty()
    .withMessage('La descripción es requerida'),
  body('scheduled_date')
    .isISO8601()
    .withMessage('Fecha programada inválida'),
  body('estimated_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo estimado debe ser un número positivo'),
  body('service_provider')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El proveedor de servicio debe tener entre 2 y 100 caracteres'),
  body('service_provider_contact')
    .optional()
    .isLength({ min: 8, max: 50 })
    .withMessage('El contacto del proveedor debe tener entre 8 y 50 caracteres'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Prioridad inválida'),
  body('next_maintenance_mileage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El kilometraje del próximo mantenimiento debe ser un número positivo'),
  body('next_maintenance_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha del próximo mantenimiento inválida')
];

const updateMaintenanceValidation = [
  body('maintenance_type')
    .optional()
    .isIn(['preventive', 'corrective', 'predictive', 'scheduled'])
    .withMessage('Tipo de mantenimiento inválido'),
  body('title')
    .optional()
    .isLength({ min: 5, max: 100 })
    .withMessage('El título debe tener entre 5 y 100 caracteres'),
  body('description')
    .optional()
    .notEmpty()
    .withMessage('La descripción no puede estar vacía'),
  body('scheduled_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha programada inválida'),
  body('estimated_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo estimado debe ser un número positivo'),
  body('actual_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo real debe ser un número positivo'),
  body('service_provider')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El proveedor de servicio debe tener entre 2 y 100 caracteres'),
  body('service_provider_contact')
    .optional()
    .isLength({ min: 8, max: 50 })
    .withMessage('El contacto del proveedor debe tener entre 8 y 50 caracteres'),
  body('labor_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Las horas de trabajo deben ser un número positivo'),
  body('labor_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo de mano de obra debe ser un número positivo'),
  body('status')
    .optional()
    .isIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'])
    .withMessage('Estado inválido'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Prioridad inválida'),
  body('mileage_at_maintenance')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El kilometraje debe ser un número entero positivo'),
  body('next_maintenance_mileage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El kilometraje del próximo mantenimiento debe ser un número positivo'),
  body('next_maintenance_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha del próximo mantenimiento inválida'),
  body('warranty_expiry')
    .optional()
    .isISO8601()
    .withMessage('Fecha de vencimiento de garantía inválida'),
  body('invoice_number')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('El número de factura debe tener entre 3 y 50 caracteres')
];

/**
 * @swagger
 * /api/maintenances:
 *   get:
 *     summary: Get all maintenances with filtering and pagination
 *     tags: [Maintenances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: maintenance_type
 *         schema:
 *           type: string
 *           enum: [preventive, corrective, predictive, scheduled]
 *         description: Filter by maintenance type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled, overdue]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by priority
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by vehicle ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date range
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date range
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in maintenance number, title, or description
 *     responses:
 *       200:
 *         description: List of maintenances retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, getMaintenances);

/**
 * @swagger
 * /api/maintenances/stats:
 *   get:
 *     summary: Get maintenance statistics
 *     tags: [Maintenances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Maintenance statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authenticateToken, getMaintenanceStats);

/**
 * @swagger
 * /api/maintenances/vehicles-due:
 *   get:
 *     summary: Get vehicles due for maintenance
 *     tags: [Maintenances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days_ahead
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Days ahead to check for upcoming maintenances
 *     responses:
 *       200:
 *         description: Vehicles due for maintenance retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/vehicles-due', authenticateToken, getVehiclesDueForMaintenance);

/**
 * @swagger
 * /api/maintenances/{id}:
 *   get:
 *     summary: Get maintenance by ID
 *     tags: [Maintenances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Maintenance ID
 *     responses:
 *       200:
 *         description: Maintenance retrieved successfully
 *       404:
 *         description: Maintenance not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/:id', 
  authenticateToken,
  //requireRole(['admin', 'gestor_flota']),
  param('id').isUUID().withMessage('ID de mantenimiento inválido'),
  handleValidationErrors,
  getMaintenanceById
);

/**
 * @swagger
 * /api/maintenances:
 *   post:
 *     summary: Create new maintenance
 *     tags: [Maintenances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Maintenance'
 *     responses:
 *       201:
 *         description: Maintenance created successfully
 *       400:
 *         description: Invalid input data or vehicle not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post('/', 
  authenticateToken, 
  //requireRole(['admin', 'gestor_flota']),
  maintenanceValidation,
  handleValidationErrors,
  createMaintenance
);

/**
 * @swagger
 * /api/maintenances/{id}:
 *   put:
 *     summary: Update maintenance
 *     tags: [Maintenances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Maintenance ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Maintenance'
 *     responses:
 *       200:
 *         description: Maintenance updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Maintenance not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.put('/:id', 
  authenticateToken,
  //requireRole(['admin', 'gestor_flota']),
  param('id').isUUID().withMessage('ID de mantenimiento inválido'),
  updateMaintenanceValidation,
  handleValidationErrors,
  updateMaintenance
);

/**
 * @swagger
 * /api/maintenances/{id}/start:
 *   patch:
 *     summary: Start maintenance
 *     tags: [Maintenances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Maintenance ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mileage_at_maintenance
 *             properties:
 *               mileage_at_maintenance:
 *                 type: integer
 *                 minimum: 0
 *                 description: Vehicle mileage at maintenance start
 *     responses:
 *       200:
 *         description: Maintenance started successfully
 *       400:
 *         description: Invalid data or maintenance cannot be started
 *       404:
 *         description: Maintenance not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/start', 
  authenticateToken,
  //requireRole(['admin', 'gestor_flota']),
  param('id').isUUID().withMessage('ID de mantenimiento inválido'),
  body('mileage_at_maintenance')
    .isInt({ min: 0 })
    .withMessage('El kilometraje debe ser un número entero positivo'),
  handleValidationErrors,
  startMaintenance
);

/**
 * @swagger
 * /api/maintenances/{id}/complete:
 *   patch:
 *     summary: Complete maintenance
 *     tags: [Maintenances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Maintenance ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actual_cost:
 *                 type: number
 *                 minimum: 0
 *                 description: Actual maintenance cost
 *               parts_replaced:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     cost:
 *                       type: number
 *                     part_number:
 *                       type: string
 *                 description: List of replaced parts
 *               labor_hours:
 *                 type: number
 *                 minimum: 0
 *                 description: Labor hours
 *               labor_cost:
 *                 type: number
 *                 minimum: 0
 *                 description: Labor cost
 *               invoice_number:
 *                 type: string
 *                 description: Invoice number
 *               warranty_expiry:
 *                 type: string
 *                 format: date
 *                 description: Warranty expiry date
 *               next_maintenance_mileage:
 *                 type: integer
 *                 minimum: 0
 *                 description: Next maintenance mileage
 *               next_maintenance_date:
 *                 type: string
 *                 format: date
 *                 description: Next maintenance date
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Maintenance completed successfully
 *       400:
 *         description: Invalid data or maintenance cannot be completed
 *       404:
 *         description: Maintenance not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/complete', 
  authenticateToken,
  //requireRole(['admin', 'gestor_flota']),
  param('id').isUUID().withMessage('ID de mantenimiento inválido'),
  body('actual_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo real debe ser un número positivo'),
  body('labor_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Las horas de trabajo deben ser un número positivo'),
  body('labor_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo de mano de obra debe ser un número positivo'),
  body('invoice_number')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('El número de factura debe tener entre 3 y 50 caracteres'),
  body('warranty_expiry')
    .optional()
    .isISO8601()
    .withMessage('Fecha de vencimiento de garantía inválida'),
  body('next_maintenance_mileage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El kilometraje del próximo mantenimiento debe ser un número positivo'),
  body('next_maintenance_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha del próximo mantenimiento inválida'),
  handleValidationErrors,
  completeMaintenance
);

/**
 * @swagger
 * /api/maintenances/{id}:
 *   delete:
 *     summary: Delete maintenance
 *     tags: [Maintenances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Maintenance ID
 *     responses:
 *       200:
 *         description: Maintenance deleted successfully
 *       400:
 *         description: Cannot delete completed maintenance
 *       404:
 *         description: Maintenance not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', 
  authenticateToken,
 //requireRole(['admin']),
  param('id').isUUID().withMessage('ID de mantenimiento inválido'),
  handleValidationErrors,
  deleteMaintenance
);

module.exports = router;