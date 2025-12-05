/**
 * Esquema estándar de vacunación para mascotas
 * Usado para visualizar "lo que falta" en el Pasaporte de Vacunación
 */

export const VACCINE_SCHEME = {
  // Esquema para cachorros (primeras 16 semanas)
  PUPPY: [
    {
      name: 'Parvovirus',
      week: 6,
      description: 'Primera protección contra parvovirus',
      category: 'core'
    },
    {
      name: 'Moquillo',
      week: 6,
      description: 'Primera protección contra moquillo',
      category: 'core'
    },
    {
      name: 'Polivalente/Séxtuple',
      week: 10,
      description: 'Protección múltiple (Moquillo, Adenovirus, Parainfluenza, Parvovirus, Leptospira)',
      category: 'core'
    },
    {
      name: 'Refuerzo Polivalente',
      week: 14,
      description: 'Refuerzo de protección múltiple',
      category: 'core'
    },
    {
      name: 'Rabia',
      week: 16,
      description: 'Vacuna antirrábica - Obligatoria',
      category: 'core'
    },
  ],

  // Esquema para adultos (refuerzos anuales)
  ADULT: [
    {
      name: 'Refuerzo Rabia',
      frequency: 'Anual',
      description: 'Refuerzo antirrábico anual',
      category: 'core'
    },
    {
      name: 'Refuerzo Séxtuple',
      frequency: 'Anual',
      description: 'Refuerzo anual de protección múltiple',
      category: 'core'
    },
    {
      name: 'Bordetella',
      frequency: 'Opcional',
      description: 'Protección contra tos de las perreras',
      category: 'optional'
    },
    {
      name: 'Leptospirosis',
      frequency: 'Anual',
      description: 'Protección contra leptospirosis',
      category: 'core'
    },
  ]
};

/**
 * Nombres alternativos o similares de vacunas
 * Para hacer match con nombres ingresados por diferentes veterinarios
 */
export const VACCINE_ALIASES = {
  'Parvovirus': ['parvo', 'parvovirus', 'parvovirosis'],
  'Moquillo': ['moquillo', 'distemper'],
  'Polivalente/Séxtuple': ['sextuple', 'séxtuple', 'polivalente', '6en1', 'dhppl', 'dhpp'],
  'Refuerzo Polivalente': ['refuerzo polivalente', 'refuerzo sextuple', 'refuerzo séxtuple'],
  'Rabia': ['rabia', 'antirrábica', 'antirrabica', 'rabies'],
  'Refuerzo Rabia': ['refuerzo rabia', 'refuerzo antirrábica', 'refuerzo antirrabica'],
  'Refuerzo Séxtuple': ['refuerzo sextuple', 'refuerzo séxtuple', 'refuerzo 6en1'],
  'Bordetella': ['bordetella', 'tos de las perreras', 'traqueobronquitis'],
  'Leptospirosis': ['leptospirosis', 'lepto'],
};

/**
 * Determina si una mascota es cachorro basándose en su edad en semanas
 */
export const isPuppy = (ageInWeeks) => {
  return ageInWeeks <= 16;
};

/**
 * Calcula la edad de una mascota en semanas desde su fecha de nacimiento
 */
export const getAgeInWeeks = (birthDate) => {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const now = new Date();
  const diffTime = Math.abs(now - birth);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.floor(diffDays / 7);
};

/**
 * Compara el nombre de una vacuna registrada con el esquema estándar
 * Retorna el nombre estándar si hay match, o null
 */
export const matchVaccineName = (registeredName) => {
  if (!registeredName) return null;

  const lowerRegistered = registeredName.toLowerCase().trim();

  for (const [standardName, aliases] of Object.entries(VACCINE_ALIASES)) {
    if (aliases.some(alias => lowerRegistered.includes(alias))) {
      return standardName;
    }
  }

  return null;
};

/**
 * Obtiene el esquema de vacunación apropiado según la edad de la mascota
 */
export const getVaccineScheme = (birthDate) => {
  const ageInWeeks = getAgeInWeeks(birthDate);

  if (ageInWeeks === null) {
    // Si no hay fecha de nacimiento, mostrar esquema de adulto
    return VACCINE_SCHEME.ADULT;
  }

  return isPuppy(ageInWeeks) ? VACCINE_SCHEME.PUPPY : VACCINE_SCHEME.ADULT;
};
