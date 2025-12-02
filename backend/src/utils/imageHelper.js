/**
 * Construye la URL completa de una imagen para el backend
 * Si la URL ya es completa (comienza con http), la retorna tal cual
 * Si es una ruta relativa, la concatena con API_URL
 */
const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;

  // Si la URL ya es completa (S3, http, https), retornarla tal cual
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Si es una ruta relativa, concatenar con API_URL
  const baseUrl = process.env.API_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}${imageUrl}`;
};

module.exports = {
  getImageUrl
};
