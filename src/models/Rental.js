const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Rental model for managing vehicle rentals
 * Tracks rental process from reservation to return
 */
const Rental = sequelize.define('Rental', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rental_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  vehicle_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vehicles',
      key: 'id'
    }
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  actual_return_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  pickup_location: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [5, 200]
    }
  },
  return_location: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [5, 200]
    }
  },
  daily_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  total_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  additional_charges: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  deposit_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'partial', 'paid', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  rental_status: {
    type: DataTypes.ENUM('reserved', 'confirmed', 'active', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'reserved'
  },
  pickup_mileage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  return_mileage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  fuel_level_pickup: {
    type: DataTypes.ENUM('empty', 'quarter', 'half', 'three_quarters', 'full'),
    allowNull: true,
    defaultValue: 'full'
  },
  fuel_level_return: {
    type: DataTypes.ENUM('empty', 'quarter', 'half', 'three_quarters', 'full'),
    allowNull: true
  },
  damage_notes_pickup: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  damage_notes_return: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  additional_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'rentals',
  hooks: {
    beforeCreate: (rental) => {
      // Generate rental number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      rental.rental_number = `RNT-${year}${month}${day}-${random}`;
    }
  },
  indexes: [
    {
      fields: ['rental_number']
    },
    {
      fields: ['customer_id']
    },
    {
      fields: ['vehicle_id']
    },
    {
      fields: ['rental_status']
    },
    {
      fields: ['start_date', 'end_date']
    }
  ]
});

/**
 * Instance method to check if rental is overdue
 */
Rental.prototype.isOverdue = function() {
  if (this.rental_status === 'completed' || this.rental_status === 'cancelled') {
    return false;
  }
  const today = new Date();
  return new Date(this.end_date) < today;
};

/**
 * Instance method to calculate total mileage driven
 */
Rental.prototype.getTotalMileage = function() {
  if (!this.pickup_mileage || !this.return_mileage) return 0;
  return this.return_mileage - this.pickup_mileage;
};

/**
 * Instance method to calculate late fees
 */
Rental.prototype.calculateLateFees = function(dailyLateFee = 50) {
  if (!this.isOverdue()) return 0;
  
  const endDate = new Date(this.end_date);
  const today = new Date();
  const daysLate = Math.ceil((today - endDate) / (1000 * 60 * 60 * 24));
  
  return daysLate * dailyLateFee;
};

module.exports = Rental;