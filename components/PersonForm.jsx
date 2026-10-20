'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { api, photoSrc, uploadPhoto } from '@/lib/client';

const FIELDS = ['name', 'gender', 'isAlive', 'birthYear', 'deathYear', 'occupation', 'location', 'socialMedia', 'notes'];

function initialValues(person, defaults) {
  const base = { name: '', gender: 'male', isAlive: true, birthYear: '', deathYear: '', occupation: '', location: '', socialMedia: '', notes: '', ...defaults };
  if (!person) return base;
  const values = { ...base };
  for (const f of FIELDS) values[f] = person[f] ?? base[f];
  values.birthYear = person.birthYear ?? '';
  values.deathYear = person.deathYear ?? '';
  return values;
}

// Add or edit one person. For a new person, `relation` says where they attach in the tree.
export default function PersonForm({ title, person, relation, defaults, unionOptions, onSaved, onClose }) {
  const [values, setValues] = useState(() => initialValues(person, defaults));
  const [unionId, setUnionId] = useState(unionOptions?.[0]?.value ?? '');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const set = (field, value) => setValues(v => ({ ...v, [field]: value }));

  const pickFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setRemovePhoto(false);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = {};
      for (const f of FIELDS) body[f] = values[f];
      if (file) body.photoUrl = await uploadPhoto(file);
      else if (removePhoto) body.photoUrl = '';

      if (person) {
        await api(`/api/people/${person.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        const rel = relation.type === 'child' ? { ...relation, unionId: unionId || undefined } : relation;
        await api('/api/people', { method: 'POST', body: JSON.stringify({ ...body, relation: rel }) });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const currentPhoto = previewUrl || (!removePhoto && person?.photoUrl ? photoSrc(person.photoUrl) : '');
  const input = 'p-2.5 border rounded-xl text-sm w-full';

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {unionOptions && unionOptions.length > 1 && (
          <label className="block text-xs font-semibold text-slate-500">
            Other parent
            <select className={`${input} mt-1 bg-white font-normal text-slate-800`} value={unionId} onChange={e => setUnionId(e.target.value)}>
              {unionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        )}

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border shrink-0 flex items-center justify-center text-xs text-slate-400">
            {currentPhoto ? <img src={currentPhoto} alt="" className="w-full h-full object-cover" /> : 'No photo'}
          </div>
          <div className="space-y-1.5">
            <input type="file" accept="image/*" onChange={pickFile} className="text-xs text-slate-600 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 cursor-pointer" />
            {(currentPhoto || person?.photoUrl) && !removePhoto && (
              <button type="button" className="block text-xs text-rose-600 hover:underline" onClick={() => { setFile(null); setPreviewUrl(''); setRemovePhoto(true); }}>
                Remove photo
              </button>
            )}
          </div>
        </div>

        <input required maxLength={100} placeholder="Full name *" className={input} value={values.name} onChange={e => set('name', e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <select className={`${input} bg-white`} value={values.gender} onChange={e => set('gender', e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <select className={`${input} bg-white`} value={values.isAlive ? 'yes' : 'no'} onChange={e => set('isAlive', e.target.value === 'yes')}>
            <option value="yes">Living</option>
            <option value="no">Passed away (Late)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input inputMode="numeric" maxLength={4} placeholder="Birth year" className={input} value={values.birthYear} onChange={e => set('birthYear', e.target.value.replace(/\D/g, ''))} />
          {!values.isAlive && (
            <input inputMode="numeric" maxLength={4} placeholder="Year passed" className={input} value={values.deathYear} onChange={e => set('deathYear', e.target.value.replace(/\D/g, ''))} />
          )}
        </div>

        <input maxLength={100} placeholder="Occupation / Job" className={input} value={values.occupation} onChange={e => set('occupation', e.target.value)} />
        <input maxLength={100} placeholder="Lives in (City, State, Country)" className={input} value={values.location} onChange={e => set('location', e.target.value)} />
        <input type="url" placeholder="Social profile link (https://...)" className={input} value={values.socialMedia} onChange={e => set('socialMedia', e.target.value)} />
        <textarea maxLength={1000} rows={2} placeholder="Notes" className={input} value={values.notes} onChange={e => set('notes', e.target.value)} />

        {error && <p className="text-sm rounded-xl px-3 py-2 bg-rose-50 text-rose-700">{error}</p>}

        <button disabled={busy} className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 disabled:bg-slate-400">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </form>
    </Modal>
  );
}
