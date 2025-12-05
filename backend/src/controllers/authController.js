const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');

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
    const { nombre, email, password, googleId, appleId, fotoUrl } = req.body;

    // Validar campos requeridos (password solo es requerido si no hay social login)
    if (!nombre || !email || (!password && !googleId && !appleId)) {
      return res.status(400).json({ error: 'Nombre and email are required, and password is required if not using social login' });
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash de la contraseña (si existe, sino generar una aleatoria imposible de adivinar)
    let passwordHash;
    if (password && password.trim()) {
      passwordHash = await bcrypt.hash(password, 10);
    } else {
      // Para social login sin password, generar un hash imposible de usar
      const randomPassword = require('crypto').randomBytes(32).toString('hex');
      passwordHash = await bcrypt.hash(randomPassword, 10);
    }

    // Crear usuario (con datos sociales opcionales)
    const user = await prisma.user.create({
      data: {
        nombre,
        email,
        passwordHash,
        googleId: googleId || null,
        appleId: appleId || null,
        fotoUrl: fotoUrl || null
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
    const { nombre, email, password, cedulaProfesional, telefono, googleId, appleId, fotoUrl } = req.body;

    // Validar campos requeridos (cedulaProfesional es opcional, password solo es requerido si no hay social login)
    if (!nombre || !email || (!password && !googleId && !appleId)) {
      return res.status(400).json({ error: 'Nombre and email are required, and password is required if not using social login' });
    }

    // Verificar si el email ya existe
    const existingVet = await prisma.vet.findUnique({
      where: { email }
    });

    if (existingVet) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash de la contraseña (si existe, sino generar una aleatoria imposible de adivinar)
    let passwordHash;
    if (password && password.trim()) {
      passwordHash = await bcrypt.hash(password, 10);
    } else {
      // Para social login sin password, generar un hash imposible de usar
      const randomPassword = require('crypto').randomBytes(32).toString('hex');
      passwordHash = await bcrypt.hash(randomPassword, 10);
    }

    // Crear veterinario (cedulaProfesional es opcional)
    const vet = await prisma.vet.create({
      data: {
        nombre,
        email,
        passwordHash,
        googleId: googleId || null,
        appleId: appleId || null,
        cedulaProfesional: cedulaProfesional || null,
        telefono: telefono || null,
        fotoUrl: fotoUrl || null
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

    // Buscar si el usuario ya existe en User o Vet
    let user = await prisma.user.findUnique({
      where: { email }
    });

    let vet = null;
    if (!user) {
      vet = await prisma.vet.findUnique({
        where: { email }
      });
    }

    // Si no existe en ninguna tabla, devolver flag de nuevo usuario
    if (!user && !vet) {
      return res.status(200).json({
        isNewUser: true,
        socialData: {
          email,
          nombre: name || email.split('@')[0],
          fotoUrl: picture || null,
          googleId,
          provider: 'google'
        }
      });
    }

    // Si existe como User
    if (user) {
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

      // Generar token JWT
      const token = generateToken(user.id, 'user');

      return res.json({
        message: 'Google login successful',
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          fotoUrl: user.fotoUrl,
        },
        userType: 'user'
      });
    }

    // Si existe como Vet
    if (vet) {
      // Generar token JWT
      const token = generateToken(vet.id, 'vet');

      return res.json({
        message: 'Google login successful',
        token,
        user: {
          id: vet.id,
          nombre: vet.nombre,
          email: vet.email,
          fotoUrl: vet.fotoUrl,
          cedulaProfesional: vet.cedulaProfesional,
        },
        userType: 'vet'
      });
    }
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
    const { nombre, telefono, cedulaProfesional } = req.body;

    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (telefono !== undefined) updateData.telefono = telefono;
    // Solo permitir actualizar cédula si es veterinario
    if (userType === 'vet' && cedulaProfesional !== undefined) {
      updateData.cedulaProfesional = cedulaProfesional;
    }

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
    const { deletePublicImage } = require('../services/s3Service');
    const userId = req.user.id;
    const userType = req.user.type;

    if (userType === 'user') {
      // Obtener todas las mascotas donde es dueño principal
      const petsAsOwner = await prisma.pet.findMany({
        where: { userId: userId },
        include: {
          coOwners: {
            include: {
              user: true
            }
          }
        }
      });

      // Procesar cada mascota
      for (const pet of petsAsOwner) {
        if (pet.coOwners && pet.coOwners.length > 0) {
          // Si tiene co-dueños, transferir la propiedad al primer co-dueño
          const newOwnerId = pet.coOwners[0].userId;

          // Actualizar la mascota con el nuevo dueño
          await prisma.pet.update({
            where: { id: pet.id },
            data: { userId: newOwnerId }
          });

          // Eliminar el registro de co-propiedad del nuevo dueño
          await prisma.coOwnerPetLink.delete({
            where: { id: pet.coOwners[0].id }
          });

          console.log(`Mascota ${pet.nombre} transferida a ${pet.coOwners[0].user.nombre}`);
        } else {
          // Si NO tiene co-dueños, eliminar la mascota completamente

          // Obtener vacunas y procedimientos con evidencia para eliminar fotos
          const vaccines = await prisma.vaccine.findMany({
            where: { petId: pet.id, evidenciaUrl: { not: null } },
            select: { evidenciaUrl: true }
          });

          const procedures = await prisma.procedure.findMany({
            where: { petId: pet.id, evidenciaUrl: { not: null } },
            select: { evidenciaUrl: true }
          });

          // Eliminar fotos de evidencia de S3
          for (const vaccine of vaccines) {
            if (vaccine.evidenciaUrl) {
              await deletePublicImage(vaccine.evidenciaUrl);
            }
          }

          for (const procedure of procedures) {
            if (procedure.evidenciaUrl) {
              await deletePublicImage(procedure.evidenciaUrl);
            }
          }

          // Eliminar fotos de la mascota de S3
          if (pet.fotoUrl) {
            await deletePublicImage(pet.fotoUrl);
          }
          if (pet.coverPhotoUrl) {
            await deletePublicImage(pet.coverPhotoUrl);
          }

          // La mascota se eliminará en cascada por la transacción
          console.log(`Mascota ${pet.nombre} será eliminada (sin co-dueños)`);
        }
      }

      // Eliminar fotos de perfil del usuario de S3
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user.fotoUrl) {
        await deletePublicImage(user.fotoUrl);
      }
      if (user.coverPhotoUrl) {
        await deletePublicImage(user.coverPhotoUrl);
      }

      // Eliminar relaciones y el usuario en una transacción
      await prisma.$transaction([
        // Eliminar amistades
        prisma.friendship.deleteMany({
          where: {
            OR: [
              { requesterId: userId },
              { addresseeId: userId }
            ]
          }
        }),
        // Eliminar co-propiedades donde es co-dueño (no dueño principal)
        prisma.coOwnerPetLink.deleteMany({ where: { userId: userId } }),
        // Eliminar el usuario (esto eliminará mascotas sin co-dueños por CASCADE)
        prisma.user.delete({ where: { id: userId } })
      ]);

    } else if (userType === 'vet') {
      // Para veterinarios, eliminar mascotas pendientes de transferir
      const petsCreatedByVet = await prisma.pet.findMany({
        where: {
          createdByVetId: userId,
          userId: null // Mascotas que aún no han sido reclamadas
        }
      });

      // Eliminar fotos de mascotas pendientes y sus evidencias
      for (const pet of petsCreatedByVet) {
        // Obtener vacunas y procedimientos con evidencia
        const vaccines = await prisma.vaccine.findMany({
          where: { petId: pet.id, evidenciaUrl: { not: null } },
          select: { evidenciaUrl: true }
        });

        const procedures = await prisma.procedure.findMany({
          where: { petId: pet.id, evidenciaUrl: { not: null } },
          select: { evidenciaUrl: true }
        });

        // Eliminar fotos de evidencia
        for (const vaccine of vaccines) {
          if (vaccine.evidenciaUrl) {
            await deletePublicImage(vaccine.evidenciaUrl);
          }
        }

        for (const procedure of procedures) {
          if (procedure.evidenciaUrl) {
            await deletePublicImage(procedure.evidenciaUrl);
          }
        }

        // Eliminar fotos de la mascota
        if (pet.fotoUrl) {
          await deletePublicImage(pet.fotoUrl);
        }
        if (pet.coverPhotoUrl) {
          await deletePublicImage(pet.coverPhotoUrl);
        }
      }

      // Eliminar fotos de perfil del veterinario de S3
      const vet = await prisma.vet.findUnique({ where: { id: userId } });
      if (vet.fotoUrl) {
        await deletePublicImage(vet.fotoUrl);
      }
      if (vet.coverPhotoUrl) {
        await deletePublicImage(vet.coverPhotoUrl);
      }

      // Eliminar el veterinario
      // Las mascotas pendientes se eliminarán por CASCADE
      // Las vacunas y procedimientos quedarán con vetId = null (SET NULL)
      // Los vínculos VetPetLink se eliminarán por CASCADE
      await prisma.vet.delete({ where: { id: userId } });
    }

    res.status(200).json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Apple Login
 * POST /api/auth/apple
 */
const appleLogin = async (req, res) => {
  try {
    const { identityToken, fullName } = req.body;

    if (!identityToken) {
      return res.status(400).json({ error: 'Identity token is required' });
    }

    // Verificar el token de Apple
    const appleIdTokenClaims = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID || 'com.yourapp.bundleid', // Reemplazar con tu Bundle ID
      ignoreExpiration: false,
    });

    const { sub: appleId, email } = appleIdTokenClaims;

    // Apple no siempre proporciona email (si el usuario eligió ocultarlo)
    if (!email && !appleId) {
      return res.status(400).json({ error: 'Unable to retrieve user information from Apple' });
    }

    // Buscar usuario por appleId o email en ambas tablas
    let user = null;
    let vet = null;

    if (appleId) {
      user = await prisma.user.findFirst({
        where: { appleId }
      });

      if (!user) {
        // Note: Vet table doesn't have appleId yet, but we'll check by email
      }
    }

    if (!user && email) {
      user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        vet = await prisma.vet.findUnique({
          where: { email }
        });
      }
    }

    // Si no existe en ninguna tabla, devolver flag de nuevo usuario
    if (!user && !vet) {
      const userName = fullName
        ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
        : email
          ? email.split('@')[0]
          : `Usuario Apple ${appleId.substring(0, 8)}`;

      return res.status(200).json({
        isNewUser: true,
        socialData: {
          email: email || `${appleId}@privaterelay.appleid.com`,
          nombre: userName,
          fotoUrl: null,
          appleId,
          provider: 'apple'
        }
      });
    }

    // Si existe como User
    if (user) {
      // Si existe pero no tiene appleId, actualizarlo
      if (!user.appleId && appleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { appleId }
        });
      }

      // Generar token JWT
      const token = generateToken(user.id, 'user');

      return res.json({
        message: 'Apple login successful',
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          fotoUrl: user.fotoUrl,
          coverPhotoUrl: user.coverPhotoUrl,
        },
        userType: 'user'
      });
    }

    // Si existe como Vet
    if (vet) {
      // Generar token JWT
      const token = generateToken(vet.id, 'vet');

      return res.json({
        message: 'Apple login successful',
        token,
        user: {
          id: vet.id,
          nombre: vet.nombre,
          email: vet.email,
          fotoUrl: vet.fotoUrl,
          coverPhotoUrl: vet.coverPhotoUrl,
          cedulaProfesional: vet.cedulaProfesional,
        },
        userType: 'vet'
      });
    }

  } catch (error) {
    console.error('Apple login error:', error);
    res.status(500).json({
      error: 'Apple login failed',
      details: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  registerVet,
  loginVet,
  googleLogin,
  appleLogin,
  login,
  updateProfilePhoto,
  updateCoverPhoto,
  updateProfile,
  deleteAccount
};
