const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Vehicle model for fleet management
 * Tracks vehicle information, status, and operational data
 */
const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  license_plate: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [6, 10]
    }
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1990,
      max: new Date().getFullYear() + 1
    }
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 30]
    }
  },
  vehicle_type: {
    type: DataTypes.ENUM('sedan', 'suv', 'hatchback', 'pickup', 'van', 'coupe'),
    allowNull: false
  },
  fuel_type: {
    type: DataTypes.ENUM('gasoline', 'diesel', 'hybrid', 'electric'),
    allowNull: false,
    defaultValue: 'gasoline'
  },
  transmission: {
    type: DataTypes.ENUM('manual', 'automatic'),
    allowNull: false,
    defaultValue: 'manual'
  },
  seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 2,
      max: 9
    }
  },
  daily_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  current_mileage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  last_maintenance_mileage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  next_maintenance_mileage: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('available', 'rented', 'maintenance', 'inactive'),
    allowNull: false,
    defaultValue: 'available'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  purchase_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  insurance_expiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  registration_expiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  vin: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      len: [17, 17]
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'vehicles',
  indexes: [
    {
      fields: ['license_plate']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_active']
    }
  ]
});

/**
 * Instance method to check if maintenance is due
 */
Vehicle.prototype.isMaintenanceDue = function() {
  if (!this.next_maintenance_mileage) return false;
  return this.current_mileage >= this.next_maintenance_mileage;
};

/**
 * Instance method to calculate days until insurance expiry
 */
Vehicle.prototype.daysUntilInsuranceExpiry = function() {
  if (!this.insurance_expiry) return null;
  const today = new Date();
  const expiry = new Date(this.insurance_expiry);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = Vehicle;