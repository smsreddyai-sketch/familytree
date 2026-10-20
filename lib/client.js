// Browser-side helpers shared by the components.

export async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (typeof options.body === 'string') headers['Content-Type'] = 'application/json';
  const res = await fetch(path, { cache: 'no-store', ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const photoSrc = url => (url ? `/api/photo?src=${encodeURIComponent(url)}` : '');

const MAX_PHOTO_SIDE = 800;

// Phone photos are often 3-10 MB, over Vercel's 4.5 MB upload limit, so shrink to a small JPEG first.
async function shrinkPhoto(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This photo format is not supported here. Please choose a JPG or PNG photo.');
  }
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not process photo.'))), 'image/jpeg', 0.85)
  );
}

export async function uploadPhoto(file) {
  const photo = await shrinkPhoto(file);
  const { url } = await api('/api/upload', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: photo });
  return url;
}

export const yearsText = p => {
  if (p.isAlive === false) {
    if (p.birthYear || p.deathYear) return `${p.birthYear || '?'} – ${p.deathYear || '?'}`;
    return '';
  }
  return p.birthYear ? `b. ${p.birthYear}` : '';
};
