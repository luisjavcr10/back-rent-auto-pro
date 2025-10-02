const { Rental, Customer, Vehicle, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all rentals with filtering and pagination
 */
const getRentals = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      rental_status,
      payment_status,
      customer_id,
      vehicle_id,
      start_date,
      end_date,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (rental_status) whereClause.rental_status = rental_status;
    if (payment_status) whereClause.payment_status = payment_status;
    if (customer_id) whereClause.customer_id = customer_id;
    if (vehicle_id) whereClause.vehicle_id = vehicle_id;
    
    // Date range filter
    if (start_date && end_date) {
      whereClause[Op.or] = [
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
      ];
    }
    
    // Search functionality
    if (search) {
      whereClause.rental_number = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows: rentals } = await Rental.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'brand', 'model', 'year', 'status']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        rentals,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get rentals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Get rental by ID
 */
const getRentalById = async (req, res) => {
  try {
    const { id } = req.params;

    const rental = await Rental.findByPk(id, {
      include: [
        {
          model: Customer,
          as: 'customer'
        },
        {
          model: Vehicle,
          as: 'vehicle'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: 'Alquiler no encontrado'
      });
    }

    res.json({
      success: true,
      data: { rental }
    });
  } catch (error) {
    console.error('Get rental by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Create new rental
 */
const createRental = async (req, res) => {
  try {
    const rentalData = {
      ...req.body,
      created_by: req.user.id
    };
    
    // Validate customer exists and is active
    const customer = await Customer.findByPk(rentalData.customer_id);
    if (!customer || !customer.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cliente no encontrado o inactivo'
      });
    }

    // Validate vehicle exists and is available
    const vehicle = await Vehicle.findByPk(rentalData.vehicle_id);
    if (!vehicle || !vehicle.is_active || vehicle.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Vehículo no disponible'
      });
    }

    // Check for conflicting rentals
    const conflictingRentals = await Rental.count({
      where: {
        vehicle_id: rentalData.vehicle_id,
        rental_status: { [Op.in]: ['reserved', 'confirmed', 'active'] },
        [Op.or]: [
          {
            start_date: { [Op.between]: [rentalData.start_date, rentalData.end_date] }
          },
          {
            end_date: { [Op.between]: [rentalData.start_date, rentalData.end_date] }
          },
          {
            [Op.and]: [
              { start_date: { [Op.lte]: rentalData.start_date } },
              { end_date: { [Op.gte]: rentalData.end_date } }
            ]
          }
        ]
      }
    });

    if (conflictingRentals > 0) {
      return res.status(400).json({
        success: false,
        message: 'El vehículo ya tiene reservas en las fechas seleccionadas'
      });
    }

    // Calculate rental details
    const startDate = new Date(rentalData.start_date);
    const endDate = new Date(rentalData.end_date);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    rentalData.total_days = totalDays;
    rentalData.daily_rate = vehicle.daily_rate;
    rentalData.subtotal = totalDays * vehicle.daily_rate;
    rentalData.tax_amount = rentalData.subtotal * 0.19; // 19% IVA
    rentalData.total_amount = rentalData.subtotal + rentalData.tax_amount + (rentalData.additional_charges || 0) - (rentalData.discount_amount || 0);

    const rental = await Rental.create(rentalData);

    // Update vehicle status
    await vehicle.update({ status: 'rented' });

    // Fetch complete rental data
    const completeRental = await Rental.findByPk(rental.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Vehicle, as: 'vehicle' },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Alquiler creado exitosamente',
      data: { rental: completeRental }
    });
  } catch (error) {
    console.error('Create rental error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Update rental
 */
const updateRental = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rental = await Rental.findByPk(id);
    if (!rental) {
      return res.status(404).json({
        success: false,
        message: 'Alquiler no encontrado'
      });
    }

    // Prevent updates to completed or cancelled rentals
    if (rental.rental_status === 'completed' || rental.rental_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar un alquiler completado o cancelado'
      });
    }

    await rental.update(updateData);

    const updatedRental = await Rental.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Vehicle, as: 'vehicle' },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });

    res.json({
      success: true,
      message: 'Alquiler actualizado exitosamente',
      data: { rental: updatedRental }
    });
  } catch (error) {
    console.error('Update rental error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Cancel rental
 */
const cancelRental = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const rental = await Rental.findByPk(id, {
      include: [{ model: Vehicle, as: 'vehicle' }]
    });

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: 'Alquiler no encontrado'
      });
    }

    if (rental.rental_status === 'completed' || rental.rental_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'El alquiler ya está completado o cancelado'
      });
    }

    await rental.update({
      rental_status: 'cancelled',
      additional_notes: cancellation_reason || rental.additional_notes
    });

    // Update vehicle status back to available
    if (rental.vehicle) {
      await rental.vehicle.update({ status: 'available' });
    }

    res.json({
      success: true,
      message: 'Alquiler cancelado exitosamente'
    });
  } catch (error) {
    console.error('Cancel rental error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Start rental (pickup)
 */
const startRental = async (req, res) => {
  try {
    const { id } = req.params;
    const { pickup_mileage, fuel_level_pickup, damage_notes_pickup } = req.body;

    const rental = await Rental.findByPk(id, {
      include: [{ model: Vehicle, as: 'vehicle' }]
    });

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: 'Alquiler no encontrado'
      });
    }

    if (rental.rental_status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'El alquiler debe estar confirmado para iniciar'
      });
    }

    await rental.update({
      rental_status: 'active',
      pickup_mileage,
      fuel_level_pickup,
      damage_notes_pickup
    });

    // Update vehicle mileage
    if (rental.vehicle && pickup_mileage) {
      await rental.vehicle.update({ current_mileage: pickup_mileage });
    }

    res.json({
      success: true,
      message: 'Alquiler iniciado exitosamente'
    });
  } catch (error) {
    console.error('Start rental error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Complete rental (return)
 */
const completeRental = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      return_mileage, 
      fuel_level_return, 
      damage_notes_return,
      additional_charges,
      actual_return_date 
    } = req.body;

    const rental = await Rental.findByPk(id, {
      include: [{ model: Vehicle, as: 'vehicle' }]
    });

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: 'Alquiler no encontrado'
      });
    }

    if (rental.rental_status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'El alquiler debe estar activo para completar'
      });
    }

    // Calculate late fees if applicable
    const returnDate = new Date(actual_return_date || new Date());
    const scheduledEndDate = new Date(rental.end_date);
    let lateFees = 0;

    if (returnDate > scheduledEndDate) {
      const lateDays = Math.ceil((returnDate - scheduledEndDate) / (1000 * 60 * 60 * 24));
      lateFees = lateDays * rental.daily_rate * 1.5; // 150% of daily rate for late fees
    }

    const totalAdditionalCharges = (additional_charges || 0) + lateFees;
    const newTotalAmount = rental.subtotal + rental.tax_amount + totalAdditionalCharges - rental.discount_amount;

    await rental.update({
      rental_status: 'completed',
      actual_return_date: returnDate,
      return_mileage,
      fuel_level_return,
      damage_notes_return,
      additional_charges: totalAdditionalCharges,
      total_amount: newTotalAmount
    });

    // Update vehicle status and mileage
    if (rental.vehicle) {
      await rental.vehicle.update({ 
        status: 'available',
        current_mileage: return_mileage || rental.vehicle.current_mileage
      });
    }

    res.json({
      success: true,
      message: 'Alquiler completado exitosamente',
      data: {
        lateFees,
        totalAdditionalCharges,
        newTotalAmount
      }
    });
  } catch (error) {
    console.error('Complete rental error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Get rental statistics
 */
const getRentalStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const dateFilter = {};
    if (start_date && end_date) {
      dateFilter.start_date = { [Op.between]: [start_date, end_date] };
    }

    const totalRentals = await Rental.count({ where: dateFilter });
    
    const activeRentals = await Rental.count({
      where: { ...dateFilter, rental_status: 'active' }
    });

    const completedRentals = await Rental.count({
      where: { ...dateFilter, rental_status: 'completed' }
    });

    const cancelledRentals = await Rental.count({
      where: { ...dateFilter, rental_status: 'cancelled' }
    });

    const totalRevenue = await Rental.sum('total_amount', {
      where: { ...dateFilter, rental_status: 'completed' }
    });

    const overdueRentals = await Rental.count({
      where: {
        rental_status: 'active',
        end_date: { [Op.lt]: new Date() }
      }
    });

    res.json({
      success: true,
      data: {
        totalRentals,
        activeRentals,
        completedRentals,
        cancelledRentals,
        totalRevenue: totalRevenue || 0,
        overdueRentals
      }
    });
  } catch (error) {
    console.error('Get rental stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getRentals,
  getRentalById,
  createRental,
  updateRental,
  cancelRental,
  startRental,
  completeRental,
  getRentalStats
};