const { validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Middleware to handle Sequelize validation errors
 */
const handleSequelizeErrors = (error, req, res, next) => {
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }))
    });
  }
  
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'El registro ya existe',
      errors: error.errors.map(err => ({
        field: err.path,
        message: `${err.path} ya está en uso`,
        value: err.value
      }))
    });
  }
  
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida',
      error: 'El registro referenciado no existe'
    });
  }
  
  next(error);
};

/**
 * Global error handler
 */
const globalErrorHandler = (error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = {
  handleValidationErrors,
  handleSequelizeErrors,
  globalErrorHandler
};