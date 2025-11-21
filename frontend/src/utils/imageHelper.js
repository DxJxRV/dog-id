import { API_URL } from './config';

/**
 * Construye la URL completa de una imagen
 * Si la URL ya es completa (comienza con http), la retorna tal cual
 * Si es una ruta relativa, la concatena con API_URL
 */
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;

  // Si la URL ya es completa (S3, http, https), retornarla tal cual
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Si es una ruta relativa, concatenar con API_URL
  return `${API_URL}${imageUrl}`;
};
