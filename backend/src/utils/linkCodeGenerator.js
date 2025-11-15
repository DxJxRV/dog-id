const crypto = require('crypto');

/**
 * Genera un código único de 8 caracteres (alfanumérico mayúsculas)
 * Formato: XXXX-XXXX para facilitar entrada manual
 */
function generateLinkCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin O, 0, I, 1 para evitar confusión
  let code = '';

  for (let i = 0; i < 8; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];

    // Agregar guión después del 4to carácter
    if (i === 3) {
      code += '-';
    }
  }

  return code; // Formato: ABCD-EFGH
}

module.exports = {
  generateLinkCode
};
