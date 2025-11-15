// Lista de vacunas comunes para perros y gatos
export const COMMON_VACCINES = [
  // Vacunas para perros
  'Rabia',
  'Parvovirus',
  'Moquillo',
  'Hepatitis',
  'Leptospirosis',
  'Parainfluenza',
  'Bordetella',
  'Coronavirus',
  'Sextuple',
  'Quintuple',
  'Triple',
  'Antirrabica',

  // Vacunas para gatos
  'Triple Felina',
  'Leucemia Felina',
  'Rabia Felina',
  'Calicivirus',
  'Rinotraqueitis',
  'Panleucopenia',

  // Otras
  'Giardia',
  'Lyme',
].sort();

/**
 * Normaliza texto removiendo acentos y convirtiendo a minúsculas
 * para búsqueda insensible a mayúsculas y acentos
 */
export const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Filtra vacunas según el término de búsqueda
 */
export const filterVaccines = (searchTerm) => {
  const normalizedSearch = normalizeText(searchTerm);

  return COMMON_VACCINES.filter(vaccine =>
    normalizeText(vaccine).includes(normalizedSearch)
  );
};
