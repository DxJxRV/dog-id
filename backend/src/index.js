require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const requestLogger = require('./middlewares/requestLogger');

// Crear carpetas necesarias para uploads
const folders = [
  'uploads',
  'uploads/pets',
  'uploads/vaccines',
  'uploads/procedures'
];

folders.forEach(folder => {
  const folderPath = path.join(__dirname, '..', folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`📁 Folder created: ${folderPath}`);
  }
});

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
const petLinkRoutes = require('./routes/petLinkRoutes');
const vaccineRoutes = require('./routes/vaccineRoutes');
const procedureRoutes = require('./routes/procedureRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Servir archivos estáticos (imágenes subidas)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Veterinary API is running' });
});

// Rutas de la API
app.use('/auth', authRoutes);
app.use('/pets', petRoutes);
app.use('/pets', petLinkRoutes);
app.use('/pets', vaccineRoutes);
app.use('/pets', procedureRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Error de Multer (subida de archivos)
  if (err instanceof Error && err.message.includes('Only')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Network: http://192.168.100.171:${PORT}`);
  console.log(`🏥 Health check: http://192.168.100.171:${PORT}/health`);
  console.log(`📊 Request logging: ${process.env.NODE_ENV === 'development' ? 'ENABLED (verbose)' : 'ENABLED'}`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});
