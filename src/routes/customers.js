const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  validateCustomerForRental
} = require('../controllers/customerController');

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - first_name
 *         - last_name
 *         - email
 *         - phone
 *         - document_number
 *         - date_of_birth
 *         - address
 *         - city
 *         - driver_license_number
 *         - driver_license_expiry
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Customer unique identifier
 *         first_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: Customer first name
 *         last_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: Customer last name
 *         email:
 *           type: string
 *           format: email
 *           description: Customer email address
 *         phone:
 *           type: string
 *           minLength: 8
 *           maxLength: 15
 *           description: Customer phone number
 *         document_type:
 *           type: string
 *           enum: [dni, passport, license]
 *           description: Type of identification document
 *         document_number:
 *           type: string
 *           minLength: 8
 *           maxLength: 20
 *           description: Document number
 *         date_of_birth:
 *           type: string
 *           format: date
 *           description: Customer date of birth
 *         address:
 *           type: string
 *           description: Customer address
 *         city:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: Customer city
 *         country:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: Customer country
 *         driver_license_number:
 *           type: string
 *           minLength: 8
 *           maxLength: 20
 *           description: Driver license number
 *         driver_license_expiry:
 *           type: string
 *           format: date
 *           description: Driver license expiry date
 *         emergency_contact_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: Emergency contact name
 *         emergency_contact_phone:
 *           type: string
 *           minLength: 8
 *           maxLength: 15
 *           description: Emergency contact phone
 *         is_active:
 *           type: boolean
 *           description: Whether customer is active
 *         notes:
 *           type: string
 *           description: Additional notes about customer
 */

// Validation rules
const customerValidation = [
  body('first_name')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('last_name')
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres'),
  body('email')
    .isEmail()
    .withMessage('Email inválido'),
  body('phone')
    .isLength({ min: 8, max: 15 })
    .withMessage('El teléfono debe tener entre 8 y 15 caracteres'),
  body('document_type')
    .optional()
    .isIn(['dni', 'passport', 'license'])
    .withMessage('Tipo de documento inválido'),
  body('document_number')
    .isLength({ min: 8, max: 20 })
    .withMessage('El número de documento debe tener entre 8 y 20 caracteres'),
  body('date_of_birth')
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('address')
    .notEmpty()
    .withMessage('La dirección es requerida'),
  body('city')
    .isLength({ min: 2, max: 50 })
    .withMessage('La ciudad debe tener entre 2 y 50 caracteres'),
  body('country')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El país debe tener entre 2 y 50 caracteres'),
  body('driver_license_number')
    .isLength({ min: 8, max: 20 })
    .withMessage('El número de licencia debe tener entre 8 y 20 caracteres'),
  body('driver_license_expiry')
    .isISO8601()
    .withMessage('Fecha de vencimiento de licencia inválida'),
  body('emergency_contact_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del contacto de emergencia debe tener entre 2 y 100 caracteres'),
  body('emergency_contact_phone')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('El teléfono del contacto de emergencia debe tener entre 8 y 15 caracteres')
];

const updateCustomerValidation = [
  body('first_name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('last_name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('El teléfono debe tener entre 8 y 15 caracteres'),
  body('document_type')
    .optional()
    .isIn(['dni', 'passport', 'license'])
    .withMessage('Tipo de documento inválido'),
  body('document_number')
    .optional()
    .isLength({ min: 8, max: 20 })
    .withMessage('El número de documento debe tener entre 8 y 20 caracteres'),
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('address')
    .optional()
    .notEmpty()
    .withMessage('La dirección no puede estar vacía'),
  body('city')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('La ciudad debe tener entre 2 y 50 caracteres'),
  body('country')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El país debe tener entre 2 y 50 caracteres'),
  body('driver_license_number')
    .optional()
    .isLength({ min: 8, max: 20 })
    .withMessage('El número de licencia debe tener entre 8 y 20 caracteres'),
  body('driver_license_expiry')
    .optional()
    .isISO8601()
    .withMessage('Fecha de vencimiento de licencia inválida'),
  body('emergency_contact_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del contacto de emergencia debe tener entre 2 y 100 caracteres'),
  body('emergency_contact_phone')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('El teléfono del contacto de emergencia debe tener entre 8 y 15 caracteres')
];

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers with filtering and pagination
 *     tags: [Customers]
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
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: document_type
 *         schema:
 *           type: string
 *           enum: [dni, passport, license]
 *         description: Filter by document type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, email, document, or phone
 *     responses:
 *       200:
 *         description: List of customers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, getCustomers);

/**
 * @swagger
 * /api/customers/stats:
 *   get:
 *     summary: Get customer statistics
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authenticateToken, getCustomerStats);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/:id', 
  authenticateToken,
  param('id').isUUID().withMessage('ID de cliente inválido'),
  handleValidationErrors,
  getCustomerById
);

/**
 * @swagger
 * /api/customers/{id}/validate:
 *   get:
 *     summary: Validate customer for rental
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer validation result
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/:id/validate', 
  authenticateToken,
  //requireRole(['admin', 'gestor_flota']),
  param('id').isUUID().withMessage('ID de cliente inválido'),
  handleValidationErrors,
  validateCustomerForRental
);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Invalid input data or customer already exists
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
  customerValidation,
  handleValidationErrors,
  createCustomer
);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       400:
 *         description: Invalid input data or duplicate data
 *       404:
 *         description: Customer not found
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
  param('id').isUUID().withMessage('ID de cliente inválido'),
  updateCustomerValidation,
  handleValidationErrors,
  updateCustomer
);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete customer (soft delete)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       400:
 *         description: Cannot delete customer with active rentals
 *       404:
 *         description: Customer not found
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
  param('id').isUUID().withMessage('ID de cliente inválido'),
  handleValidationErrors,
  deleteCustomer
);

module.exports = router;