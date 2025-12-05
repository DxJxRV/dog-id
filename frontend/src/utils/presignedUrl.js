import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from './config';

/**
 * Genera una presigned URL para un key de S3
 * @param {string} key - El key del archivo en S3
 * @param {number} expiresIn - Segundos hasta expiración (default: 3600 = 1 hora)
 * @returns {Promise<string|null>} - La URL presigned o null si falla
 */
export const generatePresignedUrl = async (key, expiresIn = 3600) => {
  if (!key) return null;

  // Si ya es una URL completa, retornarla tal cual
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }

  try {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
    const response = await axios.post(
      `${API_URL}/api/presigned-url`,
      { key, expiresIn },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return null;
  }
};

/**
 * Genera presigned URLs para múltiples keys
 * @param {string[]} keys - Array de keys de S3
 * @param {number} expiresIn - Segundos hasta expiración
 * @returns {Promise<{[key: string]: string}>} - Objeto con keys originales mapeados a URLs presigned
 */
export const generateMultiplePresignedUrls = async (keys, expiresIn = 3600) => {
  const urlPromises = keys.map(key => generatePresignedUrl(key, expiresIn));
  const urls = await Promise.all(urlPromises);

  const urlMap = {};
  keys.forEach((key, index) => {
    urlMap[key] = urls[index];
  });

  return urlMap;
};
