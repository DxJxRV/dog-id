// Validar formato UUID v4
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Middleware para validar UUID en parámetros
const validateUUIDParam = (paramName = 'id') => {
  return (req, res, next) => {
    const uuid = req.params[paramName];

    if (!uuid) {
      return res.status(400).json({ error: `${paramName} is required` });
    }

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: `Invalid ${paramName} format` });
    }

    next();
  };
};

module.exports = {
  isValidUUID,
  validateUUIDParam
};
