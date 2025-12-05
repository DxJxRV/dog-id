const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
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
 * Sube un archivo (audio, PDF, etc.) al bucket privado
 * @param {string} filePath - Ruta del archivo en el sistema de archivos
 * @param {string} key - Key destino en S3 (incluye carpeta y nombre)
 * @returns {Promise<string>} - Key del archivo (no URL)
 */
const uploadPrivateFile = async (filePath, key) => {
  console.log('☁️ [S3] Uploading private file...');
  console.log('   📁 Local path:', filePath);
  console.log('   🔑 S3 Key:', key);
  console.log('   🪣 Bucket:', PRIVATE_BUCKET);

  // Leer el archivo del sistema de archivos
  const fileBuffer = fs.readFileSync(filePath);

  const command = new PutObjectCommand({
    Bucket: PRIVATE_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: getContentType(filePath),
  });

  await s3Client.send(command);
  console.log('   ✅ File uploaded successfully');

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
  console.log('🔗 [PRESIGNED] Generando URL presigned...');
  console.log('   📁 Key:', key);
  console.log('   🪣 Bucket:', PRIVATE_BUCKET);
  console.log('   ⏱️  Expira en:', expiresIn, 'segundos');

  if (!key) {
    console.log('   ❌ Key es null/undefined, retornando null');
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: PRIVATE_BUCKET,
      Key: key,
    });

    // Generar URL firmada para lectura
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    console.log('   ✅ URL generada exitosamente');
    console.log('   🔗 URL (primeros 50 chars):', url.substring(0, 50) + '...');
    return url;
  } catch (error) {
    console.error('   ❌ ERROR al generar presigned URL:', error.message);
    console.error('   📋 Stack:', error.stack);
    throw error;
  }
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
    '.m4a': 'audio/m4a',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.pdf': 'application/pdf',
  };
  return types[ext] || 'application/octet-stream';
};

module.exports = {
  uploadPublicImage,
  uploadPrivateImage,
  uploadPrivateFile,
  generatePresignedUrl,
  deletePublicImage,
  deletePrivateImage,
};
