const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const { requireRole } = require('../middleware/auth');
const { authenticateToken } = require('../middleware/auth');
const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getAvailableVehicles,
  updateMileage,
  getVehicleStats
} = require('../controllers/vehicleController');

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle fleet management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       required:
 *         - license_plate
 *         - brand
 *         - model
 *         - year
 *         - color
 *         - vehicle_type
 *         - daily_rate
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Vehicle unique identifier
 *         license_plate:
 *           type: string
 *           minLength: 6
 *           maxLength: 10
 *           description: Vehicle license plate
 *         brand:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: Vehicle brand
 *         model:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: Vehicle model
 *         year:
 *           type: integer
 *           minimum: 1990
 *           description: Vehicle year
 *         color:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           description: Vehicle color
 *         vehicle_type:
 *           type: string
 *           enum: [sedan, suv, hatchback, pickup, van, coupe]
 *           description: Type of vehicle
 *         fuel_type:
 *           type: string
 *           enum: [gasoline, diesel, hybrid, electric]
 *           description: Fuel type
 *         transmission:
 *           type: string
 *           enum: [manual, automatic]
 *           description: Transmission type
 *         seats:
 *           type: integer
 *           minimum: 2
 *           maximum: 9
 *           description: Number of seats
 *         daily_rate:
 *           type: number
 *           minimum: 0
 *           description: Daily rental rate
 *         current_mileage:
 *           type: integer
 *           minimum: 0
 *           description: Current vehicle mileage
 *         status:
 *           type: string
 *           enum: [available, rented, maintenance, inactive]
 *           description: Vehicle status
 *         is_active:
 *           type: boolean
 *           description: Whether vehicle is active
 */

// Validation rules
const vehicleValidation = [
  body('license_plate')
    .isLength({ min: 6, max: 10 })
    .withMessage('La patente debe tener entre 6 y 10 caracteres'),
  body('vin')
    .optional()
    .isLength({ min: 17, max: 17 })
    .withMessage('El VIN debe tener exactamente 17 caracteres'),
  body('brand')
    .isLength({ min: 2, max: 50 })
    .withMessage('La marca debe tener entre 2 y 50 caracteres'),
  body('model')
    .isLength({ min: 2, max: 50 })
    .withMessage('El modelo debe tener entre 2 y 50 caracteres'),
  body('year')
    .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
    .withMessage('El año debe ser válido'),
  body('color')
    .isLength({ min: 3, max: 30 })
    .withMessage('El color debe tener entre 3 y 30 caracteres'),
  body('vehicle_type')
    .isIn(['sedan', 'suv', 'hatchback', 'pickup', 'van', 'coupe'])
    .withMessage('Tipo de vehículo inválido'),
  body('fuel_type')
    .optional()
    .isIn(['gasoline', 'diesel', 'hybrid', 'electric'])
    .withMessage('Tipo de combustible inválido'),
  body('transmission')
    .optional()
    .isIn(['manual', 'automatic'])
    .withMessage('Tipo de transmisión inválido'),
  body('seats')
    .isInt({ min: 2, max: 9 })
    .withMessage('El número de asientos debe estar entre 2 y 9'),
  body('daily_rate')
    .isFloat({ min: 0 })
    .withMessage('La tarifa diaria debe ser un número positivo')
];

const updateVehicleValidation = [
  body('license_plate')
    .optional()
    .isLength({ min: 6, max: 10 })
    .withMessage('La patente debe tener entre 6 y 10 caracteres'),
  body('vin')
    .optional()
    .isLength({ min: 17, max: 17 })
    .withMessage('El VIN debe tener exactamente 17 caracteres'),
  body('brand')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('La marca debe tener entre 2 y 50 caracteres'),
  body('model')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El modelo debe tener entre 2 y 50 caracteres'),
  body('year')
    .optional()
    .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
    .withMessage('El año debe ser válido'),
  body('color')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('El color debe tener entre 3 y 30 caracteres'),
  body('vehicle_type')
    .optional()
    .isIn(['sedan', 'suv', 'hatchback', 'pickup', 'van', 'coupe'])
    .withMessage('Tipo de vehículo inválido'),
  body('fuel_type')
    .optional()
    .isIn(['gasoline', 'diesel', 'hybrid', 'electric'])
    .withMessage('Tipo de combustible inválido'),
  body('transmission')
    .optional()
    .isIn(['manual', 'automatic'])
    .withMessage('Tipo de transmisión inválido'),
  body('seats')
    .optional()
    .isInt({ min: 2, max: 9 })
    .withMessage('El número de asientos debe estar entre 2 y 9'),
  body('daily_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La tarifa diaria debe ser un número positivo')
];

/**
 * @swagger
 * /api/vehicles/available:
 *   get:
 *     summary: Get available vehicles for rental
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Rental start date
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Rental end date
 *       - in: query
 *         name: vehicle_type
 *         schema:
 *           type: string
 *           enum: [sedan, suv, hatchback, pickup, van, coupe]
 *         description: Filter by vehicle type
 *     responses:
 *       200:
 *         description: Available vehicles retrieved successfully
 *       400:
 *         description: Missing required dates
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/available', authenticateToken, getAvailableVehicles);

/**
 * @swagger
 * /api/vehicles/stats:
 *   get:
 *     summary: Get vehicle statistics
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authenticateToken, getVehicleStats);

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Get all vehicles with filtering and pagination
 *     tags: [Vehicles]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, rented, maintenance, inactive]
 *         description: Filter by vehicle status
 *       - in: query
 *         name: vehicle_type
 *         schema:
 *           type: string
 *           enum: [sedan, suv, hatchback, pickup, van, coupe]
 *         description: Filter by vehicle type
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in license plate, brand, or model
 *     responses:
 *       200:
 *         description: List of vehicles retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, getVehicles);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle retrieved successfully
 *       404:
 *         description: Vehicle not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:id', 
  authenticateToken,
  param('id').isUUID().withMessage('ID de vehículo inválido'),
  handleValidationErrors,
  getVehicleById
);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Create new vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vehicle'
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post('/', 
  authenticateToken, 
  requireRole('admin', 'gestor_flota'),
  vehicleValidation,
  handleValidationErrors,
  createVehicle
);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Update vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vehicle'
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Vehicle not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.put('/:id', 
  authenticateToken,
  requireRole('admin', 'gestor_flota'),
  param('id').isUUID().withMessage('ID de vehículo inválido'),
  updateVehicleValidation,
  handleValidationErrors,
  updateVehicle
);

/**
 * @swagger
 * /api/vehicles/{id}/mileage:
 *   patch:
 *     summary: Update vehicle mileage
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_mileage
 *             properties:
 *               current_mileage:
 *                 type: integer
 *                 minimum: 0
 *                 description: New mileage value
 *     responses:
 *       200:
 *         description: Mileage updated successfully
 *       400:
 *         description: Invalid mileage value
 *       404:
 *         description: Vehicle not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/mileage', 
  authenticateToken,
  requireRole('admin', 'gestor_flota'),
  param('id').isUUID().withMessage('ID de vehículo inválido'),
  body('current_mileage')
    .isInt({ min: 0 })
    .withMessage('El kilometraje debe ser un número entero positivo'),
  handleValidationErrors,
  updateMileage
);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Delete vehicle (soft delete)
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 *       400:
 *         description: Cannot delete vehicle with active rentals
 *       404:
 *         description: Vehicle not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', 
  authenticateToken,
  requireRole('admin', 'gestor_flota'),
  param('id').isUUID().withMessage('ID de vehículo inválido'),
  handleValidationErrors,
  deleteVehicle
);

module.exports = router;