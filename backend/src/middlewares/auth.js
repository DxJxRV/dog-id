const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  });
};

const authenticateUser = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.type !== 'user') {
      return res.status(403).json({ error: 'Access denied. User role required.' });
    }
    next();
  });
};

const authenticateVet = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.type !== 'vet') {
      return res.status(403).json({ error: 'Access denied. Veterinarian role required.' });
    }
    next();
  });
};

const authenticateUserOrVet = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.type !== 'user' && req.user.type !== 'vet') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  authenticateUser,
  authenticateVet,
  authenticateUserOrVet
};
