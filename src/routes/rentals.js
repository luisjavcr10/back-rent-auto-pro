const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getRentals,
  getRentalById,
  createRental,
  updateRental,
  cancelRental,
  startRental,
  completeRental,
  getRentalStats
} = require('../controllers/rentalController');

/**
 * @swagger
 * tags:
 *   name: Rentals
 *   description: Vehicle rental management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Rental:
 *       type: object
 *       required:
 *         - customer_id
 *         - vehicle_id
 *         - start_date
 *         - end_date
 *         - pickup_location
 *         - return_location
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Rental unique identifier
 *         rental_number:
 *           type: string
 *           description: Auto-generated rental number
 *         customer_id:
 *           type: string
 *           format: uuid
 *           description: Customer ID
 *         vehicle_id:
 *           type: string
 *           format: uuid
 *           description: Vehicle ID
 *         start_date:
 *           type: string
 *           format: date
 *           description: Rental start date
 *         end_date:
 *           type: string
 *           format: date
 *           description: Rental end date
 *         actual_return_date:
 *           type: string
 *           format: date
 *           description: Actual return date
 *         pickup_location:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *           description: Pickup location
 *         return_location:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *           description: Return location
 *         daily_rate:
 *           type: number
 *           minimum: 0
 *           description: Daily rental rate
 *         total_days:
 *           type: integer
 *           minimum: 1
 *           description: Total rental days
 *         subtotal:
 *           type: number
 *           minimum: 0
 *           description: Subtotal amount
 *         tax_amount:
 *           type: number
 *           minimum: 0
 *           description: Tax amount
 *         additional_charges:
 *           type: number
 *           minimum: 0
 *           description: Additional charges
 *         discount_amount:
 *           type: number
 *           minimum: 0
 *           description: Discount amount
 *         total_amount:
 *           type: number
 *           minimum: 0
 *           description: Total amount
 *         deposit_amount:
 *           type: number
 *           minimum: 0
 *           description: Deposit amount
 *         payment_status:
 *           type: string
 *           enum: [pending, partial, paid, refunded]
 *           description: Payment status
 *         rental_status:
 *           type: string
 *           enum: [reserved, confirmed, active, completed, cancelled]
 *           description: Rental status
 *         pickup_mileage:
 *           type: integer
 *           minimum: 0
 *           description: Vehicle mileage at pickup
 *         return_mileage:
 *           type: integer
 *           minimum: 0
 *           description: Vehicle mileage at return
 *         fuel_level_pickup:
 *           type: string
 *           enum: [empty, quarter, half, three_quarters, full]
 *           description: Fuel level at pickup
 *         fuel_level_return:
 *           type: string
 *           enum: [empty, quarter, half, three_quarters, full]
 *           description: Fuel level at return
 *         damage_notes_pickup:
 *           type: string
 *           description: Damage notes at pickup
 *         damage_notes_return:
 *           type: string
 *           description: Damage notes at return
 *         additional_notes:
 *           type: string
 *           description: Additional notes
 */

// Validation rules
const rentalValidation = [
  body('customer_id')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('vehicle_id')
    .isUUID()
    .withMessage('ID de vehículo inválido'),
  body('start_date')
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  body('end_date')
    .isISO8601()
    .withMessage('Fecha de fin inválida'),
  body('pickup_location')
    .isLength({ min: 5, max: 200 })
    .withMessage('La ubicación de recogida debe tener entre 5 y 200 caracteres'),
  body('return_location')
    .isLength({ min: 5, max: 200 })
    .withMessage('La ubicación de devolución debe tener entre 5 y 200 caracteres'),
  body('deposit_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El depósito debe ser un número positivo'),
  body('discount_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El descuento debe ser un número positivo'),
  body('additional_charges')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Los cargos adicionales deben ser un número positivo')
];

const updateRentalValidation = [
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida'),
  body('pickup_location')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('La ubicación de recogida debe tener entre 5 y 200 caracteres'),
  body('return_location')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('La ubicación de devolución debe tener entre 5 y 200 caracteres'),
  body('payment_status')
    .optional()
    .isIn(['pending', 'partial', 'paid', 'refunded'])
    .withMessage('Estado de pago inválido'),
  body('rental_status')
    .optional()
    .isIn(['reserved', 'confirmed', 'active', 'completed', 'cancelled'])
    .withMessage('Estado de alquiler inválido'),
  body('deposit_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El depósito debe ser un número positivo'),
  body('discount_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El descuento debe ser un número positivo'),
  body('additional_charges')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Los cargos adicionales deben ser un número positivo')
];

/**
 * @swagger
 * /api/rentals:
 *   get:
 *     summary: Get all rentals with filtering and pagination
 *     tags: [Rentals]
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
 *         name: rental_status
 *         schema:
 *           type: string
 *           enum: [reserved, confirmed, active, completed, cancelled]
 *         description: Filter by rental status
 *       - in: query
 *         name: payment_status
 *         schema:
 *           type: string
 *           enum: [pending, partial, paid, refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer ID
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
 *         description: Search by rental number
 *     responses:
 *       200:
 *         description: List of rentals retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, getRentals);

/**
 * @swagger
 * /api/rentals/stats:
 *   get:
 *     summary: Get rental statistics
 *     tags: [Rentals]
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
 *         description: Rental statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authenticateToken, getRentalStats);

/**
 * @swagger
 * /api/rentals/{id}:
 *   get:
 *     summary: Get rental by ID
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rental ID
 *     responses:
 *       200:
 *         description: Rental retrieved successfully
 *       404:
 *         description: Rental not found
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
  param('id').isUUID().withMessage('ID de alquiler inválido'),
  handleValidationErrors,
  getRentalById
);

/**
 * @swagger
 * /api/rentals:
 *   post:
 *     summary: Create new rental
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Rental'
 *     responses:
 *       201:
 *         description: Rental created successfully
 *       400:
 *         description: Invalid input data or vehicle not available
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
  rentalValidation,
  handleValidationErrors,
  createRental
);

/**
 * @swagger
 * /api/rentals/{id}:
 *   put:
 *     summary: Update rental
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rental ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Rental'
 *     responses:
 *       200:
 *         description: Rental updated successfully
 *       400:
 *         description: Invalid input data or rental cannot be modified
 *       404:
 *         description: Rental not found
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
  param('id').isUUID().withMessage('ID de alquiler inválido'),
  updateRentalValidation,
  handleValidationErrors,
  updateRental
);

/**
 * @swagger
 * /api/rentals/{id}/cancel:
 *   patch:
 *     summary: Cancel rental
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rental ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellation_reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Rental cancelled successfully
 *       400:
 *         description: Rental cannot be cancelled
 *       404:
 *         description: Rental not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/cancel', 
  authenticateToken,
  //requireRole(['admin', 'gestor_flota']),
  param('id').isUUID().withMessage('ID de alquiler inválido'),
  body('cancellation_reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La razón de cancelación no puede exceder 500 caracteres'),
  handleValidationErrors,
  cancelRental
);

/**
 * @swagger
 * /api/rentals/{id}/start:
 *   patch:
 *     summary: Start rental (pickup)
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rental ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickup_mileage
 *               - fuel_level_pickup
 *             properties:
 *               pickup_mileage:
 *                 type: integer
 *                 minimum: 0
 *                 description: Vehicle mileage at pickup
 *               fuel_level_pickup:
 *                 type: string
 *                 enum: [empty, quarter, half, three_quarters, full]
 *                 description: Fuel level at pickup
 *               damage_notes_pickup:
 *                 type: string
 *                 description: Damage notes at pickup
 *     responses:
 *       200:
 *         description: Rental started successfully
 *       400:
 *         description: Invalid data or rental cannot be started
 *       404:
 *         description: Rental not found
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
  param('id').isUUID().withMessage('ID de alquiler inválido'),
  body('pickup_mileage')
    .isInt({ min: 0 })
    .withMessage('El kilometraje debe ser un número entero positivo'),
  body('fuel_level_pickup')
    .isIn(['empty', 'quarter', 'half', 'three_quarters', 'full'])
    .withMessage('Nivel de combustible inválido'),
  body('damage_notes_pickup')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas de daños no pueden exceder 1000 caracteres'),
  handleValidationErrors,
  startRental
);

/**
 * @swagger
 * /api/rentals/{id}/complete:
 *   patch:
 *     summary: Complete rental (return)
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rental ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - return_mileage
 *               - fuel_level_return
 *             properties:
 *               return_mileage:
 *                 type: integer
 *                 minimum: 0
 *                 description: Vehicle mileage at return
 *               fuel_level_return:
 *                 type: string
 *                 enum: [empty, quarter, half, three_quarters, full]
 *                 description: Fuel level at return
 *               damage_notes_return:
 *                 type: string
 *                 description: Damage notes at return
 *               additional_charges:
 *                 type: number
 *                 minimum: 0
 *                 description: Additional charges
 *               actual_return_date:
 *                 type: string
 *                 format: date-time
 *                 description: Actual return date
 *     responses:
 *       200:
 *         description: Rental completed successfully
 *       400:
 *         description: Invalid data or rental cannot be completed
 *       404:
 *         description: Rental not found
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
  param('id').isUUID().withMessage('ID de alquiler inválido'),
  body('return_mileage')
    .isInt({ min: 0 })
    .withMessage('El kilometraje debe ser un número entero positivo'),
  body('fuel_level_return')
    .isIn(['empty', 'quarter', 'half', 'three_quarters', 'full'])
    .withMessage('Nivel de combustible inválido'),
  body('damage_notes_return')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas de daños no pueden exceder 1000 caracteres'),
  body('additional_charges')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Los cargos adicionales deben ser un número positivo'),
  body('actual_return_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha de devolución inválida'),
  handleValidationErrors,
  completeRental
);

module.exports = router;