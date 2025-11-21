const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

// Debug logs para diagnosticar problemas de S3
console.log('🔍 --- S3 DEBUG START ---');
console.log('REGION:', process.env.AWS_REGION);
console.log('PUBLIC_BUCKET:', process.env.AWS_S3_PUBLIC_BUCKET);
console.log('PRIVATE_BUCKET:', process.env.AWS_S3_PRIVATE_BUCKET);
console.log('KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 6) + '...' : 'UNDEFINED');
console.log('SECRET_EXISTS:', !!process.env.AWS_SECRET_ACCESS_KEY);
console.log('🔍 --- S3 DEBUG END ---');

// Configurar cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const PUBLIC_BUCKET = process.env.AWS_S3_PUBLIC_BUCKET;
const PRIVATE_BUCKET = process.env.AWS_S3_PRIVATE_BUCKET;

/**
 * Genera un nombre de archivo único
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const ext = path.extname(originalName);
  return `${timestamp}-${random}${ext}`;
};

/**
 * Sube una imagen al bucket público
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} folder - Carpeta en S3 (pets/profiles, pets/covers, users/profiles)
 * @returns {Promise<string>} - URL pública de la imagen
 */
const uploadPublicImage = async (fileBuffer, originalName, folder) => {
  const filename = generateUniqueFilename(originalName);
  const key = `${folder}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: PUBLIC_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: getContentType(originalName),
  });

  await s3Client.send(command);

  // Retornar URL pública
  return `https://${PUBLIC_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

/**
 * Sube una imagen al bucket privado (evidencias médicas)
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} folder - Carpeta en S3 (medical/vaccines, medical/procedures)
 * @returns {Promise<string>} - Key del archivo (no URL)
 */
const uploadPrivateImage = async (fileBuffer, originalName, folder) => {
  const filename = generateUniqueFilename(originalName);
  const key = `${folder}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: PRIVATE_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: getContentType(originalName),
  });

  await s3Client.send(command);

  // Retornar solo el key (no la URL)
  return key;
};

/**
 * Genera una URL firmada temporal para acceder a una imagen privada
 * @param {string} key - Key del archivo en S3
 * @param {number} expiresIn - Tiempo de expiración en segundos (default: 300 = 5 minutos)
 * @returns {Promise<string>} - URL firmada
 */
const generatePresignedUrl = async (key, expiresIn = 300) => {
  if (!key) return null;

  const command = new GetObjectCommand({
    Bucket: PRIVATE_BUCKET,
    Key: key,
  });

  // Generar URL firmada para lectura
  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
};

/**
 * Elimina una imagen del bucket público
 * @param {string} url - URL completa de la imagen
 */
const deletePublicImage = async (url) => {
  if (!url) return;

  // Extraer el key de la URL
  const key = url.split('.amazonaws.com/')[1];
  if (!key) return;

  const command = new DeleteObjectCommand({
    Bucket: PUBLIC_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
};

/**
 * Elimina una imagen del bucket privado
 * @param {string} key - Key del archivo
 */
const deletePrivateImage = async (key) => {
  if (!key) return;

  const command = new DeleteObjectCommand({
    Bucket: PRIVATE_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
};

/**
 * Obtiene el Content-Type basado en la extensión del archivo
 */
const getContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return types[ext] || 'application/octet-stream';
};

module.exports = {
  uploadPublicImage,
  uploadPrivateImage,
  generatePresignedUrl,
  deletePublicImage,
  deletePrivateImage,
};
