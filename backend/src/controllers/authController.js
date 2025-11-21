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

// Actualizar foto de perfil
const updateProfilePhoto = async (req, res) => {
  try {
    const { uploadPublicImage, deletePublicImage } = require('../services/s3Service');
    const userId = req.user.id;
    const userType = req.user.type;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Subir imagen a S3
    const fotoUrl = await uploadPublicImage(
      req.file.buffer,
      req.file.originalname,
      'users/profiles'
    );

    // Actualizar según el tipo de usuario
    let updatedUser;
    if (userType === 'user') {
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });

      // Eliminar foto antigua de S3 si existe
      if (currentUser.fotoUrl) {
        await deletePublicImage(currentUser.fotoUrl);
      }

      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { fotoUrl },
        select: {
          id: true,
          nombre: true,
          email: true,
          fotoUrl: true,
          coverPhotoUrl: true,
          telefono: true,
        }
      });
    } else if (userType === 'vet') {
      const currentVet = await prisma.vet.findUnique({ where: { id: userId } });

      // Eliminar foto antigua de S3 si existe
      if (currentVet.fotoUrl) {
        await deletePublicImage(currentVet.fotoUrl);
      }

      updatedUser = await prisma.vet.update({
        where: { id: userId },
        data: { fotoUrl },
        select: {
          id: true,
          nombre: true,
          email: true,
          fotoUrl: true,
          coverPhotoUrl: true,
          telefono: true,
          cedulaProfesional: true,
        }
      });
    }

    res.status(200).json({
      message: 'Profile photo updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Actualizar foto de portada
const updateCoverPhoto = async (req, res) => {
  try {
    const { uploadPublicImage, deletePublicImage } = require('../services/s3Service');
    const userId = req.user.id;
    const userType = req.user.type;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Subir imagen a S3
    const coverPhotoUrl = await uploadPublicImage(
      req.file.buffer,
      req.file.originalname,
      'users/covers'
    );

    // Actualizar según el tipo de usuario
    let updatedUser;
    if (userType === 'user') {
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });

      // Eliminar foto antigua de S3 si existe
      if (currentUser.coverPhotoUrl) {
        await deletePublicImage(currentUser.coverPhotoUrl);
      }

      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { coverPhotoUrl },
        select: {
          id: true,
          nombre: true,
          email: true,
          fotoUrl: true,
          coverPhotoUrl: true,
          telefono: true,
        }
      });
    } else if (userType === 'vet') {
      const currentVet = await prisma.vet.findUnique({ where: { id: userId } });

      // Eliminar foto antigua de S3 si existe
      if (currentVet.coverPhotoUrl) {
        await deletePublicImage(currentVet.coverPhotoUrl);
      }

      updatedUser = await prisma.vet.update({
        where: { id: userId },
        data: { coverPhotoUrl },
        select: {
          id: true,
          nombre: true,
          email: true,
          fotoUrl: true,
          coverPhotoUrl: true,
          telefono: true,
          cedulaProfesional: true,
        }
      });
    }

    res.status(200).json({
      message: 'Cover photo updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update cover photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Actualizar información del perfil
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;
    const { nombre, telefono } = req.body;

    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (telefono) updateData.telefono = telefono;

    let updatedUser;
    if (userType === 'user') {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          nombre: true,
          email: true,
          fotoUrl: true,
          telefono: true,
        }
      });
    } else if (userType === 'vet') {
      updatedUser = await prisma.vet.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          nombre: true,
          email: true,
          fotoUrl: true,
          telefono: true,
          cedulaProfesional: true,
        }
      });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Eliminar cuenta del usuario
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;

    if (userType === 'user') {
      // Para usuarios, verificar si tienen mascotas como dueños principales
      const petsAsOwner = await prisma.pet.findMany({
        where: { userId: userId }
      });

      if (petsAsOwner.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete account. Please transfer or delete all your pets first.'
        });
      }

      // Eliminar foto de perfil de S3 si existe
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user.fotoUrl) {
        const { deletePublicImage } = require('../services/s3Service');
        await deletePublicImage(user.fotoUrl);
      }

      // Eliminar relaciones y el usuario
      await prisma.$transaction([
        // Eliminar solicitudes de amistad enviadas
        prisma.friendRequest.deleteMany({ where: { senderId: userId } }),
        // Eliminar solicitudes de amistad recibidas
        prisma.friendRequest.deleteMany({ where: { receiverId: userId } }),
        // Eliminar amistades
        prisma.friendship.deleteMany({
          where: {
            OR: [
              { user1Id: userId },
              { user2Id: userId }
            ]
          }
        }),
        // Eliminar co-propiedades
        prisma.petCoOwner.deleteMany({ where: { userId: userId } }),
        // Eliminar el usuario
        prisma.user.delete({ where: { id: userId } })
      ]);

    } else if (userType === 'vet') {
      // Para veterinarios, verificar si tienen mascotas creadas pendientes de transferir
      const petsCreatedByVet = await prisma.pet.findMany({
        where: {
          createdByVetId: userId,
          userId: null // Mascotas que aún no han sido reclamadas
        }
      });

      if (petsCreatedByVet.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete account. You have pending pet transfers.'
        });
      }

      // Eliminar foto de perfil de S3 si existe
      const vet = await prisma.vet.findUnique({ where: { id: userId } });
      if (vet.fotoUrl) {
        const { deletePublicImage } = require('../services/s3Service');
        await deletePublicImage(vet.fotoUrl);
      }

      // Eliminar el veterinario
      await prisma.vet.delete({ where: { id: userId } });
    }

    res.status(200).json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  registerVet,
  loginVet,
  googleLogin,
  login,
  updateProfilePhoto,
  updateCoverPhoto,
  updateProfile,
  deleteAccount
};
