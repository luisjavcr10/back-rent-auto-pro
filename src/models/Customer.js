const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Customer model for rental client management
 * Stores customer information and rental history
 */
const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8, 15]
    }
  },
  document_type: {
    type: DataTypes.ENUM('dni', 'passport', 'license'),
    allowNull: false,
    defaultValue: 'dni'
  },
  document_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [8, 20]
    }
  },
  date_of_birth: {
    type: DataTypes.DATE,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Chile',
    validate: {
      len: [2, 50]
    }
  },
  driver_license_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [8, 20]
    }
  },
  driver_license_expiry: {
    type: DataTypes.DATE,
    allowNull: false
  },
  emergency_contact_name: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [2, 100]
    }
  },
  emergency_contact_phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [8, 15]
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'customers',
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['document_number']
    },
    {
      fields: ['driver_license_number']
    }
  ]
});

/**
 * Instance method to get full name
 */
Customer.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

/**
 * Instance method to check if driver license is expired
 */
Customer.prototype.isDriverLicenseExpired = function() {
  const today = new Date();
  return new Date(this.driver_license_expiry) < today;
};

/**
 * Instance method to calculate age
 */
Customer.prototype.getAge = function() {
  const today = new Date();
  const birthDate = new Date(this.date_of_birth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

module.exports = Customer;