const bcrypt = require('bcryptjs');
const { User } = require('../models');

/**
 * Seeds para usuarios demo del sistema RentAutoPro
 * Crea usuarios con diferentes roles para testing y demostración
 */

/**
 * Datos de usuarios demo
 */
const demoUsers = [
  {
    email: 'admin@rentautopro.com',
    password: 'admin123',
    first_name: 'Administrador',
    last_name: 'Sistema',
    phone: '+1234567890',
    role: 'admin',
    is_active: true
  },
  {
    email: 'gestor@rentautopro.com',
    password: 'gestor123',
    first_name: 'Gestor',
    last_name: 'Flota',
    phone: '+1234567891',
    role: 'gestor_flota',
    is_active: true
  },
  {
    email: 'cliente@rentautopro.com',
    password: 'cliente123',
    first_name: 'Cliente',
    last_name: 'Demo',
    phone: '+1234567892',
    role: 'cliente',
    is_active: true
  }
];

/**
 * Función para crear usuarios demo
 * Verifica si ya existen antes de crearlos
 */
const seedUsers = async () => {
  try {
    console.log('🌱 Iniciando seeds de usuarios...');

    for (const userData of demoUsers) {
      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ 
        where: { email: userData.email } 
      });

      if (existingUser) {
        console.log(`👤 Usuario ${userData.email} ya existe, omitiendo...`);
        continue;
      }

      // Crear nuevo usuario
      const user = await User.create(userData);
      console.log(`✅ Usuario creado: ${user.email} (${user.role})`);
    }

    console.log('🌱 Seeds de usuarios completados exitosamente');
  } catch (error) {
    console.error('❌ Error al ejecutar seeds de usuarios:', error);
    throw error;
  }
};

/**
 * Función para ejecutar todos los seeds
 */
const runSeeds = async () => {
  try {
    await seedUsers();
    console.log('🎉 Todos los seeds ejecutados correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando seeds:', error);
    throw error;
  }
};

module.exports = {
  seedUsers,
  runSeeds
};