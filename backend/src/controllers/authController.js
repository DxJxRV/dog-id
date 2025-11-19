const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// Login con Google (solo para usuarios, no veterinarios)
const googleLogin = async (req, res) => {
  try {
    const { idToken, accessToken } = req.body;

    if (!idToken && !accessToken) {
      return res.status(400).json({ error: 'ID token or access token is required' });
    }

    let email, name, picture, googleId;

    if (idToken) {
      // Verificar el idToken con Google
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      googleId = payload.sub;
    } else if (accessToken) {
      // Usar accessToken para obtener información del usuario
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        return res.status(401).json({ error: 'Invalid access token' });
      }

      const userInfo = await response.json();
      email = userInfo.email;
      name = userInfo.name;
      picture = userInfo.picture;
      googleId = userInfo.id;
    }

    if (!email) {
      return res.status(400).json({ error: 'Email not found in Google account' });
    }

    // Buscar si el usuario ya existe
    let user = await prisma.user.findUnique({
      where: { email }
    });

    // Si no existe, crearlo
    if (!user) {
      user = await prisma.user.create({
        data: {
          nombre: name || email.split('@')[0],
          email,
          passwordHash: '', // No tiene password porque usa Google
          googleId,
          fotoUrl: picture || null
        }
      });
    } else {
      // Si existe pero no tiene googleId, actualizarlo
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { email },
          data: {
            googleId,
            fotoUrl: picture || user.fotoUrl
          }
        });
      }
    }

    // Generar token JWT
    const token = generateToken(user.id, 'user');

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        fotoUrl: user.fotoUrl,
        type: 'user'
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

// Login unificado - busca automáticamente si es user o vet
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Primero buscar en usuarios
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generar token
      const token = generateToken(user.id, 'user');

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          type: 'user'
        }
      });
    }

    // Si no es user, buscar en veterinarios
    let vet = await prisma.vet.findUnique({
      where: { email }
    });

    if (vet) {
      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(password, vet.passwordHash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generar token
      const token = generateToken(vet.id, 'vet');

      return res.json({
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
    }

    // Si no se encontró ni como user ni como vet
    return res.status(401).json({ error: 'Invalid credentials' });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  registerVet,
  loginVet,
  googleLogin,
  login
};
