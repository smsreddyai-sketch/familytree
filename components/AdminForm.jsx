'use client';
import { useEffect, useState } from 'react';

const EMPTY_FORM = { name: '', spouseName: '', generation: '1', occupation: '', location: '', socialMedia: '' };
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

async function readError(res, fallback) {
  try {
    const data = await res.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminForm({ onMemberAdded }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [password, setPassword] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    try { setPassword(localStorage.getItem('familyPassword') || ''); } catch {}
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setMessage({ type: 'error', text: 'Name is required.' });
    if (!password) return setMessage({ type: 'error', text: 'Enter the family password.' });
    setLoading(true);
    setMessage(null);

    const authHeader = { 'x-admin-password': encodeURIComponent(password) };

    try {
      let imageUrl = '';
      if (file) {
        const photo = await shrinkPhoto(file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'image/jpeg' },
          body: photo,
        });
        if (!uploadRes.ok) throw new Error(await readError(uploadRes, 'Photo upload failed.'));
        imageUrl = (await uploadRes.json()).url;
      }

      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, imageUrl }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not save family member.'));

      try { localStorage.setItem('familyPassword', password); } catch {}
      setFormData(EMPTY_FORM);
      setFile(null);
      setPreviewUrl('');
      setFileInputKey(k => k + 1);
      onMemberAdded();
      setMessage({ type: 'success', text: 'Family member saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error saving data.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm max-w-xl mx-auto space-y-4">
      <h3 className="text-lg font-bold text-slate-800 border-b pb-2">➕ Add New Family Member</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Full Name *" maxLength={100} className="p-2.5 border rounded-xl text-sm w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        <input type="text" placeholder="Spouse / Husband Name" maxLength={100} className="p-2.5 border rounded-xl text-sm w-full" value={formData.spouseName} onChange={e => setFormData({...formData, spouseName: e.target.value})} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select className="p-2.5 border rounded-xl text-sm bg-white w-full" value={formData.generation} onChange={e => setFormData({...formData, generation: e.target.value})}>
          <option value="1">1st Gen: Grandparents</option>
          <option value="2">2nd Gen: Sons / Daughters / Spouses</option>
          <option value="3">3rd Gen: Me & Cousins</option>
          <option value="4">4th Gen: My Kids & Their Cousins</option>
          <option value="5">5th Gen: Grandchildren & Their Cousins</option>
        </select>
        <input type="text" placeholder="Occupation / Job" maxLength={100} className="p-2.5 border rounded-xl text-sm w-full" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Current Location" maxLength={100} className="p-2.5 border rounded-xl text-sm w-full" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
        <input type="url" placeholder="Social Profile Link (https://...)" className="p-2.5 border rounded-xl text-sm w-full" value={formData.socialMedia} onChange={e => setFormData({...formData, socialMedia: e.target.value})} />
      </div>

      <div className="flex items-center gap-4 border border-dashed rounded-xl p-3 bg-slate-50">
        <input key={fileInputKey} type="file" accept="image/*" className="text-xs text-slate-600 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 cursor-pointer" onChange={handleFileChange} />
        {previewUrl && <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border" />}
      </div>

      <input type="password" placeholder="Family Password *" autoComplete="current-password" className="p-2.5 border rounded-xl text-sm w-full" value={password} onChange={e => setPassword(e.target.value)} />

      {message && (
        <p className={`text-sm rounded-xl px-3 py-2 ${message.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message.text}
        </p>
      )}

      <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 disabled:bg-slate-400">
        {loading ? 'Processing Uploads...' : 'Save Family Member to Tree'}
      </button>
    </form>
  );
}
