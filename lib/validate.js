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
