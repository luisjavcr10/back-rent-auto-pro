const { Maintenance, Vehicle, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all maintenances with filtering and pagination
 */
const getMaintenances = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      maintenance_type,
      status,
      priority,
      vehicle_id,
      start_date,
      end_date,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (maintenance_type) whereClause.maintenance_type = maintenance_type;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (vehicle_id) whereClause.vehicle_id = vehicle_id;
    
    // Date range filter
    if (start_date && end_date) {
      whereClause.scheduled_date = { [Op.between]: [start_date, end_date] };
    }
    
    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { maintenance_number: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: maintenances } = await Maintenance.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['scheduled_date', 'ASC']],
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'brand', 'model', 'year', 'current_mileage']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'completedBy',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: {
        maintenances,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get maintenances error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Get maintenance by ID
 */
const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenance = await Maintenance.findByPk(id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'completedBy',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false
        }
      ]
    });

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Mantenimiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: { maintenance }
    });
  } catch (error) {
    console.error('Get maintenance by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Create new maintenance
 */
const createMaintenance = async (req, res) => {
  try {
    const maintenanceData = {
      ...req.body,
      created_by: req.user.id
    };
    
    // Validate vehicle exists
    const vehicle = await Vehicle.findByPk(maintenanceData.vehicle_id);
    if (!vehicle || !vehicle.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Vehículo no encontrado o inactivo'
      });
    }

    const maintenance = await Maintenance.create(maintenanceData);

    // If maintenance is scheduled and critical, update vehicle status
    if (maintenance.priority === 'critical' && maintenance.status === 'scheduled') {
      await vehicle.update({ status: 'maintenance' });
    }

    // Fetch complete maintenance data
    const completeMaintenance = await Maintenance.findByPk(maintenance.id, {
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Mantenimiento creado exitosamente',
      data: { maintenance: completeMaintenance }
    });
  } catch (error) {
    console.error('Create maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Update maintenance
 */
const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const maintenance = await Maintenance.findByPk(id, {
      include: [{ model: Vehicle, as: 'vehicle' }]
    });

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Mantenimiento no encontrado'
      });
    }

    // If completing maintenance, add completion data
    if (updateData.status === 'completed' && maintenance.status !== 'completed') {
      updateData.completed_date = new Date();
      updateData.completed_by = req.user.id;

      // Update vehicle status back to available if it was in maintenance
      if (maintenance.vehicle && maintenance.vehicle.status === 'maintenance') {
        await maintenance.vehicle.update({ status: 'available' });
      }

      // Update vehicle mileage if provided
      if (updateData.mileage_at_maintenance && maintenance.vehicle) {
        await maintenance.vehicle.update({ 
          current_mileage: updateData.mileage_at_maintenance,
          last_maintenance_mileage: updateData.mileage_at_maintenance
        });
      }
    }

    await maintenance.update(updateData);

    const updatedMaintenance = await Maintenance.findByPk(id, {
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'completedBy', attributes: ['id', 'first_name', 'last_name'], required: false }
      ]
    });

    res.json({
      success: true,
      message: 'Mantenimiento actualizado exitosamente',
      data: { maintenance: updatedMaintenance }
    });
  } catch (error) {
    console.error('Update maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Delete maintenance
 */
const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenance = await Maintenance.findByPk(id);
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Mantenimiento no encontrado'
      });
    }

    // Prevent deletion of completed maintenances
    if (maintenance.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un mantenimiento completado'
      });
    }

    await maintenance.destroy();

    res.json({
      success: true,
      message: 'Mantenimiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Delete maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Start maintenance
 */
const startMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { mileage_at_maintenance } = req.body;

    const maintenance = await Maintenance.findByPk(id, {
      include: [{ model: Vehicle, as: 'vehicle' }]
    });

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Mantenimiento no encontrado'
      });
    }

    if (maintenance.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'El mantenimiento debe estar programado para iniciar'
      });
    }

    await maintenance.update({
      status: 'in_progress',
      mileage_at_maintenance
    });

    // Update vehicle status to maintenance
    if (maintenance.vehicle) {
      await maintenance.vehicle.update({ status: 'maintenance' });
    }

    res.json({
      success: true,
      message: 'Mantenimiento iniciado exitosamente'
    });
  } catch (error) {
    console.error('Start maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Complete maintenance
 */
const completeMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      actual_cost,
      parts_replaced,
      labor_hours,
      labor_cost,
      invoice_number,
      warranty_expiry,
      next_maintenance_mileage,
      next_maintenance_date,
      notes
    } = req.body;

    const maintenance = await Maintenance.findByPk(id, {
      include: [{ model: Vehicle, as: 'vehicle' }]
    });

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Mantenimiento no encontrado'
      });
    }

    if (maintenance.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'El mantenimiento debe estar en progreso para completar'
      });
    }

    await maintenance.update({
      status: 'completed',
      completed_date: new Date(),
      completed_by: req.user.id,
      actual_cost,
      parts_replaced,
      labor_hours,
      labor_cost,
      invoice_number,
      warranty_expiry,
      next_maintenance_mileage,
      next_maintenance_date,
      notes
    });

    // Update vehicle status and maintenance info
    if (maintenance.vehicle) {
      const updateData = { 
        status: 'available',
        last_maintenance_mileage: maintenance.mileage_at_maintenance
      };
      
      if (next_maintenance_mileage) {
        updateData.next_maintenance_mileage = next_maintenance_mileage;
      }

      await maintenance.vehicle.update(updateData);
    }

    res.json({
      success: true,
      message: 'Mantenimiento completado exitosamente'
    });
  } catch (error) {
    console.error('Complete maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Get maintenance statistics
 */
const getMaintenanceStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const dateFilter = {};
    if (start_date && end_date) {
      dateFilter.scheduled_date = { [Op.between]: [start_date, end_date] };
    }

    const totalMaintenances = await Maintenance.count({ where: dateFilter });
    
    const scheduledMaintenances = await Maintenance.count({
      where: { ...dateFilter, status: 'scheduled' }
    });

    const inProgressMaintenances = await Maintenance.count({
      where: { ...dateFilter, status: 'in_progress' }
    });

    const completedMaintenances = await Maintenance.count({
      where: { ...dateFilter, status: 'completed' }
    });

    const overdueMaintenances = await Maintenance.count({
      where: {
        status: { [Op.in]: ['scheduled', 'in_progress'] },
        scheduled_date: { [Op.lt]: new Date() }
      }
    });

    const criticalMaintenances = await Maintenance.count({
      where: { 
        ...dateFilter, 
        priority: 'critical',
        status: { [Op.ne]: 'completed' }
      }
    });

    const totalCost = await Maintenance.sum('actual_cost', {
      where: { ...dateFilter, status: 'completed' }
    });

    // Maintenance by type
    const maintenanceByType = await Maintenance.findAll({
      attributes: [
        'maintenance_type',
        [Maintenance.sequelize.fn('COUNT', Maintenance.sequelize.col('id')), 'count']
      ],
      where: dateFilter,
      group: ['maintenance_type'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        totalMaintenances,
        scheduledMaintenances,
        inProgressMaintenances,
        completedMaintenances,
        overdueMaintenances,
        criticalMaintenances,
        totalCost: totalCost || 0,
        maintenanceByType
      }
    });
  } catch (error) {
    console.error('Get maintenance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Get vehicles due for maintenance
 */
const getVehiclesDueForMaintenance = async (req, res) => {
  try {
    const { days_ahead = 30 } = req.query;
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days_ahead));

    // Vehicles due by mileage
    const vehiclesDueByMileage = await Vehicle.findAll({
      where: {
        is_active: true,
        next_maintenance_mileage: {
          [Op.lte]: Vehicle.sequelize.col('current_mileage')
        }
      },
      attributes: ['id', 'license_plate', 'brand', 'model', 'current_mileage', 'next_maintenance_mileage']
    });

    // Vehicles with overdue scheduled maintenances
    const vehiclesWithOverdueMaintenances = await Vehicle.findAll({
      include: [
        {
          model: Maintenance,
          as: 'maintenances',
          where: {
            status: { [Op.in]: ['scheduled', 'in_progress'] },
            scheduled_date: { [Op.lt]: new Date() }
          },
          attributes: ['id', 'title', 'scheduled_date', 'priority', 'maintenance_type']
        }
      ],
      attributes: ['id', 'license_plate', 'brand', 'model']
    });

    // Vehicles with upcoming scheduled maintenances
    const vehiclesWithUpcomingMaintenances = await Vehicle.findAll({
      include: [
        {
          model: Maintenance,
          as: 'maintenances',
          where: {
            status: 'scheduled',
            scheduled_date: { [Op.between]: [new Date(), futureDate] }
          },
          attributes: ['id', 'title', 'scheduled_date', 'priority', 'maintenance_type']
        }
      ],
      attributes: ['id', 'license_plate', 'brand', 'model']
    });

    res.json({
      success: true,
      data: {
        vehiclesDueByMileage,
        vehiclesWithOverdueMaintenances,
        vehiclesWithUpcomingMaintenances
      }
    });
  } catch (error) {
    console.error('Get vehicles due for maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getMaintenances,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  startMaintenance,
  completeMaintenance,
  getMaintenanceStats,
  getVehiclesDueForMaintenance
};