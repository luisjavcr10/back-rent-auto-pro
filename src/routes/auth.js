const express = require('express');
const { body } = require('express-validator');
const {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  updateUser
} = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Endpoints para autenticación y gestión de usuarios
 */

/**
 * Login validation rules
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email debe ser válido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Contraseña es requerida')
];

/**
 * Registration validation rules
 */
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email debe ser válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Contraseña debe tener al menos 6 caracteres'),
  body('first_name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Nombre debe tener entre 2 y 50 caracteres')
    .trim(),
  body('last_name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Apellido debe tener entre 2 y 50 caracteres')
    .trim(),
  body('phone')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('Teléfono debe tener entre 8 y 15 caracteres'),
  body('role')
    .optional()
    .isIn(['admin', 'gestor_flota', 'cliente'])
    .withMessage('Rol debe ser admin, gestor_flota o cliente')
];

/**
 * Profile update validation rules
 */
const updateProfileValidation = [
  body('first_name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nombre debe tener entre 2 y 50 caracteres')
    .trim(),
  body('last_name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Apellido debe tener entre 2 y 50 caracteres')
    .trim(),
  body('phone')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('Teléfono debe tener entre 8 y 15 caracteres')
];

/**
 * Change password validation rules
 */
const changePasswordValidation = [
  body('current_password')
    .notEmpty()
    .withMessage('Contraseña actual es requerida'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('Nueva contraseña debe tener al menos 6 caracteres')
];

// Public// Routes

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión en el sistema
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "admin@rentautopro.com"
 *             password: "admin123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginValidation, handleValidationErrors, login);

// Protected routes

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Actualizar perfil del usuario autenticado
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 15
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */
router.put('/profile', authenticateToken, updateProfileValidation, handleValidationErrors, updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Cambiar contraseña del usuario autenticado
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password:
 *                 type: string
 *                 description: Contraseña actual
 *               new_password:
 *                 type: string
 *                 minLength: 6
 *                 description: Nueva contraseña
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 *       400:
 *         description: Datos inválidos o contraseña actual incorrecta
 *       401:
 *         description: No autorizado
 */
router.put('/change-password', authenticateToken, changePasswordValidation, handleValidationErrors, changePassword);

// Admin only routes

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario (Solo administradores)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, first_name, last_name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 15
 *               role:
 *                 type: string
 *                 enum: [admin, gestor_flota, cliente]
 *                 default: cliente
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Datos inválidos o email ya existe
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Permisos insuficientes (requiere rol admin)
 */
router.post('/register', authenticateToken, requireAdmin, registerValidation, handleValidationErrors, register);

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Obtener lista de usuarios (Solo administradores)
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Elementos por página
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, gestor_flota, cliente]
 *         description: Filtrar por rol
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o email
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Permisos insuficientes
 */
router.get('/users', authenticateToken, requireAdmin, getUsers);

/**
 * @swagger
 * /api/auth/users/{id}:
 *   put:
 *     summary: Actualizar usuario por ID (Solo administradores)
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 15
 *               role:
 *                 type: string
 *                 enum: [admin, gestor_flota, cliente]
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Permisos insuficientes
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/users/:id', authenticateToken, requireAdmin, updateProfileValidation, handleValidationErrors, updateUser);

module.exports = router;