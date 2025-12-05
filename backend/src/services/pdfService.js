const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuración de carpetas
const TEMP_DIR = path.join(__dirname, '../../temp');
const UPLOADS_DIR = path.join(__dirname, '../../uploads/pdfs');

// Crear directorios si no existen
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * Textos legales versionados para consentimientos
 */
const LEGAL_TEXTS = {
  ANESTESIA: {
    v1: `
CONSENTIMIENTO INFORMADO PARA ANESTESIA

Yo, el abajo firmante, autorizo la administración de anestesia general a mi mascota.
He sido informado/a de los riesgos asociados con la anestesia, incluyendo pero no
limitado a: reacciones alérgicas, complicaciones respiratorias o cardíacas, y en casos
excepcionales, muerte.

Comprendo que todo procedimiento médico conlleva riesgos y que el personal veterinario
tomará todas las precauciones necesarias para minimizar dichos riesgos. Autorizo al
equipo veterinario a realizar cualquier procedimiento de emergencia que consideren
necesario durante la anestesia.
    `.trim()
  },
  CIRUGIA: {
    v1: `
CONSENTIMIENTO INFORMADO PARA CIRUGÍA

Autorizo al equipo veterinario a realizar el procedimiento quirúrgico indicado en mi mascota.
He sido informado/a de:

• La naturaleza del procedimiento quirúrgico
• Los riesgos asociados, incluyendo infección, hemorragia, y complicaciones anestésicas
• El proceso de recuperación postoperatoria
• Los cuidados necesarios después de la cirugía

Comprendo que pueden surgir complicaciones imprevistas durante la cirugía y autorizo al
equipo veterinario a tomar las decisiones médicas necesarias en el mejor interés de mi mascota.
    `.trim()
  },
  HOSPITALIZACION: {
    v1: `
CONSENTIMIENTO PARA HOSPITALIZACIÓN

Autorizo la hospitalización de mi mascota en las instalaciones veterinarias. Comprendo que:

• Mi mascota será monitoreada regularmente por el personal veterinario
• Se administrarán medicamentos y tratamientos según indicación médica
• En caso de emergencia, el equipo veterinario tomará las medidas necesarias
• Seré contactado/a ante cualquier cambio significativo en el estado de mi mascota

Autorizo los tratamientos médicos necesarios durante la hospitalización.
    `.trim()
  },
  VACUNACION: {
    v1: `
AUTORIZACIÓN PARA VACUNACIÓN

Autorizo la aplicación de vacuna(s) a mi mascota. He sido informado/a sobre:

• El tipo de vacuna que se aplicará
• Los beneficios de la vacunación para prevenir enfermedades
• Posibles reacciones adversas leves (inflamación, letargo, fiebre leve)
• Riesgos poco frecuentes como reacciones alérgicas severas

Comprendo que la vacunación es un procedimiento médico preventivo y que existe un pequeño
riesgo de efectos secundarios. Me comprometo a observar a mi mascota después de la vacunación
y reportar cualquier reacción adversa al equipo veterinario.

Confirmo que mi mascota está en buen estado de salud al momento de la vacunación.
    `.trim()
  },
  ESTETICA: {
    v1: `
CONSENTIMIENTO PARA PROCEDIMIENTO ESTÉTICO

Autorizo la realización de procedimientos estéticos en mi mascota. He sido informado/a de:

• El tipo de procedimiento a realizar (corte, baño, limpieza, etc.)
• Los cuidados y manejo necesarios durante el procedimiento
• Posibles reacciones como estrés o incomodidad temporal
• El uso de productos especializados según las necesidades de mi mascota

Comprendo que algunos procedimientos pueden requerir sedación leve si mi mascota presenta
ansiedad extrema o comportamiento agresivo, y autorizo al equipo veterinario a tomar esta
decisión en el mejor interés del animal.

Declaro que mi mascota no tiene condiciones de salud que contraindiquen el procedimiento.
    `.trim()
  },
  EUTANASIA: {
    v1: `
CONSENTIMIENTO PARA EUTANASIA HUMANITARIA

Con profundo dolor pero actuando en el mejor interés de mi mascota, autorizo la realización
de eutanasia humanitaria. He sido informado/a de:

• El estado de salud actual de mi mascota y el pronóstico
• El procedimiento de eutanasia, que será realizado de manera indolora y digna
• Que la eutanasia es un acto médico irreversible
• Las opciones para la disposición final del cuerpo

Comprendo que esta decisión busca evitar el sufrimiento innecesario de mi mascota y que
será realizada con compasión y respeto. He tenido la oportunidad de hacer todas las preguntas
necesarias y estoy tomando esta decisión de manera voluntaria e informada.

Confirmo que soy el propietario legal de la mascota y tengo la autoridad para tomar esta decisión.
    `.trim()
  },
  OTRO: {
    v1: `
CONSENTIMIENTO INFORMADO GENERAL

Autorizo al equipo veterinario a realizar el procedimiento médico indicado en mi mascota.
He sido informado/a de:

• La naturaleza del procedimiento
• Los riesgos y beneficios asociados
• Las alternativas disponibles, si las hay
• El proceso de recuperación esperado

Comprendo que todo procedimiento médico conlleva riesgos inherentes y que el personal
veterinario tomará todas las precauciones necesarias. Autorizo al equipo a tomar las
decisiones médicas que consideren necesarias en el mejor interés de mi mascota.
    `.trim()
  }
};

/**
 * Convierte una imagen base64 a buffer
 */
const base64ToBuffer = (base64String) => {
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
};

/**
 * Procesa y optimiza una imagen de firma
 */
const processSignatureImage = async (signatureBase64) => {
  try {
    const buffer = base64ToBuffer(signatureBase64);

    // Optimizar imagen: convertir a PNG, resize si es muy grande
    const processedBuffer = await sharp(buffer)
      .resize(400, 200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .png()
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    console.error('Error processing signature image:', error);
    throw new Error('Failed to process signature image');
  }
};

/**
 * Genera un PDF de consentimiento informado
 */
const generateConsentPdf = async (data) => {
  const {
    consentType,
    signerName,
    signerRelation = 'Propietario',
    petName,
    petSpecies,
    vetName,
    clinicName = 'Clínica Veterinaria',
    signatureBase64,
    emergencyContactName,
    emergencyContactPhone,
    legalTextVersion = 'v1'
  } = data;

  return new Promise(async (resolve, reject) => {
    try {
      // Crear documento PDF
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const filename = `consent-${Date.now()}.pdf`;
      const filepath = path.join(UPLOADS_DIR, filename);
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // HEADER
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(clinicName, { align: 'center' })
         .moveDown(0.5);

      doc.fontSize(16)
         .text('CONSENTIMIENTO INFORMADO', { align: 'center' })
         .moveDown(1);

      // Información del procedimiento
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Tipo de Procedimiento:', { continued: true })
         .font('Helvetica')
         .text(` ${consentType}`);

      doc.font('Helvetica-Bold')
         .text('Fecha:', { continued: true })
         .font('Helvetica')
         .text(` ${new Date().toLocaleDateString('es-MX', {
           year: 'numeric',
           month: 'long',
           day: 'numeric'
         })}`);

      doc.moveDown(1);

      // Información de la mascota
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('DATOS DE LA MASCOTA')
         .moveDown(0.5);

      doc.fontSize(11)
         .font('Helvetica')
         .text(`Nombre: ${petName}`)
         .text(`Especie: ${petSpecies}`)
         .moveDown(1);

      // Información del firmante
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('DATOS DEL RESPONSABLE')
         .moveDown(0.5);

      doc.fontSize(11)
         .font('Helvetica')
         .text(`Nombre: ${signerName}`)
         .text(`Relación: ${signerRelation}`);

      if (emergencyContactName && emergencyContactPhone) {
        doc.text(`Contacto de Emergencia: ${emergencyContactName}`)
           .text(`Teléfono: ${emergencyContactPhone}`);
      }

      doc.moveDown(1.5);

      // Texto legal
      const legalText = LEGAL_TEXTS[consentType]?.[legalTextVersion] ||
                        LEGAL_TEXTS.OTRO.v1;

      doc.fontSize(10)
         .font('Helvetica')
         .text(legalText, {
           align: 'justify',
           lineGap: 3
         });

      doc.moveDown(1);

      // Declaración de aceptación
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('DECLARACIÓN DE ACEPTACIÓN', { underline: true })
         .moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(
           'He leído y comprendido la información proporcionada. Todas mis preguntas ' +
           'han sido respondidas satisfactoriamente. Autorizo voluntariamente la ' +
           'realización del procedimiento indicado.',
           { align: 'justify' }
         );

      doc.moveDown(2);

      // Firma
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('FIRMA DEL RESPONSABLE:')
         .moveDown(0.5);

      // Procesar e insertar imagen de firma si existe
      if (signatureBase64) {
        try {
          const signatureBuffer = await processSignatureImage(signatureBase64);
          const tempSignaturePath = path.join(TEMP_DIR, `sig-${Date.now()}.png`);
          fs.writeFileSync(tempSignaturePath, signatureBuffer);

          doc.image(tempSignaturePath, {
            fit: [200, 100],
            align: 'left'
          });

          // Limpiar archivo temporal
          fs.unlinkSync(tempSignaturePath);
        } catch (error) {
          console.error('Error adding signature to PDF:', error);
          doc.fontSize(10).text('[Firma no disponible]');
        }
      }

      doc.moveDown(1);

      // Línea para nombre impreso
      doc.fontSize(10)
         .text('_'.repeat(50))
         .moveDown(0.3)
         .text(signerName, { align: 'left' });

      // Footer
      doc.fontSize(8)
         .font('Helvetica-Oblique')
         .text(
           `\nVeterinario Responsable: ${vetName}`,
           50,
           doc.page.height - 80,
           { align: 'left' }
         );

      doc.text(
        `Versión del documento: ${legalTextVersion}`,
        50,
        doc.page.height - 65,
        { align: 'left' }
      );

      doc.text(
        `Generado: ${new Date().toISOString()}`,
        50,
        doc.page.height - 50,
        { align: 'left' }
      );

      // Finalizar documento
      doc.end();

      stream.on('finish', () => {
        resolve({
          success: true,
          filename,
          filepath,
          relativePath: `uploads/pdfs/${filename}`
        });
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Genera un PDF de certificado de defunción
 */
const generateDeathCertificatePdf = async (data) => {
  const {
    petName,
    petSpecies,
    petBreed,
    ownerName,
    vetName,
    vetLicense,
    deathDate,
    deathType,
    causeOfDeath,
    bodyDisposal,
    disposalLocation,
    witnessName,
    witnessRelation,
    clinicName = 'Clínica Veterinaria',
    clinicAddress = '',
    notes = ''
  } = data;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 60, bottom: 60, left: 60, right: 60 }
      });

      const filename = `death-certificate-${Date.now()}.pdf`;
      const filepath = path.join(UPLOADS_DIR, filename);
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // HEADER CON BORDE
      doc.rect(50, 50, doc.page.width - 100, doc.page.height - 100)
         .stroke();

      // Título
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .text('CERTIFICADO DE DEFUNCIÓN', 60, 70, {
           align: 'center',
           width: doc.page.width - 120
         })
         .moveDown(0.3);

      doc.fontSize(16)
         .text('ANIMAL DE COMPAÑÍA', {
           align: 'center'
         })
         .moveDown(2);

      // Información de la clínica
      doc.fontSize(10)
         .font('Helvetica')
         .text(clinicName, { align: 'center' });

      if (clinicAddress) {
        doc.text(clinicAddress, { align: 'center' });
      }

      doc.moveDown(2);

      // Datos del animal
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('DATOS DEL ANIMAL FALLECIDO', 80)
         .moveDown(0.8);

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Nombre:', 80, doc.y, { continued: true })
         .font('Helvetica')
         .text(` ${petName}`);

      doc.font('Helvetica-Bold')
         .text('Especie:', 80, doc.y, { continued: true })
         .font('Helvetica')
         .text(` ${petSpecies}`);

      if (petBreed) {
        doc.font('Helvetica-Bold')
           .text('Raza:', 80, doc.y, { continued: true })
           .font('Helvetica')
           .text(` ${petBreed}`);
      }

      doc.font('Helvetica-Bold')
         .text('Propietario:', 80, doc.y, { continued: true })
         .font('Helvetica')
         .text(` ${ownerName}`);

      doc.moveDown(1.5);

      // Datos del fallecimiento
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('DATOS DEL FALLECIMIENTO', 80)
         .moveDown(0.8);

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Fecha de Defunción:', 80, doc.y, { continued: true })
         .font('Helvetica')
         .text(` ${new Date(deathDate).toLocaleDateString('es-MX', {
           year: 'numeric',
           month: 'long',
           day: 'numeric'
         })}`);

      doc.font('Helvetica-Bold')
         .text('Tipo de Muerte:', 80, doc.y, { continued: true })
         .font('Helvetica')
         .text(` ${deathType}`);

      doc.font('Helvetica-Bold')
         .text('Causa de Muerte:', 80, doc.y)
         .font('Helvetica')
         .text(causeOfDeath, 80, doc.y, {
           width: doc.page.width - 160,
           align: 'justify'
         });

      doc.moveDown(1);

      doc.font('Helvetica-Bold')
         .text('Disposición del Cuerpo:', 80, doc.y, { continued: true })
         .font('Helvetica')
         .text(` ${bodyDisposal}`);

      if (disposalLocation) {
        doc.font('Helvetica-Bold')
           .text('Lugar:', 80, doc.y, { continued: true })
           .font('Helvetica')
           .text(` ${disposalLocation}`);
      }

      if (notes) {
        doc.moveDown(1);
        doc.font('Helvetica-Bold')
           .text('Observaciones:', 80, doc.y)
           .font('Helvetica')
           .text(notes, 80, doc.y, {
             width: doc.page.width - 160,
             align: 'justify'
           });
      }

      doc.moveDown(2);

      // Testigo
      if (witnessName) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text('Testigo:', 80, doc.y, { continued: true })
           .font('Helvetica')
           .text(` ${witnessName}`);

        if (witnessRelation) {
          doc.font('Helvetica-Bold')
             .text('Relación:', 80, doc.y, { continued: true })
             .font('Helvetica')
             .text(` ${witnessRelation}`);
        }

        doc.moveDown(1.5);
      }

      // Certificación veterinaria
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('CERTIFICACIÓN MÉDICA VETERINARIA', 80, doc.y)
         .moveDown(1);

      doc.fontSize(10)
         .font('Helvetica')
         .text(
           `Yo, ${vetName}, Médico Veterinario Zootecnista con Cédula Profesional ${vetLicense}, ` +
           `certifico que el animal descrito falleció en la fecha y circunstancias arriba indicadas.`,
           80, doc.y, {
             width: doc.page.width - 160,
             align: 'justify'
           }
         );

      doc.moveDown(2);

      // Firma del veterinario
      doc.fontSize(10)
         .text('_'.repeat(40), 80, doc.y)
         .moveDown(0.3)
         .font('Helvetica-Bold')
         .text(vetName, 80, doc.y)
         .font('Helvetica')
         .text(`Cédula Profesional: ${vetLicense}`, 80, doc.y);

      // Footer
      doc.fontSize(8)
         .font('Helvetica-Oblique')
         .text(
           `Certificado generado el ${new Date().toLocaleString('es-MX')}`,
           60,
           doc.page.height - 80,
           { align: 'center', width: doc.page.width - 120 }
         );

      doc.text(
        'Este documento es un certificado médico veterinario oficial',
        60,
        doc.page.height - 65,
        { align: 'center', width: doc.page.width - 120 }
      );

      // Finalizar
      doc.end();

      stream.on('finish', () => {
        resolve({
          success: true,
          filename,
          filepath,
          relativePath: `uploads/pdfs/${filename}`
        });
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateConsentPdf,
  generateDeathCertificatePdf,
  LEGAL_TEXTS
};
