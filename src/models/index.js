const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Vehicle = require('./Vehicle');
const Customer = require('./Customer');
const Rental = require('./Rental');
const Maintenance = require('./Maintenance');

/**
 * Define model associations
 */

// User associations
User.hasMany(Rental, { 
  foreignKey: 'created_by', 
  as: 'createdRentals' 
});

User.hasMany(Maintenance, { 
  foreignKey: 'created_by', 
  as: 'createdMaintenances' 
});

User.hasMany(Maintenance, { 
  foreignKey: 'completed_by', 
  as: 'completedMaintenances' 
});

// Vehicle associations
Vehicle.hasMany(Rental, { 
  foreignKey: 'vehicle_id', 
  as: 'rentals' 
});

Vehicle.hasMany(Maintenance, { 
  foreignKey: 'vehicle_id', 
  as: 'maintenances' 
});

// Customer associations
Customer.hasMany(Rental, { 
  foreignKey: 'customer_id', 
  as: 'rentals' 
});

// Rental associations
Rental.belongsTo(Customer, { 
  foreignKey: 'customer_id', 
  as: 'customer' 
});

Rental.belongsTo(Vehicle, { 
  foreignKey: 'vehicle_id', 
  as: 'vehicle' 
});

Rental.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

// Maintenance associations
Maintenance.belongsTo(Vehicle, { 
  foreignKey: 'vehicle_id', 
  as: 'vehicle' 
});

Maintenance.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

Maintenance.belongsTo(User, { 
  foreignKey: 'completed_by', 
  as: 'completedBy' 
});

/**
 * Sync database function with automatic schema updates and seeds
 */
const syncDatabase = async (force = false) => {
  try {
    // Configurar sincronización automática
    // En desarrollo: alter = true permite cambios automáticos en el esquema
    // En producción: alter = false para mayor seguridad
    const syncOptions = {
      force: force,
      alter: process.env.NODE_ENV === 'development' ? true : false
    };

    await sequelize.sync(syncOptions);
    console.log('✅ Database synchronized successfully.');

    // Ejecutar seeds después de la sincronización
    const { runSeeds } = require('../seeds');
    await runSeeds();
    
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Vehicle,
  Customer,
  Rental,
  Maintenance,
  syncDatabase
};