/**
 * Controlador de Reportes - Maneja la generación de reportes de ingresos, costos y disponibilidad
 */
const { Op, fn, col, literal } = require('sequelize');
const { Rental, Vehicle, Maintenance, Customer } = require('../models');

/**
 * Obtiene reportes de ingresos por alquileres
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getIncomeReports = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      groupBy = 'month', // day, week, month, year
      vehicleId 
    } = req.query;

    // Construir filtros de fecha
    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    // Construir filtros adicionales
    const whereClause = {
      rental_status: { [Op.in]: ['completed', 'active'] }
    };
    
    if (Object.keys(dateFilter).length > 0) {
      whereClause.start_date = dateFilter;
    }
    
    if (vehicleId) {
      whereClause.vehicle_id = vehicleId;
    }

    // Configurar agrupación por período (PostgreSQL format)
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'YYYY-IW';
        break;
      case 'year':
        dateFormat = 'YYYY';
        break;
      default: // month
        dateFormat = 'YYYY-MM';
    }

    // Consulta principal de ingresos
    const incomeData = await Rental.findAll({
      attributes: [
        [fn('TO_CHAR', col('start_date'), dateFormat), 'period'],
        [fn('COUNT', col('id')), 'total_rentals'],
        [fn('SUM', col('total_amount')), 'total_income'],
        [fn('AVG', col('total_amount')), 'average_rental_amount'],
        [fn('SUM', col('daily_rate')), 'total_daily_rates']
      ],
      where: {
        rental_status: { [Op.in]: ['completed', 'active'] },
        ...(Object.keys(dateFilter).length > 0 && { start_date: dateFilter }),
        ...(vehicleId && { vehicle_id: vehicleId })
      },
      group: [fn('TO_CHAR', col('start_date'), dateFormat)],
      order: [[fn('TO_CHAR', col('start_date'), dateFormat), 'ASC']],
      raw: true
    });

    // Estadísticas generales
    const totalStats = await Rental.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total_rentals'],
        [fn('SUM', col('total_amount')), 'total_income'],
        [fn('AVG', col('total_amount')), 'average_rental_amount'],
        [fn('MAX', col('total_amount')), 'highest_rental'],
        [fn('MIN', col('total_amount')), 'lowest_rental']
      ],
      where: whereClause,
      raw: true
    });

    // Top vehículos por ingresos
    const topVehicles = await Rental.findAll({
      attributes: [
        'vehicle_id',
        [fn('COUNT', col('Rental.id')), 'rental_count'],
        [fn('SUM', col('total_amount')), 'total_income']
      ],
      include: [{
        model: Vehicle,
        as: 'vehicle',
        attributes: ['brand', 'model', 'year', 'license_plate']
      }],
      where: whereClause,
      group: ['vehicle_id', 'vehicle.id', 'vehicle.brand', 'vehicle.model', 'vehicle.year', 'vehicle.license_plate'],
      order: [[fn('SUM', col('total_amount')), 'DESC']],
      limit: 10
    });

    // Top clientes por ingresos
    const topCustomers = await Rental.findAll({
      attributes: [
        'customer_id',
        [fn('COUNT', col('Rental.id')), 'rental_count'],
        [fn('SUM', col('total_amount')), 'total_spent']
      ],
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['first_name', 'last_name', 'email']
      }],
      where: whereClause,
      group: ['customer_id', 'customer.id', 'customer.first_name', 'customer.last_name', 'customer.email'],
      order: [[fn('SUM', col('total_amount')), 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        income_by_period: incomeData,
        total_stats: totalStats,
        top_vehicles: topVehicles,
        top_customers: topCustomers,
        filters: {
          startDate,
          endDate,
          groupBy,
          vehicleId
        }
      }
    });

  } catch (error) {
    console.error('Error getting income reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reportes de ingresos',
      error: error.message
    });
  }
};

/**
 * Obtiene reportes de costos de mantenimiento
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getMaintenanceCostReports = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      groupBy = 'month',
      vehicleId,
      maintenanceType 
    } = req.query;

    // Construir filtros de fecha
    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    // Construir filtros adicionales
    const whereClause = {
      status: 'completed'
    };
    
    if (Object.keys(dateFilter).length > 0) {
      whereClause.completed_date = dateFilter;
    }
    
    if (vehicleId) {
      whereClause.vehicle_id = vehicleId;
    }
    
    if (maintenanceType) {
      whereClause.maintenance_type = maintenanceType;
    }

    // Configurar agrupación por período (PostgreSQL format)
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'YYYY-IW';
        break;
      case 'year':
        dateFormat = 'YYYY';
        break;
      default: // month
        dateFormat = 'YYYY-MM';
    }

    // Consulta principal de costos de mantenimiento
    const maintenanceCosts = await Maintenance.findAll({
      attributes: [
        [fn('TO_CHAR', col('completed_date'), dateFormat), 'period'],
        [fn('COUNT', col('id')), 'total_maintenances'],
        [fn('SUM', col('actual_cost')), 'total_cost'],
        [fn('AVG', col('actual_cost')), 'average_cost'],
        'maintenance_type'
      ],
      where: whereClause,
      group: [
        fn('TO_CHAR', col('completed_date'), dateFormat),
        'maintenance_type'
      ],
      order: [
        [fn('TO_CHAR', col('completed_date'), dateFormat), 'ASC'],
        ['maintenance_type', 'ASC']
      ],
      raw: true
    });

    // Estadísticas generales por tipo de mantenimiento
    const costsByType = await Maintenance.findAll({
      attributes: [
        'maintenance_type',
        [fn('COUNT', col('id')), 'total_count'],
        [fn('SUM', col('actual_cost')), 'total_cost'],
        [fn('AVG', col('actual_cost')), 'average_cost'],
        [fn('MAX', col('actual_cost')), 'highest_cost'],
        [fn('MIN', col('actual_cost')), 'lowest_cost']
      ],
      where: whereClause,
      group: ['maintenance_type'],
      order: [[fn('SUM', col('actual_cost')), 'DESC']],
      raw: true
    });

    // Vehículos con mayores costos de mantenimiento
    const vehiclesCosts = await Maintenance.findAll({
      attributes: [
        'vehicle_id',
        [fn('COUNT', col('Maintenance.id')), 'maintenance_count'],
        [fn('SUM', col('actual_cost')), 'total_cost'],
        [fn('AVG', col('actual_cost')), 'average_cost']
      ],
      include: [{
        model: Vehicle,
        as: 'vehicle',
        attributes: ['brand', 'model', 'year', 'license_plate', 'mileage']
      }],
      where: whereClause,
      group: ['vehicle_id', 'vehicle.id', 'vehicle.brand', 'vehicle.model', 'vehicle.year', 'vehicle.license_plate', 'vehicle.mileage'],
      order: [[fn('SUM', col('actual_cost')), 'DESC']],
      limit: 10
    });

    // Estadísticas totales
    const totalStats = await Maintenance.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total_maintenances'],
        [fn('SUM', col('actual_cost')), 'total_cost'],
        [fn('AVG', col('actual_cost')), 'average_cost']
      ],
      where: whereClause,
      raw: true
    });

    res.json({
      success: true,
      data: {
        costs_by_period: maintenanceCosts,
        costs_by_type: costsByType,
        vehicles_costs: vehiclesCosts,
        total_stats: totalStats,
        filters: {
          startDate,
          endDate,
          groupBy,
          vehicleId,
          maintenanceType
        }
      }
    });

  } catch (error) {
    console.error('Error getting maintenance cost reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reportes de costos de mantenimiento',
      error: error.message
    });
  }
};

/**
 * Obtiene reportes de disponibilidad de la flota
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getFleetAvailabilityReports = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      groupBy = 'month' 
    } = req.query;

    // Obtener todos los vehículos
    const totalVehicles = await Vehicle.count({
      where: { status: { [Op.ne]: 'inactive' } }
    });

    // Construir filtros de fecha para alquileres
    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    // Configurar agrupación por período (PostgreSQL format)
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'YYYY-IW';
        break;
      case 'year':
        dateFormat = 'YYYY';
        break;
      default: // month
        dateFormat = 'YYYY-MM';
    }

    // Disponibilidad por período
    const availabilityByPeriod = await Rental.findAll({
      attributes: [
        [fn('TO_CHAR', col('start_date'), dateFormat), 'period'],
        [fn('COUNT', fn('DISTINCT', col('vehicle_id'))), 'vehicles_rented'],
        [fn('COUNT', col('id')), 'total_rentals']
      ],
      where: {
        rental_status: { [Op.in]: ['active', 'completed'] },
        ...(Object.keys(dateFilter).length > 0 && { start_date: dateFilter })
      },
      group: [fn('TO_CHAR', col('start_date'), dateFormat)],
      order: [[fn('TO_CHAR', col('start_date'), dateFormat), 'ASC']],
      raw: true
    });

    // Calcular disponibilidad
    const availabilityData = availabilityByPeriod.map(period => ({
      ...period,
      total_vehicles: totalVehicles,
      vehicles_available: totalVehicles - period.vehicles_rented,
      utilization_rate: ((period.vehicles_rented / totalVehicles) * 100).toFixed(2)
    }));

    // Estado actual de la flota
    const currentFleetStatus = await Vehicle.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      where: { status: { [Op.ne]: 'inactive' } },
      group: ['status'],
      raw: true
    });

    // Vehículos actualmente alquilados
    const currentlyRented = await Rental.findAll({
      attributes: ['vehicle_id'],
      include: [{
        model: Vehicle,
        as: 'vehicle',
        attributes: ['brand', 'model', 'license_plate', 'status']
      }],
      where: {
        rental_status: 'active',
        start_date: { [Op.lte]: new Date() },
        end_date: { [Op.gte]: new Date() }
      }
    });

    // Vehículos en mantenimiento
    const inMaintenance = await Maintenance.findAll({
      attributes: ['vehicle_id'],
      include: [{
        model: Vehicle,
        as: 'vehicle',
        attributes: ['brand', 'model', 'license_plate']
      }],
      where: {
        status: { [Op.in]: ['scheduled', 'in_progress'] }
      }
    });

    // Métricas de utilización por vehículo
    const vehicleUtilization = await Vehicle.findAll({
      attributes: [
        'id',
        'brand',
        'model',
        'license_plate',
        'status',
        [
          literal(`(
            SELECT COUNT(*) 
            FROM rentals 
            WHERE rentals.vehicle_id = Vehicle.id 
            AND rentals.rental_status IN ('completed', 'active')
            ${Object.keys(dateFilter).length > 0 ? 
              `AND rentals.start_date >= '${startDate}' AND rentals.start_date <= '${endDate}'` : 
              ''
            }
          )`),
          'total_rentals'
        ],
        [
          literal(`(
            SELECT COALESCE(SUM(DATEDIFF(
              LEAST(rentals.end_date, CURDATE()),
              GREATEST(rentals.start_date, '${startDate || '1900-01-01'}')
            )), 0)
            FROM rentals 
            WHERE rentals.vehicle_id = Vehicle.id 
            AND rentals.rental_status IN ('completed', 'active')
            ${Object.keys(dateFilter).length > 0 ? 
              `AND rentals.start_date <= '${endDate}' AND rentals.end_date >= '${startDate}'` : 
              ''
            }
          )`),
          'days_rented'
        ]
      ],
      where: { status: { [Op.ne]: 'inactive' } },
      order: [['brand', 'ASC'], ['model', 'ASC']]
    });

    // Calcular días totales del período para utilización
    const periodStart = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = endDate ? new Date(endDate) : new Date();
    const totalDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));

    const vehicleUtilizationWithRate = vehicleUtilization.map(vehicle => {
      const daysRented = parseInt(vehicle.dataValues.days_rented) || 0;
      const utilizationRate = totalDays > 0 ? ((daysRented / totalDays) * 100).toFixed(2) : 0;
      
      return {
        ...vehicle.toJSON(),
        days_rented: daysRented,
        total_days_in_period: totalDays,
        utilization_rate: utilizationRate
      };
    });

    res.json({
      success: true,
      data: {
        availability_by_period: availabilityData,
        current_fleet_status: currentFleetStatus,
        currently_rented: currentlyRented,
        in_maintenance: inMaintenance,
        vehicle_utilization: vehicleUtilizationWithRate,
        summary: {
          total_vehicles: totalVehicles,
          currently_available: totalVehicles - currentlyRented.length - inMaintenance.length,
          currently_rented: currentlyRented.length,
          in_maintenance: inMaintenance.length,
          overall_utilization: totalVehicles > 0 ? 
            ((currentlyRented.length / totalVehicles) * 100).toFixed(2) : 0
        },
        filters: {
          startDate,
          endDate,
          groupBy
        }
      }
    });

  } catch (error) {
    console.error('Error getting fleet availability reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reportes de disponibilidad de flota',
      error: error.message
    });
  }
};

/**
 * Obtiene un resumen ejecutivo de todos los reportes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getExecutiveSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Construir filtros de fecha
    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    // Resumen de ingresos
    const incomeStats = await Rental.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total_rentals'],
        [fn('SUM', col('total_amount')), 'total_income'],
        [fn('AVG', col('total_amount')), 'average_rental']
      ],
      where: {
        rental_status: { [Op.in]: ['completed', 'active'] },
        ...(Object.keys(dateFilter).length > 0 && { start_date: dateFilter })
      },
      raw: true
    });

    // Resumen de costos de mantenimiento
    const maintenanceStats = await Maintenance.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total_maintenances'],
        [fn('SUM', col('actual_cost')), 'total_cost'],
        [fn('AVG', col('actual_cost')), 'average_cost']
      ],
      where: {
        status: 'completed',
        ...(Object.keys(dateFilter).length > 0 && { completed_date: dateFilter })
      },
      raw: true
    });

    // Resumen de flota
    const fleetStats = await Vehicle.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      where: { status: { [Op.ne]: 'inactive' } },
      group: ['status'],
      raw: true
    });

    const totalVehicles = fleetStats.reduce((sum, item) => sum + parseInt(item.count), 0);
    const availableVehicles = fleetStats.find(item => item.status === 'available')?.count || 0;

    res.json({
      success: true,
      data: {
        income: {
          total_rentals: parseInt(incomeStats.total_rentals) || 0,
          total_income: parseFloat(incomeStats.total_income) || 0,
          average_rental: parseFloat(incomeStats.average_rental) || 0
        },
        maintenance: {
          total_maintenances: parseInt(maintenanceStats.total_maintenances) || 0,
          total_cost: parseFloat(maintenanceStats.total_cost) || 0,
          average_cost: parseFloat(maintenanceStats.average_cost) || 0
        },
        fleet: {
          total_vehicles: totalVehicles,
          available_vehicles: parseInt(availableVehicles),
          utilization_rate: totalVehicles > 0 ? 
            (((totalVehicles - parseInt(availableVehicles)) / totalVehicles) * 100).toFixed(2) : 0,
          fleet_breakdown: fleetStats
        },
        profitability: {
          gross_income: parseFloat(incomeStats.total_income) || 0,
          maintenance_costs: parseFloat(maintenanceStats.total_cost) || 0,
          net_income: (parseFloat(incomeStats.total_income) || 0) - (parseFloat(maintenanceStats.total_cost) || 0),
          profit_margin: (parseFloat(incomeStats.total_income) || 0) > 0 ? 
            ((((parseFloat(incomeStats.total_income) || 0) - (parseFloat(maintenanceStats.total_cost) || 0)) / 
              (parseFloat(incomeStats.total_income) || 0)) * 100).toFixed(2) : 0
        },
        filters: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Error getting executive summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen ejecutivo',
      error: error.message
    });
  }
};

module.exports = {
  getIncomeReports,
  getMaintenanceCostReports,
  getFleetAvailabilityReports,
  getExecutiveSummary
};