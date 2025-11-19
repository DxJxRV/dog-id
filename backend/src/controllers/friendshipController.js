const prisma = require('../utils/prisma');
const { generateLinkCode } = require('../utils/linkCodeGenerator');

// Obtener código de amistad del usuario
const getFriendCode = async (req, res) => {
  try {
    const userId = req.user.id;

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { friendCode: true, nombre: true, email: true, fotoUrl: true }
    });

    // Si no tiene código de amistad, generarle uno
    if (!user.friendCode) {
      let friendCode;
      let isUnique = false;
      while (!isUnique) {
        friendCode = generateLinkCode();
        const existing = await prisma.user.findUnique({
          where: { friendCode }
        });
        if (!existing) {
          isUnique = true;
        }
      }

      user = await prisma.user.update({
        where: { id: userId },
        data: { friendCode },
        select: { friendCode: true, nombre: true, email: true, fotoUrl: true }
      });
    }

    res.json({
      friendCode: user.friendCode,
      user: {
        nombre: user.nombre,
        email: user.email,
        fotoUrl: user.fotoUrl
      }
    });
  } catch (error) {
    console.error('Get friend code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Enviar solicitud de amistad usando código
const sendFriendRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { friendCode } = req.body;

    console.log('🤝 [sendFriendRequest] Starting friend request process');
    console.log('   Requester ID:', requesterId);
    console.log('   Friend Code:', friendCode);

    if (!friendCode) {
      return res.status(400).json({ error: 'Friend code is required' });
    }

    // Buscar usuario por código
    const addressee = await prisma.user.findUnique({
      where: { friendCode: friendCode.toUpperCase().trim() },
      select: {
        id: true,
        nombre: true,
        email: true,
        fotoUrl: true
      }
    });

    if (!addressee) {
      console.log('❌ [sendFriendRequest] User not found with code:', friendCode);
      return res.status(404).json({ error: 'Invalid friend code. User not found.' });
    }

    console.log('✅ [sendFriendRequest] User found:', { id: addressee.id, nombre: addressee.nombre });

    // Verificar que no se esté enviando solicitud a sí mismo
    if (addressee.id === requesterId) {
      console.log('❌ [sendFriendRequest] Cannot send friend request to yourself');
      return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
    }

    // Verificar si ya existe una solicitud o amistad (en ambas direcciones)
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: addressee.id },
          { requesterId: addressee.id, addresseeId: requesterId }
        ]
      }
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        console.log('⚠️  [sendFriendRequest] Already friends');
        return res.status(400).json({ error: 'You are already friends with this user' });
      } else if (existingFriendship.status === 'pending') {
        console.log('⚠️  [sendFriendRequest] Friend request already sent');
        return res.status(400).json({ error: 'Friend request already sent' });
      } else if (existingFriendship.status === 'rejected') {
        // Si fue rechazada, permitir enviar de nuevo actualizando el status
        await prisma.friendship.update({
          where: { id: existingFriendship.id },
          data: { status: 'pending', requesterId, addresseeId: addressee.id }
        });
        console.log('✅ [sendFriendRequest] Friend request resent');
        return res.status(201).json({
          message: 'Friend request sent successfully',
          friend: addressee
        });
      }
    }

    // Crear solicitud de amistad
    await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId: addressee.id,
        status: 'pending'
      }
    });

    console.log('✅ [sendFriendRequest] Friend request created successfully');
    res.status(201).json({
      message: 'Friend request sent successfully',
      friend: addressee
    });
  } catch (error) {
    console.error('💥 [sendFriendRequest] ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Obtener solicitudes de amistad pendientes (recibidas)
const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: 'pending'
      },
      include: {
        requester: {
          select: {
            id: true,
            nombre: true,
            email: true,
            fotoUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      requests: requests.map(req => ({
        id: req.id,
        user: req.requester,
        createdAt: req.createdAt
      }))
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Aceptar solicitud de amistad
const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const friendship = await prisma.friendship.findUnique({
      where: { id: requestId }
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendship.addresseeId !== userId) {
      return res.status(403).json({ error: 'You are not authorized to accept this request' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ error: 'This request is not pending' });
    }

    await prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'accepted' }
    });

    res.json({ message: 'Friend request accepted successfully' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Rechazar solicitud de amistad
const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const friendship = await prisma.friendship.findUnique({
      where: { id: requestId }
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendship.addresseeId !== userId) {
      return res.status(403).json({ error: 'You are not authorized to reject this request' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ error: 'This request is not pending' });
    }

    await prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'rejected' }
    });

    res.json({ message: 'Friend request rejected successfully' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Obtener lista de amigos aceptados
const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener amistades donde el usuario es el que envió la solicitud
    const sentFriendships = await prisma.friendship.findMany({
      where: {
        requesterId: userId,
        status: 'accepted'
      },
      include: {
        addressee: {
          select: {
            id: true,
            nombre: true,
            email: true,
            fotoUrl: true
          }
        }
      }
    });

    // Obtener amistades donde el usuario recibió la solicitud
    const receivedFriendships = await prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: 'accepted'
      },
      include: {
        requester: {
          select: {
            id: true,
            nombre: true,
            email: true,
            fotoUrl: true
          }
        }
      }
    });

    // Combinar y mapear los amigos
    const friends = [
      ...sentFriendships.map(f => ({
        id: f.id,
        user: f.addressee,
        friendsSince: f.createdAt
      })),
      ...receivedFriendships.map(f => ({
        id: f.id,
        user: f.requester,
        friendsSince: f.createdAt
      }))
    ];

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Eliminar amistad
const removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendshipId } = req.params;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId }
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    // Verificar que el usuario sea parte de esta amistad
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      return res.status(403).json({ error: 'You are not authorized to remove this friendship' });
    }

    await prisma.friendship.delete({
      where: { id: friendshipId }
    });

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Obtener mascotas de amigos
const getFriendsPets = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener todos los IDs de amigos
    const sentFriendships = await prisma.friendship.findMany({
      where: {
        requesterId: userId,
        status: 'accepted'
      },
      select: { addresseeId: true }
    });

    const receivedFriendships = await prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: 'accepted'
      },
      select: { requesterId: true }
    });

    const friendIds = [
      ...sentFriendships.map(f => f.addresseeId),
      ...receivedFriendships.map(f => f.requesterId)
    ];

    if (friendIds.length === 0) {
      return res.json({ pets: [] });
    }

    // Obtener mascotas de amigos (solo no archivadas)
    const pets = await prisma.pet.findMany({
      where: {
        userId: { in: friendIds },
        archivedByOwner: false
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
            fotoUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ pets });
  } catch (error) {
    console.error('Get friends pets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getFriendCode,
  sendFriendRequest,
  getPendingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend,
  getFriendsPets
};
