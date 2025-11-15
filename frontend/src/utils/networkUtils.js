// Utility para detectar errores de red
export const isNetworkError = (error) => {
  if (!error) return false;

  // Errores de timeout o sin respuesta del servidor
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return true;
  }

  // Sin respuesta del servidor
  if (!error.response) {
    return true;
  }

  // Errores 5xx del servidor (opcional, puedes decidir si los consideras errores de red)
  if (error.response && error.response.status >= 500) {
    return true;
  }

  return false;
};

// Helper para obtener mensaje de error apropiado
export const getErrorMessage = (error) => {
  if (isNetworkError(error)) {
    return 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
  }

  return error.response?.data?.error || error.message || 'Ocurrió un error inesperado';
};
