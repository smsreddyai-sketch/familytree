'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Download, LogOut, Shield, UserPlus } from 'lucide-react';
import TreeView from '@/components/TreeView';
import PersonDialog from '@/components/PersonDialog';
import PersonForm from '@/components/PersonForm';
import SummaryPanel from '@/components/SummaryPanel';
import AccessManager from '@/components/AccessManager';
import { api } from '@/lib/client';
import { buildLayout } from '@/lib/treeLayout';
import { buildSummary } from '@/lib/summary';

export default function TreeApp({ me, onLoggedOut }) {
  const [tree, setTree] = useState(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [panel, setPanel] = useState(null);
  const [exporting, setExporting] = useState(false);
  const treeRef = useRef(null);

  const canEdit = me.role === 'editor' || me.role === 'admin';

  const load = useCallback(async () => {
    try {
      setTree(await api('/api/tree'));
      setError('');
    } catch (err) {
      if (err.status === 401) return onLoggedOut();
      setError(err.message);
    }
  }, [onLoggedOut]);

  useEffect(() => { load(); }, [load]);

  const layout = useMemo(() => (tree ? buildLayout(tree.people, tree.unions) : null), [tree]);
  const summary = useMemo(() => (tree && layout ? buildSummary(tree.people, layout) : null), [tree, layout]);
  const selected = tree?.people.find(p => p.id === selectedId);

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    onLoggedOut();
  };

  const downloadPdf = async () => {
    setExporting(true);
    try {
      const { exportTreePdf } = await import('@/lib/exportPdf');
      await exportTreePdf(treeRef.current, { width: layout.width, height: layout.height, summary });
    } catch (err) {
      alert(`Could not create the PDF: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const btn = 'flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50';

  return (
    <main className="max-w-[1600px] mx-auto p-3 md:p-5 space-y-3">
      <header className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Our Family Tree</h1>
          <p className="text-xs text-slate-500">{me.email} · {me.role}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button className={btn} onClick={() => setForm({ title: 'Add person', relation: { type: 'root' } })}>
              <UserPlus size={15} /> Add person
            </button>
          )}
          <button className={btn} disabled={!summary} onClick={() => setPanel('summary')}><BarChart3 size={15} /> Summary</button>
          <button className={btn} disabled={!layout?.nodes.length || exporting} onClick={downloadPdf}>
            <Download size={15} /> {exporting ? 'Creating PDF…' : 'Download PDF'}
          </button>
          {me.role === 'admin' && <button className={btn} onClick={() => setPanel('access')}><Shield size={15} /> Access</button>}
          <button className={btn} onClick={logout}><LogOut size={15} /> Log out</button>
        </div>
      </header>

      {error && <p className="text-sm rounded-xl px-3 py-2 bg-rose-50 text-rose-700">{error}</p>}

      {!tree ? (
        !error && <p className="text-center py-20 text-sm text-slate-400">Loading family tree…</p>
      ) : tree.people.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <p className="text-slate-500">No one has been added yet.</p>
          {canEdit && (
            <button className="bg-slate-900 text-white font-medium px-5 py-3 rounded-xl hover:bg-slate-800" onClick={() => setForm({ title: 'Add the oldest ancestor', relation: { type: 'root' } })}>
              Add the oldest ancestor
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500">Click a person to see details{canEdit ? ', add family or edit' : ''}. ♥ married · ✕ divorced / separated</p>
          <TreeView ref={treeRef} layout={layout} onSelect={setSelectedId} />
        </>
      )}

      {selected && !form && (
        <PersonDialog
          person={selected}
          tree={tree}
          canEdit={canEdit}
          onSelect={setSelectedId}
          onOpenForm={setForm}
          onChanged={load}
          onClose={() => setSelectedId(null)}
        />
      )}

      {form && (
        <PersonForm
          {...form}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(); }}
        />
      )}

      {panel === 'summary' && <SummaryPanel summary={summary} onClose={() => setPanel(null)} />}
      {panel === 'access' && <AccessManager me={me} onClose={() => setPanel(null)} />}
    </main>
  );
}
