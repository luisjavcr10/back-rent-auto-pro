const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware - Headers:', req.headers['authorization']);
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ Auth middleware - No token provided');
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    console.log('🔑 Auth middleware - Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Auth middleware - Token decoded:', { userId: decoded.userId });
    
    // Find user and check if still active
    const user = await User.findByPk(decoded.userId);
    console.log('👤 Auth middleware - User found:', user ? { id: user.id, role: user.role, is_active: user.is_active } : 'null');
    
    if (!user || !user.is_active) {
      console.log('❌ Auth middleware - User not found or inactive');
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido o inactivo'
      });
    }

    req.user = user;
    console.log('✅ Auth middleware - User set in req.user:', { id: user.id, role: user.role });
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Token inválido'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    console.log('🛡️ Role middleware - Required roles:', roles);
    console.log('👤 Role middleware - User in req:', req.user ? { id: req.user.id, role: req.user.role } : 'null');
    
    if (!req.user) {
      console.log('❌ Role middleware - No user in request');
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    console.log('🔍 Role middleware - Checking if role', req.user.role, 'is in', roles);
    
    if (!roles.includes(req.user.role)) {
      console.log('❌ Role middleware - Role not authorized:', req.user.role, 'not in', roles);
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    console.log('✅ Role middleware - Access granted for role:', req.user.role);
    next();
  };
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware to check if user is admin or fleet manager
 */
const requireAdminOrFleetManager = requireRole('admin', 'gestor_flota');

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      if (user && user.is_active) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireAdminOrFleetManager,
  optionalAuth
};