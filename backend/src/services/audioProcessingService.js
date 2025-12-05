const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

/**
 * Servicio de procesamiento de audio
 * Optimiza archivos de audio eliminando silencios para ahorrar costos de API
 */

/**
 * Optimiza un archivo de audio eliminando silencios
 * @param {string} inputPath - Ruta del archivo de audio original
 * @returns {Promise<{path: string, originalDuration: number, newDuration: number, savedSeconds: number}>}
 */
const optimizeAudio = async (inputPath) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🎵 [AUDIO] Starting audio optimization...');
      console.log('   📁 Input:', inputPath);

      // Generar nombre único para el archivo optimizado
      const timestamp = Date.now();
      const ext = path.extname(inputPath);
      const outputPath = path.join('/tmp', `optimized-${timestamp}${ext}`);

      let originalDuration = 0;
      let newDuration = 0;

      // Paso 1: Obtener duración original
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          console.error('❌ [AUDIO] Error getting audio metadata:', err);
          // Si hay error, retornar archivo original sin optimización
          return resolve({
            path: inputPath,
            originalDuration: 0,
            newDuration: 0,
            savedSeconds: 0,
            optimized: false
          });
        }

        originalDuration = metadata.format.duration || 0;
        console.log('   ⏱️  Original duration:', originalDuration.toFixed(2), 'seconds');

        // Paso 2: Aplicar filtro de eliminación de silencios
        ffmpeg(inputPath)
          .audioFilters([
            // Eliminar silencios al inicio y final
            'silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB',
            // Eliminar silencios en medio (más de 1 segundo de silencio se reduce a 0.5s)
            'silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB'
          ])
          // Normalizar volumen para mejor calidad
          .audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11')
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log('   🔧 [AUDIO] FFmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`   📊 [AUDIO] Processing: ${progress.percent.toFixed(1)}%`);
            }
          })
          .on('end', () => {
            // Paso 3: Obtener duración del archivo optimizado
            ffmpeg.ffprobe(outputPath, (err, metadata) => {
              if (err) {
                console.error('❌ [AUDIO] Error getting optimized audio metadata:', err);
                // Si hay error, retornar archivo original
                try {
                  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                } catch (cleanupErr) {
                  console.error('Error cleaning up:', cleanupErr);
                }
                return resolve({
                  path: inputPath,
                  originalDuration,
                  newDuration: originalDuration,
                  savedSeconds: 0,
                  optimized: false
                });
              }

              newDuration = metadata.format.duration || 0;
              const savedSeconds = Math.max(0, originalDuration - newDuration);

              console.log('   ✅ [AUDIO] Optimization complete');
              console.log('   ⏱️  New duration:', newDuration.toFixed(2), 'seconds');
              console.log('   💰 Saved:', savedSeconds.toFixed(2), 'seconds');
              console.log('   📉 Reduction:', ((savedSeconds / originalDuration) * 100).toFixed(1), '%');

              resolve({
                path: outputPath,
                originalDuration: Math.round(originalDuration),
                newDuration: Math.round(newDuration),
                savedSeconds: Math.round(savedSeconds),
                optimized: true
              });
            });
          })
          .on('error', (err) => {
            console.error('❌ [AUDIO] FFmpeg error:', err.message);
            // Si hay error, retornar archivo original sin optimización
            try {
              if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (cleanupErr) {
              console.error('Error cleaning up:', cleanupErr);
            }
            resolve({
              path: inputPath,
              originalDuration,
              newDuration: originalDuration,
              savedSeconds: 0,
              optimized: false
            });
          })
          .run();
      });
    } catch (error) {
      console.error('❌ [AUDIO] Unexpected error in optimization:', error);
      // En caso de error inesperado, retornar archivo original
      resolve({
        path: inputPath,
        originalDuration: 0,
        newDuration: 0,
        savedSeconds: 0,
        optimized: false
      });
    }
  });
};

/**
 * Limpia archivos temporales de audio
 * @param {string} filePath - Ruta del archivo a eliminar
 */
const cleanupTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath) && filePath.includes('/tmp/')) {
      fs.unlinkSync(filePath);
      console.log('   🗑️  [AUDIO] Cleaned up temp file:', filePath);
    }
  } catch (error) {
    console.error('⚠️ [AUDIO] Error cleaning up temp file:', error.message);
  }
};

module.exports = {
  optimizeAudio,
  cleanupTempFile
};
