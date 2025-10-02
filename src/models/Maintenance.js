const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Maintenance model for vehicle maintenance management
 * Supports preventive, corrective, predictive, and scheduled maintenance
 */
const Maintenance = sequelize.define('Maintenance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  maintenance_number: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  vehicle_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vehicles',
      key: 'id'
    }
  },
  maintenance_type: {
    type: DataTypes.ENUM('preventive', 'corrective', 'predictive', 'scheduled'),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [5, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  scheduled_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  completed_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  mileage_at_maintenance: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  estimated_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  actual_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  service_provider: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [2, 100]
    }
  },
  service_provider_contact: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [8, 50]
    }
  },
  parts_replaced: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of objects with part details: [{name, quantity, cost, part_number}]'
  },
  labor_hours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  labor_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'),
    allowNull: false,
    defaultValue: 'scheduled'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },
  next_maintenance_mileage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  next_maintenance_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  warranty_expiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  invoice_number: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [3, 50]
    }
  },
  notes: {
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
  },
  completed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'maintenances',
  hooks: {
    beforeCreate: (maintenance) => {
      // Generate maintenance number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      maintenance.maintenance_number = `MNT-${year}${month}${day}-${random}`;
    },
    beforeUpdate: (maintenance) => {
      // Auto-update status based on dates
      const today = new Date();
      const scheduledDate = new Date(maintenance.scheduled_date);
      
      if (maintenance.completed_date) {
        maintenance.status = 'completed';
      } else if (scheduledDate < today && maintenance.status === 'scheduled') {
        maintenance.status = 'overdue';
      }
    }
  },
  indexes: [
    {
      fields: ['maintenance_number']
    },
    {
      fields: ['vehicle_id']
    },
    {
      fields: ['maintenance_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['scheduled_date']
    }
  ]
});

/**
 * Instance method to check if maintenance is overdue
 */
Maintenance.prototype.isOverdue = function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  const today = new Date();
  return new Date(this.scheduled_date) < today;
};

/**
 * Instance method to calculate days until scheduled maintenance
 */
Maintenance.prototype.daysUntilScheduled = function() {
  const today = new Date();
  const scheduledDate = new Date(this.scheduled_date);
  const diffTime = scheduledDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Instance method to calculate total cost
 */
Maintenance.prototype.getTotalCost = function() {
  const laborCost = parseFloat(this.labor_cost) || 0;
  const partsCost = this.parts_replaced ? 
    this.parts_replaced.reduce((total, part) => total + (parseFloat(part.cost) || 0), 0) : 0;
  
  return laborCost + partsCost;
};

module.exports = Maintenance;