const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

// Generar token JWT
const generateToken = (id, type) => {
  return jwt.sign(
    { id, type },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Registro de usuario (dueño de mascota)
const registerUser = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    // Validar campos requeridos
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        nombre,
        email,
        passwordHash
      }
    });

    // Generar token
    const token = generateToken(user.id, 'user');

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        type: 'user'
      }
    });
  } catch (error) {
    console.error('Register user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login de usuario
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generar token
    const token = generateToken(user.id, 'user');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        type: 'user'
      }
    });
  } catch (error) {
    console.error('Login user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Registro de veterinario
const registerVet = async (req, res) => {
  try {
    const { nombre, email, password, cedulaProfesional, telefono } = req.body;

    // Validar campos requeridos
    if (!nombre || !email || !password || !cedulaProfesional) {
      return res.status(400).json({ error: 'All fields are required (nombre, email, password, cedulaProfesional)' });
    }

    // Verificar si el email ya existe
    const existingVet = await prisma.vet.findUnique({
      where: { email }
    });

    if (existingVet) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear veterinario
    const vet = await prisma.vet.create({
      data: {
        nombre,
        email,
        passwordHash,
        cedulaProfesional,
        telefono
      }
    });

    // Generar token
    const token = generateToken(vet.id, 'vet');

    res.status(201).json({
      message: 'Veterinarian registered successfully',
      token,
      vet: {
        id: vet.id,
        nombre: vet.nombre,
        email: vet.email,
        cedulaProfesional: vet.cedulaProfesional,
        telefono: vet.telefono,
        type: 'vet'
      }
    });
  } catch (error) {
    console.error('Register vet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login de veterinario
const loginVet = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Buscar veterinario
    const vet = await prisma.vet.findUnique({
      where: { email }
    });

    if (!vet) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, vet.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generar token
    const token = generateToken(vet.id, 'vet');

    res.json({
      message: 'Login successful',
      token,
      vet: {
        id: vet.id,
        nombre: vet.nombre,
        email: vet.email,
        cedulaProfesional: vet.cedulaProfesional,
        telefono: vet.telefono,
        type: 'vet'
      }
    });
  } catch (error) {
    console.error('Login vet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  registerVet,
  loginVet
};
