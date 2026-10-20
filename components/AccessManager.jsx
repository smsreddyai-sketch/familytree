'use client';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { api } from '@/lib/client';

const ROLE_HELP = {
  viewer: 'Viewer – can see the tree and download the PDF',
  editor: 'Editor – can also add, edit, delete people and photos',
  admin: 'Admin – can also manage who has access',
};

export default function AccessManager({ me, onClose }) {
  const [users, setUsers] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => api('/api/users').then(setUsers).catch(err => setError(err.message));
  useEffect(() => { load(); }, []);

  const run = async fn => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const add = e => {
    e.preventDefault();
    run(async () => {
      await api('/api/users', { method: 'POST', body: JSON.stringify({ email, role }) });
      setEmail('');
    });
  };

  const input = 'p-2.5 border rounded-xl text-sm';

  return (
    <Modal title="Who can open the family tree" onClose={onClose} wide>
      <form onSubmit={add} className="flex flex-col sm:flex-row gap-2">
        <input type="email" required placeholder="relative@email.com" className={`${input} flex-1`} value={email} onChange={e => setEmail(e.target.value)} />
        <select className={`${input} bg-white`} value={role} onChange={e => setRole(e.target.value)}>
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <button disabled={busy} className="bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-slate-800 disabled:bg-slate-400">Add</button>
      </form>
      <ul className="text-xs text-slate-500 mt-2 space-y-0.5">
        {Object.values(ROLE_HELP).map(h => <li key={h}>{h}</li>)}
      </ul>

      {error && <p className="mt-3 text-sm rounded-xl px-3 py-2 bg-rose-50 text-rose-700">{error}</p>}

      <div className="mt-5 divide-y divide-slate-100">
        {!users ? (
          <p className="text-sm text-slate-400 py-2">Loading…</p>
        ) : users.map(u => (
          <div key={u.email} className="flex items-center gap-2 py-2">
            <span className="flex-1 text-sm text-slate-700 truncate">{u.email}{u.email === me.email && <span className="text-slate-400"> (you)</span>}</span>
            {u.owner ? (
              <span className="text-xs text-slate-500 px-2">Owner (admin)</span>
            ) : (
              <>
                <select disabled={busy} className="p-1.5 border rounded-lg text-xs bg-white" value={u.role} onChange={e => run(() => api('/api/users', { method: 'POST', body: JSON.stringify({ email: u.email, role: e.target.value }) }))}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button aria-label={`Remove ${u.email}`} disabled={busy} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50" onClick={() => window.confirm(`Remove access for ${u.email}?`) && run(() => api(`/api/users?email=${encodeURIComponent(u.email)}`, { method: 'DELETE' }))}>
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
