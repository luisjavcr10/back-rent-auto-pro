const { Customer, Rental } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all customers with filtering and pagination
 */
const getCustomers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      is_active,
      search,
      document_type 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';
    if (document_type) whereClause.document_type = document_type;
    
    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { document_number: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: customers } = await Customer.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Rental,
          as: 'rentals',
          attributes: ['id', 'rental_status', 'start_date', 'end_date'],
          limit: 3,
          order: [['start_date', 'DESC']]
        }
      ]
    });

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Get customer by ID
 */
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id, {
      include: [
        {
          model: Rental,
          as: 'rentals',
          order: [['start_date', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: { customer }
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Create new customer
 */
const createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    
    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      where: {
        [Op.or]: [
          { email: customerData.email },
          { document_number: customerData.document_number },
          { driver_license_number: customerData.driver_license_number }
        ]
      }
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente con este email, documento o licencia de conducir'
      });
    }

    const customer = await Customer.create(customerData);

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: { customer }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Update customer
 */
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Check for unique constraints if updating email, document, or license
    if (updateData.email || updateData.document_number || updateData.driver_license_number) {
      const whereClause = {
        id: { [Op.ne]: id }
      };

      const orConditions = [];
      if (updateData.email) orConditions.push({ email: updateData.email });
      if (updateData.document_number) orConditions.push({ document_number: updateData.document_number });
      if (updateData.driver_license_number) orConditions.push({ driver_license_number: updateData.driver_license_number });

      if (orConditions.length > 0) {
        whereClause[Op.or] = orConditions;
        
        const existingCustomer = await Customer.findOne({ where: whereClause });
        if (existingCustomer) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe otro cliente con este email, documento o licencia de conducir'
          });
        }
      }
    }

    await customer.update(updateData);

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: { customer }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Delete customer (soft delete)
 */
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Check if customer has active rentals
    const activeRentals = await Rental.count({
      where: {
        customer_id: id,
        rental_status: { [Op.in]: ['reserved', 'confirmed', 'active'] }
      }
    });

    if (activeRentals > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un cliente con alquileres activos'
      });
    }

    await customer.update({ is_active: false });

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Get customer statistics
 */
const getCustomerStats = async (req, res) => {
  try {
    const totalCustomers = await Customer.count({ where: { is_active: true } });
    
    const activeCustomers = await Customer.count({
      where: { is_active: true },
      include: [
        {
          model: Rental,
          as: 'rentals',
          where: { rental_status: 'active' },
          required: true
        }
      ]
    });

    const expiredLicenses = await Customer.count({
      where: {
        is_active: true,
        driver_license_expiry: { [Op.lt]: new Date() }
      }
    });

    const soonToExpireLicenses = await Customer.count({
      where: {
        is_active: true,
        driver_license_expiry: {
          [Op.between]: [new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        expiredLicenses,
        soonToExpireLicenses
      }
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Validate customer for rental
 */
const validateCustomerForRental = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (!customer.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cliente inactivo'
      });
    }

    const validationErrors = [];

    // Check if driver license is expired
    if (customer.isDriverLicenseExpired()) {
      validationErrors.push('Licencia de conducir vencida');
    }

    // Check if customer is under 21
    if (customer.getAge() < 21) {
      validationErrors.push('Cliente menor de 21 años');
    }

    // Check for active rentals
    const activeRentals = await Rental.count({
      where: {
        customer_id: id,
        rental_status: { [Op.in]: ['reserved', 'confirmed', 'active'] }
      }
    });

    if (activeRentals > 0) {
      validationErrors.push('Cliente tiene alquileres activos');
    }

    const isValid = validationErrors.length === 0;

    res.json({
      success: true,
      data: {
        isValid,
        validationErrors,
        customer: {
          id: customer.id,
          fullName: customer.getFullName(),
          age: customer.getAge(),
          licenseExpiry: customer.driver_license_expiry
        }
      }
    });
  } catch (error) {
    console.error('Validate customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  validateCustomerForRental
};