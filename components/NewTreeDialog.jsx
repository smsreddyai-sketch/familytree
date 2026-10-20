'use client';
import { useState } from 'react';
import Modal from '@/components/Modal';
import { api } from '@/lib/client';

// Site owner only: starts a separate family tree, optionally run by another family's admin.
export default function NewTreeDialog({ onCreated, onClose }) {
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { tree } = await api('/api/trees', { method: 'POST', body: JSON.stringify({ name, adminEmail }) });
      await onCreated(tree);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const input = 'w-full p-2.5 border rounded-xl text-sm';

  return (
    <Modal title="New family tree" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Family name
          <input required autoFocus maxLength={80} placeholder="e.g. Reddy Family (Guntur)" className={`${input} mt-1`} value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Owner of this tree <span className="font-normal text-slate-400">(optional)</span>
          <input type="email" placeholder="their@email.com" className={`${input} mt-1`} value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
          <span className="block text-xs font-normal text-slate-500 mt-1">
            They become admin of this tree only: they can add people and choose who in their family can see or edit it.
            They cannot see your other trees. You stay admin of every tree.
          </span>
        </label>
        {error && <p className="text-sm rounded-xl px-3 py-2 bg-rose-50 text-rose-700">{error}</p>}
        <button disabled={busy} className="w-full bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-slate-800 disabled:bg-slate-400">
          {busy ? 'Creating…' : 'Create family tree'}
        </button>
      </form>
    </Modal>
  );
}
