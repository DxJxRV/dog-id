const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Capturar el body original
  const requestBody = req.body && Object.keys(req.body).length > 0 ? req.body : null;

  // Capturar la respuesta
  const originalSend = res.send;
  let responseBody;

  res.send = function (data) {
    responseBody = data;
    originalSend.call(this, data);
  };

  // Logging cuando la respuesta termina
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    // Determinar color según status code
    const statusColor = statusCode >= 500 ? '\x1b[31m' : // Rojo
                       statusCode >= 400 ? '\x1b[33m' : // Amarillo
                       statusCode >= 300 ? '\x1b[36m' : // Cyan
                       '\x1b[32m'; // Verde
    const resetColor = '\x1b[0m';

    // Emoji según método
    const methodEmoji = {
      GET: '📥',
      POST: '📤',
      PUT: '✏️',
      DELETE: '🗑️',
      PATCH: '🔧'
    }[method] || '📡';

    // Log compacto
    console.log(
      `${methodEmoji} ${method.padEnd(7)} ${statusColor}${statusCode}${resetColor} ${originalUrl.padEnd(35)} ${duration}ms`
    );

    // Log del body si existe (solo en desarrollo y para métodos POST/PUT/PATCH)
    if (process.env.NODE_ENV === 'development' && ['POST', 'PUT', 'PATCH'].includes(method)) {
      if (requestBody) {
        // Ocultar contraseñas en el log
        const sanitizedBody = { ...requestBody };
        if (sanitizedBody.password) sanitizedBody.password = '***';
        if (sanitizedBody.passwordHash) sanitizedBody.passwordHash = '***';

        console.log(`  📝 Request: ${JSON.stringify(sanitizedBody)}`);
      }

      // Log de respuesta (solo si es JSON y no es muy largo)
      if (responseBody) {
        try {
          const parsed = JSON.parse(responseBody);
          // No logear el token completo
          if (parsed.token) {
            parsed.token = parsed.token.substring(0, 20) + '...';
          }

          const responseStr = JSON.stringify(parsed);
          if (responseStr.length < 200) {
            console.log(`  ✅ Response: ${responseStr}`);
          } else {
            console.log(`  ✅ Response: [${responseStr.length} chars]`);
          }
        } catch (e) {
          // Si no es JSON, solo mostrar longitud
          if (responseBody.length < 100) {
            console.log(`  ✅ Response: ${responseBody}`);
          }
        }
      }
    }
  });

  next();
};

module.exports = requestLogger;
