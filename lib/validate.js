import { PHONE_VISIBILITY } from '@/lib/branch';

export const GENDERS = ['male', 'female', 'other'];
export const UNION_STATUSES = ['married', 'divorced', 'separated'];

export const clean = (value, max = 100) => String(value ?? '').trim().slice(0, max);

export function isBlobUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

function cleanLink(value) {
  const link = clean(value, 500);
  if (!link) return '';
  try {
    const parsed = new URL(link);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
  } catch {}
  throw new Error('Social link must start with http:// or https://');
}

// Keeps digits, spaces, +, -, ( ) so numbers like "+91 98765 43210" stay readable.
function cleanPhone(value) {
  const phone = clean(value, 30);
  if (!phone) return '';
  if (!/^\+?[\d\s\-()]+$/.test(phone) || phone.replace(/\D/g, '').length < 6) {
    throw new Error('Phone number can only have digits, spaces, + - ( ), like +91 98765 43210.');
  }
  return phone;
}

function cleanYear(value) {
  if (value === '' || value === null || value === undefined) return null;
  const year = parseInt(value, 10);
  if (!Number.isInteger(year) || year < 1000 || year > new Date().getFullYear() + 1) {
    throw new Error('Years must be 4 digits, like 1950.');
  }
  return year;
}

// Validates editable person fields. Only fields present in `body` are returned, so it works for partial updates.
export function personFields(body, { requireName = false } = {}) {
  const out = {};
  if ('name' in body || requireName) {
    out.name = clean(body.name);
    if (!out.name) throw new Error('Name is required.');
  }
  if ('gender' in body) out.gender = GENDERS.includes(body.gender) ? body.gender : 'other';
  if ('isAlive' in body) out.isAlive = body.isAlive !== false;
  if ('birthYear' in body) out.birthYear = cleanYear(body.birthYear);
  if ('deathYear' in body) out.deathYear = cleanYear(body.deathYear);
  if ('occupation' in body) out.occupation = clean(body.occupation);
  if ('location' in body) out.location = clean(body.location);
  if ('phone' in body) out.phone = cleanPhone(body.phone);
  if ('phoneVisibility' in body) out.phoneVisibility = PHONE_VISIBILITY.includes(body.phoneVisibility) ? body.phoneVisibility : 'all';
  if ('socialMedia' in body) out.socialMedia = cleanLink(body.socialMedia);
  if ('notes' in body) out.notes = clean(body.notes, 1000);
  if ('photoUrl' in body) {
    const photoUrl = clean(body.photoUrl, 500);
    if (photoUrl && !isBlobUrl(photoUrl)) throw new Error('Invalid photo link.');
    out.photoUrl = photoUrl;
  }
  if (out.isAlive) out.deathYear = null;
  return out;
}
