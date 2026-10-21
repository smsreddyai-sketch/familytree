'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Download, LogOut, Plus, Shield, Trees, UserPlus, Users } from 'lucide-react';
import TreeView from '@/components/TreeView';
import PersonDialog from '@/components/PersonDialog';
import PersonForm from '@/components/PersonForm';
import SummaryPanel from '@/components/SummaryPanel';
import AccessManager from '@/components/AccessManager';
import NewTreeDialog from '@/components/NewTreeDialog';
import FamilySearch from '@/components/FamilySearch';
import { api, setCurrentTree } from '@/lib/client';
import { buildLayout } from '@/lib/treeLayout';
import { branchMembers } from '@/lib/branch';
import { buildSummary } from '@/lib/summary';

const LAST_TREE_KEY = 'ft:last-tree';

function rememberedTree() {
  try {
    return localStorage.getItem(LAST_TREE_KEY);
  } catch {
    return null;
  }
}

export default function TreeApp({ me, onLoggedOut, onTreesChanged }) {
  const [treeId, setTreeId] = useState(() => {
    const last = rememberedTree();
    return me.trees.some(t => t.id === last) ? last : me.trees[0]?.id;
  });
  const [tree, setTree] = useState(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [panel, setPanel] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [focusId, setFocusId] = useState(null); // show only this person's family
  const treeRef = useRef(null);

  // If the current tree was deleted or access to it was removed, fall back to the first one left.
  const current = me.trees.find(t => t.id === treeId) || me.trees[0];
  const role = current?.role;
  const canEdit = role === 'editor' || role === 'admin';

  const activeTree = useRef(null);
  const load = useCallback(async () => {
    const id = activeTree.current;
    try {
      const data = await api('/api/tree');
      if (id !== activeTree.current) return; // switched trees while loading
      setTree(data);
      setError('');
    } catch (err) {
      if (err.status === 401) return onLoggedOut();
      setError(err.message);
    }
  }, [onLoggedOut]);

  useEffect(() => {
    if (!current) return;
    activeTree.current = current.id;
    setCurrentTree(current.id);
    try {
      localStorage.setItem(LAST_TREE_KEY, current.id);
    } catch {}
    setTree(null);
    setSelectedId(null);
    setForm(null);
    setFocusId(null);
    load();
  }, [current?.id, load]);

  const switchTree = id => {
    setPanel(null);
    setTreeId(id);
  };

  // The whole tree drives the summary; the view may be narrowed to one family.
  const fullLayout = useMemo(() => (tree ? buildLayout(tree.people, tree.unions) : null), [tree]);
  const focusPerson = tree?.people.find(p => p.id === focusId);
  const layout = useMemo(
    () => (focusPerson ? buildLayout(tree.people, tree.unions, { focusId: focusPerson.id, genOffset: fullLayout.depthOf.get(focusPerson.id) || 0 }) : fullLayout),
    [focusPerson, tree, fullLayout]
  );
  const summary = useMemo(() => (tree && fullLayout ? buildSummary(tree.people, fullLayout) : null), [tree, fullLayout]);
  // People worth focusing on: anyone with children, oldest generation first.
  const familyHeads = useMemo(() => {
    if (!tree) return [];
    const parentIds = new Set(tree.unions.filter(u => tree.people.some(p => p.parentUnionId === u.id)).flatMap(u => u.partnerIds));
    return tree.people
      .filter(p => parentIds.has(p.id) && fullLayout.depthOf.has(p.id))
      .sort((a, b) => fullLayout.depthOf.get(a.id) - fullLayout.depthOf.get(b.id) || a.name.localeCompare(b.name));
  }, [tree, fullLayout]);
  // Everyone in the tree, for the name search ("S/o Ramesh" tells two people with the same name apart).
  const searchable = useMemo(() => {
    if (!fullLayout) return [];
    const seen = new Set();
    return fullLayout.nodes
      .filter(n => !seen.has(n.person.id) && seen.add(n.person.id))
      .map(n => ({ id: n.person.id, name: n.person.name, gen: (fullLayout.depthOf.get(n.person.id) || 0) + 1, detail: n.parentLabel }));
  }, [fullLayout]);
  const showFamily = id => {
    setSelectedId(null);
    setFocusId(id || null);
  };
  const selected = tree?.people.find(p => p.id === selectedId);

  // Family editors may only change their own branch; the server enforces the same rule.
  const branchId = role === 'branch' ? current?.branchId : null;
  const branch = useMemo(() => (branchId && tree ? branchMembers(tree.people, tree.unions, branchId) : null), [branchId, tree]);
  const branchName = tree?.people.find(p => p.id === branchId)?.name;
  const mayEdit = p => canEdit || !!branch?.has(p.id);
  const mayDelete = p => canEdit || (!!branch?.has(p.id) && p.id !== branchId);

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    onLoggedOut();
  };

  const deletePerson = async (person) => {
    const myUnionIds = tree.unions.filter(u => u.partnerIds.includes(person.id)).map(u => u.id);
    const childCount = tree.people.filter(p => myUnionIds.includes(p.parentUnionId)).length;
    const warn = childCount ? `\n\n${childCount} child(ren) will stay in the tree, linked to the other parent.` : '';
    if (!window.confirm(`Delete ${person.name} and their photo from the tree?${warn}\n\nThis cannot be undone.`)) return;
    try {
      await api(`/api/people/${person.id}`, { method: 'DELETE' });
      if (selectedId === person.id) setSelectedId(null);
      load();
    } catch (err) {
      alert(`Could not delete ${person.name}: ${err.message}`);
    }
  };

  const downloadPdf = async () => {
    setExporting(true);
    try {
      const { exportTreePdf } = await import('@/lib/exportPdf');
      const title = focusPerson ? `${current.name} – ${focusPerson.name}’s family` : current.name;
      await exportTreePdf(treeRef.current, { width: layout.width, height: layout.height, summary, title });
    } catch (err) {
      alert(`Could not create the PDF: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const btn = 'flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50';

  if (!current) {
    return (
      <main className="max-w-md mx-auto p-6 text-center space-y-3">
        <p className="text-slate-500">You no longer have access to any family tree.</p>
        <button className={`${btn} mx-auto`} onClick={logout}><LogOut size={15} /> Log out</button>
      </main>
    );
  }

  return (
    <main className="max-w-[1600px] mx-auto p-3 md:p-5 space-y-3">
      <header className="flex flex-wrap items-center gap-2 justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900 truncate">{current.name}</h1>
          <p className="text-xs text-slate-500">
            {me.email} · {me.isOwner ? 'site owner' : role === 'branch' ? `family editor${branchName ? ` – ${branchName}’s family` : ''}` : role}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {me.trees.length > 1 && (
            <label className={`${btn} pr-1`}>
              <Trees size={15} />
              <span className="sr-only">Family tree</span>
              <select className="bg-transparent outline-none max-w-[180px]" value={current.id} onChange={e => switchTree(e.target.value)}>
                {me.trees.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          )}
          {me.isOwner && <button className={btn} onClick={() => setPanel('new-tree')}><Plus size={15} /> New family tree</button>}
          {canEdit && (
            <button className={btn} onClick={() => setForm({ title: 'Add person', relation: { type: 'root' } })}>
              <UserPlus size={15} /> Add person
            </button>
          )}
          <button className={btn} disabled={!summary} onClick={() => setPanel('summary')}><BarChart3 size={15} /> Summary</button>
          <button className={btn} disabled={!layout?.nodes.length || exporting} onClick={downloadPdf}>
            <Download size={15} /> {exporting ? 'Creating PDF…' : 'Download PDF'}
          </button>
          {role === 'admin' && <button className={btn} onClick={() => setPanel('access')}><Shield size={15} /> Access &amp; settings</button>}
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
          <p className="text-xs text-slate-500">
            Click a person to see details{canEdit ? ', add family or edit (🗑 on a card deletes that person)' : ''}.
            {branch && (branchName
              ? ` You can add and edit people in ${branchName}’s family (cards with 🗑, plus ${branchName}).`
              : ' Your family branch is not set – ask the tree admin.')}
            {' '}♥ married · ✕ divorced / separated
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <FamilySearch key={focusPerson ? 'focused' : 'all'} people={searchable} onPick={showFamily} />
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Users size={16} className="text-indigo-500" /> Show:
              <select className="p-2 border rounded-xl text-sm bg-white max-w-[260px]" value={focusPerson?.id || ''} onChange={e => showFamily(e.target.value)}>
                <option value="">Whole tree (all families)</option>
                {focusPerson && !familyHeads.some(p => p.id === focusPerson.id) && (
                  <option value={focusPerson.id}>{focusPerson.name}</option>
                )}
                {familyHeads.map(p => (
                  <option key={p.id} value={p.id}>Gen {fullLayout.depthOf.get(p.id) + 1} · {p.name}’s family</option>
                ))}
              </select>
            </label>
            {focusPerson && (
              <button className="text-sm font-medium px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100" onClick={() => showFamily(null)}>
                ✕ Show whole tree
              </button>
            )}
          </div>
          <TreeView key={focusPerson?.id || 'all'} ref={treeRef} layout={layout} onSelect={setSelectedId} onDelete={deletePerson} canDelete={mayDelete} />
        </>
      )}

      {selected && !form && (
        <PersonDialog
          person={selected}
          tree={tree}
          canEdit={mayEdit(selected)}
          canDelete={mayDelete(selected)}
          canAddParent={canEdit || (mayEdit(selected) && selected.id !== branchId)}
          onSelect={setSelectedId}
          onOpenForm={setForm}
          onChanged={load}
          onClose={() => setSelectedId(null)}
          onShowFamily={selected.id === focusPerson?.id ? undefined : () => showFamily(selected.id)}
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
      {panel === 'access' && (
        <AccessManager
          me={me}
          tree={current}
          people={tree?.people || []}
          onTreeChanged={onTreesChanged}
          onTreeDeleted={async () => { setPanel(null); await onTreesChanged(); }}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'new-tree' && (
        <NewTreeDialog
          onCreated={async t => { setPanel(null); await onTreesChanged(); switchTree(t.id); }}
          onClose={() => setPanel(null)}
        />
      )}
    </main>
  );
}
