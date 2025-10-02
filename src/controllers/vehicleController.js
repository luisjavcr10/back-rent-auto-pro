const { Vehicle, Rental, Maintenance } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all vehicles with filtering and pagination
 */
const getVehicles = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      vehicle_type, 
      brand, 
      is_active,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (status) whereClause.status = status;
    if (vehicle_type) whereClause.vehicle_type = vehicle_type;
    if (brand) whereClause.brand = { [Op.iLike]: `%${brand}%` };
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';
    
    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { license_plate: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: vehicles } = await Vehicle.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Rental,
          as: 'rentals',
          where: { rental_status: 'active' },
          required: false,
          limit: 1,
          order: [['start_date', 'DESC']]
        }
      ]
    });

    res.json({
      success: true,
      data: {
        vehicles,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Get vehicle by ID
 */
const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByPk(id, {
      include: [
        {
          model: Rental,
          as: 'rentals',
          order: [['start_date', 'DESC']],
          limit: 5
        },
        {
          model: Maintenance,
          as: 'maintenances',
          order: [['scheduled_date', 'DESC']],
          limit: 5
        }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }

    res.json({
      success: true,
      data: { vehicle }
    });
  } catch (error) {
    console.error('Get vehicle by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Create new vehicle
 */
const createVehicle = async (req, res) => {
  try {
    const vehicleData = req.body;
    
    const vehicle = await Vehicle.create(vehicleData);

    res.status(201).json({
      success: true,
      message: 'Vehículo creado exitosamente',
      data: { vehicle }
    });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Update vehicle
 */
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }

    await vehicle.update(updateData);

    res.json({
      success: true,
      message: 'Vehículo actualizado exitosamente',
      data: { vehicle }
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Delete vehicle (soft delete)
 */
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }

    // Check if vehicle has active rentals
    const activeRentals = await Rental.count({
      where: {
        vehicle_id: id,
        rental_status: { [Op.in]: ['reserved', 'confirmed', 'active'] }
      }
    });

    if (activeRentals > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un vehículo con alquileres activos'
      });
    }

    await vehicle.update({ is_active: false, status: 'inactive' });

    res.json({
      success: true,
      message: 'Vehículo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Get available vehicles for rental
 */
const getAvailableVehicles = async (req, res) => {
  try {
    const { start_date, end_date, vehicle_type } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin son requeridas'
      });
    }

    const whereClause = {
      status: 'available',
      is_active: true
    };

    if (vehicle_type) {
      whereClause.vehicle_type = vehicle_type;
    }

    // Find vehicles that don't have conflicting rentals
    const vehicles = await Vehicle.findAll({
      where: whereClause,
      include: [
        {
          model: Rental,
          as: 'rentals',
          where: {
            rental_status: { [Op.in]: ['reserved', 'confirmed', 'active'] },
            [Op.or]: [
              {
                start_date: { [Op.between]: [start_date, end_date] }
              },
              {
                end_date: { [Op.between]: [start_date, end_date] }
              },
              {
                [Op.and]: [
                  { start_date: { [Op.lte]: start_date } },
                  { end_date: { [Op.gte]: end_date } }
                ]
              }
            ]
          },
          required: false
        }
      ]
    });

    // Filter out vehicles with conflicting rentals
    const availableVehicles = vehicles.filter(vehicle => 
      vehicle.rentals.length === 0
    );

    res.json({
      success: true,
      data: { vehicles: availableVehicles }
    });
  } catch (error) {
    console.error('Get available vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Update vehicle mileage
 */
const updateMileage = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_mileage } = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }

    if (current_mileage < vehicle.current_mileage) {
      return res.status(400).json({
        success: false,
        message: 'El kilometraje no puede ser menor al actual'
      });
    }

    await vehicle.update({ current_mileage });

    res.json({
      success: true,
      message: 'Kilometraje actualizado exitosamente',
      data: { vehicle }
    });
  } catch (error) {
    console.error('Update mileage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Get vehicle statistics
 */
const getVehicleStats = async (req, res) => {
  try {
    const stats = await Vehicle.findAll({
      attributes: [
        'status',
        [Vehicle.sequelize.fn('COUNT', Vehicle.sequelize.col('id')), 'count']
      ],
      where: { is_active: true },
      group: ['status'],
      raw: true
    });

    const totalVehicles = await Vehicle.count({ where: { is_active: true } });
    
    const maintenanceDue = await Vehicle.count({
      where: {
        is_active: true,
        [Op.or]: [
          Vehicle.sequelize.where(
            Vehicle.sequelize.col('current_mileage'),
            Op.gte,
            Vehicle.sequelize.col('next_maintenance_mileage')
          )
        ]
      }
    });

    res.json({
      success: true,
      data: {
        statusStats: stats,
        totalVehicles,
        maintenanceDue
      }
    });
  } catch (error) {
    console.error('Get vehicle stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getAvailableVehicles,
  updateMileage,
  getVehicleStats
};