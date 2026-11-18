/**
 * Formats a data value safely, returning "Non renseigné" if missing, null, empty, or undefined.
 */
export function formatData(value?: string | number | null, fallback: string = 'Non renseigné'): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  if (str === '' || str === '()' || str === 'undefined' || str === 'null') return fallback;
  return str;
}

/**
 * Formats name properties safely. Returns "Non renseigné" if both first and last names are missing.
 */
export function formatCandidateName(cand?: { firstName?: string; lastName?: string; nom?: string; prenom?: string } | null): string {
  if (!cand) return 'Non renseigné';
  const first = (cand.firstName || cand.prenom || '').trim();
  const last = (cand.lastName || cand.nom || '').trim();
  const fullName = `${first} ${last}`.trim();
  if (!fullName || fullName === '()') return 'Non renseigné';
  return fullName;
}

/**
 * Formats value with a placeholder like "---" for PDF headers or compact tables.
 */
export function formatDataOrPlaceholder(value?: string | number | null, placeholder: string = '---'): string {
  if (value === null || value === undefined) return placeholder;
  const str = String(value).trim();
  if (str === '' || str === '()' || str === 'undefined' || str === 'null') return placeholder;
  return str;
}

/**
 * Partially masks a Moroccan CIN in lists (e.g., CD584920 -> CD58****20).
 */
export function maskCin(cin?: string | null): string {
  if (!cin) return 'Non renseigné';
  const clean = cin.trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) return 'Non renseigné';
  if (clean.length <= 4) return '****';
  const prefix = clean.slice(0, Math.min(4, clean.length - 2));
  const suffix = clean.slice(-2);
  const maskedLen = Math.max(2, clean.length - prefix.length - suffix.length);
  return `${prefix}${'*'.repeat(maskedLen)}${suffix}`;
}

/**
 * Partially masks a phone number in lists (e.g., +212 6 61 23 45 67 -> +212 6 ** ** ** 67).
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return 'Non renseigné';
  const clean = phone.trim();
  if (!clean) return 'Non renseigné';
  const digits = clean.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  const lastTwo = digits.slice(-2);
  if (clean.startsWith('+212')) {
    const mobilePrefix = digits.slice(3, 4) || '6';
    return `+212 ${mobilePrefix} ** ** ** ${lastTwo}`;
  }
  const startTwo = digits.slice(0, 2);
  return `${startTwo} ** ** ** ${lastTwo}`;
}

/**
 * Computes Moroccan Master Mention automatically from numeric grade (/20).
 */
export function computeMasterMention(gradeInput?: string | number | null): string {
  if (gradeInput === null || gradeInput === undefined) return '';
  const cleaned = String(gradeInput).replace(',', '.').replace(/\/20/g, '').trim();
  if (!cleaned) return '';
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0 || num > 20) return '';
  if (num >= 16) return 'Très Bien';
  if (num >= 14) return 'Bien';
  if (num >= 12) return 'Assez Bien';
  if (num >= 10) return 'Passable';
  return 'Insuffisant';
}

/**
 * Formats YYYY-MM-DD into readable French date.
 */
export function formatFrenchDate(rawDate?: string): string {
  if (!rawDate) return 'Non définie';
  try {
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
      return `${day} ${months[monthNum - 1] || ''} ${year}`;
    }
  } catch {
    // fallback
  }
  return rawDate;
}

/**
 * Formats Moroccan phone numbers into standardized "+212 6 XX XX XX XX" format.
 */
export function formatPhoneStandard(rawPhone?: string): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  if (!digits) return rawPhone.trim();
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '212' + digits.slice(1);
  } else if (digits.startsWith('00212')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('212') && digits.length === 12) {
    const p1 = digits.slice(3, 4);
    const p2 = digits.slice(4, 6);
    const p3 = digits.slice(6, 8);
    const p4 = digits.slice(8, 10);
    const p5 = digits.slice(10, 12);
    return `+212 ${p1} ${p2} ${p3} ${p4} ${p5}`;
  }
  return rawPhone.trim();
}

