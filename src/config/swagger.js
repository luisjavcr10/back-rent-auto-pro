const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Configuración de Swagger para documentación de API
 * RentAutoPro - Sistema de Gestión de Alquiler de Vehículos
 */

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RentAutoPro API',
      version: '1.0.0',
      description: `
        API REST para el sistema de gestión integral de alquiler de vehículos RentAutoPro.
        
        ## Características principales:
        - Gestión de usuarios y roles (admin, gestor_flota, cliente)
        - CRUD completo de vehículos
        - Sistema de alquiler digital
        - Gestión de mantenimientos
        - Reportes y analytics
        
        ## Autenticación:
        La API utiliza JWT (JSON Web Tokens) para autenticación. 
        Incluye el token en el header Authorization: Bearer <token>
      `,
      contact: {
        name: 'RentAutoPro Support',
        email: 'support@rentautopro.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3001',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del endpoint /api/auth/login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password', 'first_name', 'last_name', 'role'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único del usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario (único)'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'Contraseña del usuario'
            },
            first_name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Nombre del usuario'
            },
            last_name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Apellido del usuario'
            },
            phone: {
              type: 'string',
              description: 'Teléfono del usuario'
            },
            role: {
              type: 'string',
              enum: ['admin', 'gestor_flota', 'cliente'],
              description: 'Rol del usuario en el sistema'
            },
            is_active: {
              type: 'boolean',
              description: 'Estado activo del usuario'
            },
            last_login: {
              type: 'string',
              format: 'date-time',
              description: 'Último inicio de sesión'
            }
          }
        },
        Vehicle: {
          type: 'object',
          required: ['license_plate', 'brand', 'model', 'year', 'vehicle_type', 'daily_rate'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único del vehículo'
            },
            license_plate: {
              type: 'string',
              description: 'Placa del vehículo (única)'
            },
            brand: {
              type: 'string',
              description: 'Marca del vehículo'
            },
            model: {
              type: 'string',
              description: 'Modelo del vehículo'
            },
            year: {
              type: 'integer',
              minimum: 1900,
              description: 'Año del vehículo'
            },
            color: {
              type: 'string',
              description: 'Color del vehículo'
            },
            vehicle_type: {
              type: 'string',
              enum: ['sedan', 'suv', 'hatchback', 'pickup', 'van', 'convertible', 'coupe'],
              description: 'Tipo de vehículo'
            },
            fuel_type: {
              type: 'string',
              enum: ['gasoline', 'diesel', 'electric', 'hybrid'],
              description: 'Tipo de combustible'
            },
            transmission: {
              type: 'string',
              enum: ['manual', 'automatic'],
              description: 'Tipo de transmisión'
            },
            seats: {
              type: 'integer',
              minimum: 1,
              description: 'Número de asientos'
            },
            daily_rate: {
              type: 'number',
              minimum: 0,
              description: 'Tarifa diaria de alquiler'
            },
            current_mileage: {
              type: 'integer',
              minimum: 0,
              description: 'Kilometraje actual'
            },
            status: {
              type: 'string',
              enum: ['available', 'rented', 'maintenance', 'out_of_service'],
              description: 'Estado actual del vehículo'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario'
            },
            password: {
              type: 'string',
              description: 'Contraseña del usuario'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica si la operación fue exitosa'
            },
            message: {
              type: 'string',
              description: 'Mensaje descriptivo'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                token: {
                  type: 'string',
                  description: 'JWT token para autenticación'
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Mensaje de error'
            },
            error: {
              type: 'string',
              description: 'Detalles técnicos del error'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

/**
 * Configurar Swagger UI con opciones personalizadas
 */
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2563eb }
  `,
  customSiteTitle: 'RentAutoPro API Documentation'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};