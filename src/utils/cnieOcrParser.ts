/**
 * Pure Real-time ICAO TD1 MRZ Preprocessing, OCR extraction & Tolerant Parsing for Moroccan CNIE
 *
 * Implements:
 * 1. Bottom-crop (lower 35-40% of the card containing the 3 MRZ lines)
 * 2. Grayscale conversion + contrast stretching + 2x-3.5x upscaling
 * 3. Tesseract.js real OCR execution with whitelist A-Z, 0-9, <
 * 4. Parseur MRZ tolérant :
 *    - Ne suppose pas que les lignes font exactement 30 caractères ni un ordre fixe.
 *    - Nettoie le texte (majuscules, suppression espaces, garde A-Z, 0-9, <).
 *    - Repère chaque ligne par son contenu (Ligne 1: I<MAR / MAR dans les 6 premiers chars; Ligne 2: 6 chiffres + check + M/F + MAR<; Ligne 3: << avec lettres autour).
 *    - Complète ou tronque chaque ligne à 30 caractères avec « < ».
 *    - Extrait CIN (caractères 6 à 13 ligne 1), date de naissance (6 premiers chars ligne 2), sexe (caractère 8 ligne 2), expiration (caractères 9 à 14 ligne 2), nom/prénom (ligne 3 séparée par <<).
 *    - Remplissage tolérant : si une ligne n'est pas trouvée, remplit quand même les champs extraits sans abandonner.
 *    - Logs console du texte OCR nettoyé et de l'objet extrait.
 */

export interface FieldValidationStatus {
  isValid: boolean;
  isUncertain: boolean;
  message?: string;
}

export interface CnieExtractedResult {
  lastName: string;
  firstName: string;
  cin: string;
  birthDateFormatted: string; // DD/MM/YYYY
  birthDateIso: string; // YYYY-MM-DD
  gender: 'M' | 'F' | '';
  expiryDateFormatted: string; // DD/MM/YYYY
  expiryDateIso: string; // YYYY-MM-DD
  nationality: string;
  validation: {
    cinCheck: FieldValidationStatus;
    birthDateCheck: FieldValidationStatus;
    expiryDateCheck: FieldValidationStatus;
    overallCheck: FieldValidationStatus;
  };
  mrzLines: string[];
}

/**
 * Calculates ICAO 7-3-1 check digit
 * Characters: 0-9 = 0-9, A-Z = 10-35, < = 0
 * Weights repeat: 7, 3, 1, 7, 3, 1...
 * Result is sum % 10
 */
export function calculateIcaoCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i].toUpperCase();
    let val = 0;
    if (ch >= '0' && ch <= '9') {
      val = parseInt(ch, 10);
    } else if (ch >= 'A' && ch <= 'Z') {
      val = ch.charCodeAt(0) - 55; // 'A' (65) -> 10
    } else if (ch === '<') {
      val = 0;
    }
    sum += val * weights[i % 3];
  }

  return sum % 10;
}

/**
 * Cleans frequent OCR character confusions in numeric zones:
 * O or Q -> 0, I or L -> 1, S -> 5, B -> 8
 */
export function fixNumericOcrErrors(str: string): string {
  return str
    .replace(/[OQ]/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8');
}

/**
 * Cleans frequent OCR character confusions in alpha zones (Names):
 * 0 -> O, 1 -> I, 5 -> S, 8 -> B
 */
export function fixAlphaOcrErrors(str: string): string {
  return str
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B');
}

/**
 * Validates Moroccan National Identity Card (CNIE) format
 * Moroccan CINs consist of 1 to 2 uppercase letters followed by 4 to 7 digits
 * (Standard modern format: 2 letters + 5 or 6 digits, e.g., CD584920, AA123456, K123456)
 */
export function validateMoroccanCin(cin: string): boolean {
  if (!cin) return false;
  const clean = cin.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z]{1,2}[0-9]{4,7}$/.test(clean);
}

/**
 * Crops the lower ~38% of the card where the MRZ resides,
 * converts to grayscale, increases contrast, and enlarges the canvas (2x) for high Tesseract accuracy.
 */
export async function extractAndPreprocessMrzRegion(
  imageSource: string | File | Blob
): Promise<{ mrzCanvasDataUrl: string; fullWidth: number; fullHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const origWidth = img.width;
        const origHeight = img.height;

        // MRZ typically covers the bottom 35% - 42% of a TD1 card
        const cropY = Math.floor(origHeight * 0.58);
        const cropHeight = origHeight - cropY;
        const cropWidth = origWidth;

        // Upscale factor for OCR (at least ~1200px wide for optimal character segmentation)
        const scale = Math.max(2, Math.min(3.5, 1600 / cropWidth));
        const destWidth = Math.round(cropWidth * scale);
        const destHeight = Math.round(cropHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = destWidth;
        canvas.height = destHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Impossible d'initialiser le contexte graphique 2D"));
        }

        // Draw cropped bottom region with high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, cropY, cropWidth, cropHeight, 0, 0, destWidth, destHeight);

        // Pixel-level Preprocessing: Grayscale conversion & Contrast enhancement
        const imgData = ctx.getImageData(0, 0, destWidth, destHeight);
        const data = imgData.data;

        // Contrast enhancement factor
        const contrast = 1.45;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Luminosity method (standard ITU-R BT.601)
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;

          // Contrast curve
          gray = factor * (gray - 128) + 128;
          gray = Math.max(0, Math.min(255, gray));

          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve({
          mrzCanvasDataUrl: canvas.toDataURL('image/png'),
          fullWidth: origWidth,
          fullHeight: origHeight
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error("Erreur de chargement de l'image de la carte"));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Échec de lecture du fichier image"));
      reader.readAsDataURL(imageSource);
    }
  });
}

/**
 * Deduce Century and formats date into DD/MM/YYYY and ISO YYYY-MM-DD
 */
export function parseIcaoDate(
  yymmdd: string,
  isBirth: boolean = true
): { formatted: string; iso: string; isValid: boolean } {
  if (!yymmdd || yymmdd.length !== 6) {
    return { formatted: '', iso: '', isValid: false };
  }

  const clean = fixNumericOcrErrors(yymmdd);
  if (!/^\d{6}$/.test(clean)) {
    return { formatted: '', iso: '', isValid: false };
  }

  const yy = parseInt(clean.substring(0, 2), 10);
  const mm = clean.substring(2, 4);
  const dd = clean.substring(4, 6);

  const mInt = parseInt(mm, 10);
  const dInt = parseInt(dd, 10);
  if (mInt < 1 || mInt > 12 || dInt < 1 || dInt > 31) {
    return { formatted: '', iso: '', isValid: false };
  }

  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;

  let fullYear: number;
  if (isBirth) {
    // Pour un doctorant, la date de naissance est généralement entre 1945 et 2008
    if (yy <= (currentYY - 18)) {
      fullYear = 2000 + yy;
    } else {
      fullYear = 1900 + yy;
    }
  } else {
    // Date d'expiration (généralement 2015 à 2045)
    if (yy >= 80) {
      fullYear = 1900 + yy;
    } else {
      fullYear = 2000 + yy;
    }
  }

  const formatted = `${dd}/${mm}/${fullYear}`;
  const iso = `${fullYear}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  return { formatted, iso, isValid: true };
}

/**
 * Parseur MRZ tolérant :
 * 1. Ne suppose pas que les lignes font exactement 30 caractères ni qu'elles sont dans un ordre fixe.
 * 2. Nettoie le texte (majuscules, suppression des espaces, ne garde que A-Z, 0-9 et « < »).
 * 3. Repère chaque ligne par son contenu :
 *    - Ligne 1 : commence par « I<MAR » (ou contient « MAR » dans les 6 premiers caractères)
 *    - Ligne 2 : contient 6 chiffres suivis d'un chiffre de contrôle, puis M ou F, et se termine par « MAR » suivi de « < »
 *    - Ligne 3 : contient « << » avec uniquement des lettres autour
 * 4. Complète ou tronque chaque ligne à 30 caractères avec « < ».
 * 5. Extrait :
 *    - CIN = caractères 6 à 13 de la ligne 1 (8 caractères, ex. CD584920)
 *    - Date de naissance = 6 premiers caractères de la ligne 2 (AAMMJJ)
 *    - Sexe = caractère 8 de la ligne 2
 *    - Expiration = caractères 9 à 14 de la ligne 2
 *    - Nom et prénom = ligne 3 séparée par « << »
 * 6. Si une ligne n'est pas trouvée, remplit quand même les champs extraits au lieu de tout abandonner.
 */
export function parseIcaoTd1Lines(rawLines: string[]): CnieExtractedResult | null {
  // Nettoie le texte : majuscules, suppression des espaces, ne garde que A-Z, 0-9 et « < »
  const cleanedLines = rawLines
    .map((l) => l.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, ''))
    .filter((l) => l.length >= 4);

  // LOG REQUIS : Texte OCR nettoyé
  console.log("=== MRZ OCR TEXTE NETTOYÉ ===", cleanedLines);

  if (cleanedLines.length === 0) {
    return null;
  }

  // --- REPÉRAGE TOLÉRANT DE CHAQUE LIGNE PAR SON CONTENU ---
  let line1 = '';
  let line2 = '';
  let line3 = '';

  // 1. Détection Ligne 1 : commence par « I<MAR » (ou contient « MAR » dans les 6 premiers caractères)
  for (const line of cleanedLines) {
    if (
      line.startsWith('I<MAR') ||
      line.startsWith('IDMAR') ||
      line.startsWith('IMAR') ||
      line.substring(0, 6).includes('MAR')
    ) {
      line1 = line;
      break;
    }
  }

  // 2. Détection Ligne 2 : contient 6 chiffres suivis d'un chiffre de contrôle, puis M ou F, et se termine par « MAR » suivi de « < »
  for (const line of cleanedLines) {
    if (line === line1) continue;
    // Ne doit pas être la ligne 1
    if (line.substring(0, 6).includes('MAR')) continue;

    const numericPrefix = fixNumericOcrErrors(line.substring(0, 7));
    const hasDateCheckSex = /^[0-9]{6}[0-9<][MF]/.test(numericPrefix + line.substring(7));
    const hasMarChevron = /MAR<+/.test(line) || /MAR/.test(line.substring(8));

    if (hasDateCheckSex && hasMarChevron) {
      line2 = line;
      break;
    }

    // Tolérance : contient 6 chiffres + char + M ou F + MAR
    if (/[0-9OQILSB]{6}.[MF]/.test(line) && line.includes('MAR')) {
      line2 = line;
      break;
    }

    // Tolérance : motif de dates AAMMJJ + sexe + AAMMJJ
    if (/[0-9OQILSB]{6}.[MF][0-9OQILSB]{6}/.test(line)) {
      line2 = line;
      break;
    }
  }

  // 3. Détection Ligne 3 : contient « << » avec uniquement des lettres autour
  for (const line of cleanedLines) {
    if (line === line1 || line === line2) continue;
    if (line.includes('<<')) {
      const withoutChevrons = line.replace(/</g, '');
      const alphaCount = (withoutChevrons.match(/[A-Z]/g) || []).length;
      if (alphaCount >= 2) {
        line3 = line;
        break;
      }
    }
  }

  // Repli souple si une des lignes n'a pas été affectée
  const unassigned = cleanedLines.filter((l) => l !== line1 && l !== line2 && l !== line3);
  if (!line1 && unassigned.length > 0) {
    const cand1 = unassigned.find((l) => l.includes('MAR') && !l.includes('<<'));
    if (cand1) line1 = cand1;
  }
  if (!line3 && unassigned.length > 0) {
    const cand3 = unassigned.find((l) => l.includes('<') && /[A-Z]{3,}/.test(l));
    if (cand3) line3 = cand3;
  }
  if (!line2 && unassigned.length > 0) {
    const cand2 = unassigned.find((l) => /[0-9]{5,}/.test(l) || l.includes('M') || l.includes('F'));
    if (cand2) line2 = cand2;
  }

  // 4. Complète ou tronque chaque ligne à 30 caractères avec « < »
  if (line1) {
    line1 = line1.length > 30 ? line1.substring(0, 30) : line1.padEnd(30, '<');
  }
  if (line2) {
    line2 = line2.length > 30 ? line2.substring(0, 30) : line2.padEnd(30, '<');
  }
  if (line3) {
    line3 = line3.length > 30 ? line3.substring(0, 30) : line3.padEnd(30, '<');
  }

  console.log("=== MRZ LIGNES NORMALISÉES (30 CHARS) ===", { line1, line2, line3 });

  // --- 5. EXTRACTION DES CHAMPS ---

  // CIN = caractères 6 à 13 de la ligne 1 (8 caractères, ex. CD584920)
  let cin = '';
  let cinValid = false;
  let cinUncertain = false;
  let cinCheckMsg = '';

  if (line1) {
    // Caractères 6 à 13 (1-indexed => indices 5 à 13 en JS substring, soit 8 caractères)
    const rawCinField = line1.substring(5, 13);
    const cleanedCin = rawCinField.replace(/<+$/, '');

    // Correction des confusions OCR : préfixe 1-2 lettres (ex. CD, AB, K) + chiffres
    const prefixMatch = cleanedCin.match(/^([A-Z0-9]{1,2})([A-Z0-9]*)$/);
    if (prefixMatch) {
      const letters = fixAlphaOcrErrors(prefixMatch[1]);
      const numbers = fixNumericOcrErrors(prefixMatch[2]);
      cin = `${letters}${numbers}`;
    } else {
      cin = cleanedCin;
    }

    // Chiffre de contrôle (14e caractère = index 13)
    const checkChar = line1.charAt(13);
    if (checkChar && checkChar !== '<') {
      const expected = calculateIcaoCheckDigit(rawCinField);
      const actual = parseInt(fixNumericOcrErrors(checkChar), 10);
      if (!isNaN(actual) && expected === actual) {
        cinValid = true;
      } else {
        cinUncertain = true;
        cinCheckMsg = "Chiffre de contrôle incertain";
      }
    } else {
      cinValid = validateMoroccanCin(cin);
    }
  }

  // Repli de sécurité pour le CIN s'il est resté vide
  if (!cin) {
    for (const l of cleanedLines) {
      const fallback = l.match(/([A-Z]{1,2}[0-9]{4,7})/);
      if (fallback) {
        cin = fallback[1];
        cinUncertain = true;
        break;
      }
    }
  }

  // Date de naissance = 6 premiers caractères de la ligne 2 (AAMMJJ)
  let birthDateFormatted = '';
  let birthDateIso = '';
  let birthDateValid = false;
  let birthDateUncertain = false;

  if (line2) {
    const rawBirth = fixNumericOcrErrors(line2.substring(0, 6));
    const parsed = parseIcaoDate(rawBirth, true);
    birthDateFormatted = parsed.formatted;
    birthDateIso = parsed.iso;
    birthDateValid = parsed.isValid;

    // Chiffre de contrôle de la date de naissance (caractère 7 = index 6)
    const checkChar = line2.charAt(6);
    if (checkChar && checkChar !== '<') {
      const expected = calculateIcaoCheckDigit(rawBirth);
      const actual = parseInt(fixNumericOcrErrors(checkChar), 10);
      if (!isNaN(actual) && expected !== actual) {
        birthDateUncertain = true;
      }
    }
  }

  // Sexe = caractère 8 de la ligne 2 (index 7 en JS)
  let gender: 'M' | 'F' | '' = '';
  if (line2) {
    const sexChar = line2.charAt(7).toUpperCase();
    if (sexChar === 'F' || sexChar === 'M') {
      gender = sexChar;
    } else if (line2.charAt(6) === 'F' || line2.charAt(8) === 'F') {
      gender = 'F';
    } else if (line2.charAt(6) === 'M' || line2.charAt(8) === 'M') {
      gender = 'M';
    }
  }

  // Expiration = caractères 9 à 14 de la ligne 2 (index 8 à 14 en JS, AAMMJJ)
  let expiryDateFormatted = '';
  let expiryDateIso = '';
  let expiryDateValid = false;
  let expiryDateUncertain = false;

  if (line2) {
    const rawExpiry = fixNumericOcrErrors(line2.substring(8, 14));
    const parsed = parseIcaoDate(rawExpiry, false);
    expiryDateFormatted = parsed.formatted;
    expiryDateIso = parsed.iso;
    expiryDateValid = parsed.isValid;

    // Chiffre de contrôle expiration (caractère 15 = index 14)
    const checkChar = line2.charAt(14);
    if (checkChar && checkChar !== '<') {
      const expected = calculateIcaoCheckDigit(rawExpiry);
      const actual = parseInt(fixNumericOcrErrors(checkChar), 10);
      if (!isNaN(actual) && expected !== actual) {
        expiryDateUncertain = true;
      }
    }
  }

  // Nom et prénom = ligne 3 séparée par « << »
  let lastName = '';
  let firstName = '';

  if (line3) {
    const parts = line3.split('<<');
    if (parts.length >= 2) {
      lastName = fixAlphaOcrErrors(parts[0].replace(/</g, ' ').trim()).toUpperCase();
      const rawFirstName = parts.slice(1).join(' ').replace(/</g, ' ').trim();
      const cleanFirst = fixAlphaOcrErrors(rawFirstName);
      firstName = cleanFirst
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    } else {
      const singleParts = line3.split('<').filter((s) => s.trim().length > 0);
      if (singleParts.length >= 2) {
        lastName = fixAlphaOcrErrors(singleParts[0]).toUpperCase();
        firstName = singleParts.slice(1).map((p) => fixAlphaOcrErrors(p)).join(' ');
      } else if (singleParts.length === 1) {
        lastName = fixAlphaOcrErrors(singleParts[0]).toUpperCase();
      }
    }
  }

  // Si au moins un champ a pu être extrait, on ne renvoie PAS null, on remplit tout ce qui est disponible
  const hasExtractedAny = !!(cin || lastName || firstName || birthDateIso || gender || expiryDateIso);
  if (!hasExtractedAny) {
    return null;
  }

  const result: CnieExtractedResult = {
    lastName,
    firstName,
    cin: cin.toUpperCase(),
    birthDateFormatted,
    birthDateIso,
    gender,
    expiryDateFormatted,
    expiryDateIso,
    nationality: 'Marocaine',
    validation: {
      cinCheck: {
        isValid: cinValid || (!!cin && validateMoroccanCin(cin)),
        isUncertain: cinUncertain,
        message: cinCheckMsg,
      },
      birthDateCheck: {
        isValid: birthDateValid,
        isUncertain: birthDateUncertain,
      },
      expiryDateCheck: {
        isValid: expiryDateValid,
        isUncertain: expiryDateUncertain,
      },
      overallCheck: {
        isValid: (cinValid || !!cin) && (birthDateValid || !!birthDateIso),
        isUncertain: cinUncertain || birthDateUncertain,
      },
    },
    mrzLines: [line1, line2, line3].filter(Boolean),
  };

  // LOG REQUIS : Objet extrait
  console.log("=== MRZ OBJET EXTRAIT ===", result);

  return result;
}

/**
 * Executes the real OCR recognition on the preprocessed bottom MRZ canvas
 * using Tesseract.js in-browser worker.
 */
export async function runRealMrzOcr(
  mrzCanvasDataUrl: string,
  onProgress?: (progress: number, status: string) => void
): Promise<CnieExtractedResult | null> {
  const { createWorker } = await import('tesseract.js');

  onProgress?.(15, "Initialisation du moteur OCR Tesseract...");
  const worker = await createWorker('eng');

  try {
    onProgress?.(30, "Configuration de la liste blanche MRZ (A-Z, 0-9, <)...");
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      tessedit_pageseg_mode: '6' as any, // Single uniform block of text (PSM_SINGLE_BLOCK)
    });

    onProgress?.(55, "Lecture optique de la zone MRZ ICAO TD1...");
    const result = await worker.recognize(mrzCanvasDataUrl);

    onProgress?.(85, "Analyse et vérification des données de la CNIE...");
    const rawText = result.data.text || '';
    const rawLines = rawText.split(/\r?\n/);

    const parsedResult = parseIcaoTd1Lines(rawLines);

    await worker.terminate();
    onProgress?.(100, "Extraction terminée !");

    return parsedResult;
  } catch (err) {
    await worker.terminate().catch(() => {});
    throw err;
  }
}
