'use client';
import { useState } from 'react';
import { Briefcase, MapPin, Pencil, Phone, Share2, Trash2, UserPlus, Users } from 'lucide-react';
import Modal from '@/components/Modal';
import { api, photoSrc, yearsText } from '@/lib/client';

const STATUS_LABEL = { married: 'Married', divorced: 'Divorced', separated: 'Separated' };
const PHONE_PRIVACY = { family: '👪 family only', admins: '🔒 admins only' };

function NameLink({ person, onSelect }) {
  return (
    <button className="text-indigo-600 hover:underline" onClick={() => onSelect(person.id)}>{person.name}</button>
  );
}

// Details of one person plus the edit actions (for editors).
export default function PersonDialog({ person, tree, canEdit, canDelete = canEdit, canAddParent = canEdit, onSelect, onOpenForm, onChanged, onClose, onShowFamily }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const byId = new Map(tree.people.map(p => [p.id, p]));

  const parentUnion = tree.unions.find(u => u.id === person.parentUnionId);
  const parents = (parentUnion?.partnerIds || []).map(id => byId.get(id)).filter(Boolean);
  const myUnions = tree.unions.filter(u => u.partnerIds.includes(person.id));
  const marriages = myUnions
    .map(u => ({ union: u, spouse: byId.get(u.partnerIds.find(id => id !== person.id)) }))
    .filter(m => m.spouse);
  const children = tree.people.filter(p => myUnions.some(u => u.id === p.parentUnionId));

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (union, status) =>
    run(() => api(`/api/unions/${union.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }));

  const remove = () => {
    const warn = children.length ? `\n\n${children.length} child(ren) will stay in the tree, linked to the other parent.` : '';
    if (!window.confirm(`Delete ${person.name} and their photo from the tree?${warn}\n\nThis cannot be undone.`)) return;
    run(async () => {
      await api(`/api/people/${person.id}`, { method: 'DELETE' });
      onClose();
    });
  };

  const opposite = person.gender === 'male' ? 'female' : person.gender === 'female' ? 'male' : 'other';
  const spouseLabel = person.gender === 'male' ? 'Add wife' : person.gender === 'female' ? 'Add husband' : 'Add spouse';

  const addChild = () => {
    const options = myUnions.map(u => {
      const spouse = byId.get(u.partnerIds.find(id => id !== person.id));
      return { value: u.id, label: spouse ? `with ${spouse.name}` : 'Other parent not in tree' };
    });
    if (!options.some(o => o.label === 'Other parent not in tree')) options.push({ value: '', label: 'Other parent not in tree' });
    onOpenForm({ title: `Add child of ${person.name}`, relation: { type: 'child', parentId: person.id }, unionOptions: options });
  };

  const late = person.isAlive === false;
  const action = 'flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border hover:bg-slate-50 disabled:opacity-50';

  return (
    <Modal title={person.name} onClose={onClose}>
      <div className="text-center">
        <div className="w-28 h-28 rounded-full mx-auto overflow-hidden border-4 border-indigo-50 bg-slate-50 flex items-center justify-center text-3xl font-bold text-indigo-700">
          {person.photoUrl
            ? <img src={photoSrc(person.photoUrl)} alt={person.name} className={`w-full h-full object-cover ${late ? 'grayscale' : ''}`} />
            : (person.name || '?').slice(0, 1).toUpperCase()}
        </div>
        <p className="text-sm text-slate-500 mt-2">
          {late && <span className="font-semibold text-slate-700">Late · </span>}
          {yearsText(person) || (late ? '' : 'Living')}
        </p>
      </div>

      <div className="mt-5 space-y-3 text-sm text-slate-700">
        {person.occupation && <p className="flex items-center gap-2"><Briefcase size={15} className="text-indigo-500" /> {person.occupation}</p>}
        {person.location && <p className="flex items-center gap-2"><MapPin size={15} className="text-emerald-500" /> {person.location}</p>}
        {person.phone && (
          <p className="flex items-center gap-2"><Phone size={15} className="text-violet-500" />
            <a href={`tel:${person.phone.replace(/[^\d+]/g, '')}`} className="text-violet-600 hover:underline">{person.phone}</a>
            {/* wa.me needs the country code, so only offer it for numbers written as +<country> ... */}
            {person.phone.trim().startsWith('+') && (
              <a href={`https://wa.me/${person.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline">WhatsApp</a>
            )}
            {PHONE_PRIVACY[person.phoneVisibility] && <span className="text-[11px] text-slate-400">{PHONE_PRIVACY[person.phoneVisibility]}</span>}
          </p>
        )}
        {person.phoneHidden && (
          <p className="flex items-center gap-2 text-slate-400"><Phone size={15} /> ••••• ••••• <span className="text-xs">🔒 private</span></p>
        )}
        {/^https?:\/\//i.test(person.socialMedia || '') && (
          <p className="flex items-center gap-2"><Share2 size={15} className="text-sky-500" />
            <a href={person.socialMedia} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">Open profile</a>
          </p>
        )}
        {person.notes && <p className="text-slate-500 whitespace-pre-wrap">{person.notes}</p>}

        <div className="border-t border-slate-100 pt-3 space-y-2">
          {parents.length > 0 && (
            <p><span className="text-slate-400">Parents: </span>
              {parents.map((p, i) => <span key={p.id}>{i > 0 && ' & '}<NameLink person={p} onSelect={onSelect} /></span>)}
            </p>
          )}
          {marriages.map(({ union, spouse }) => (
            <div key={union.id} className="flex items-center justify-between gap-2">
              <p>
                <span className="text-slate-400">{STATUS_LABEL[union.status] || 'Married'} to </span>
                <NameLink person={spouse} onSelect={onSelect} />
              </p>
              {canEdit && (
                <button disabled={busy} className="text-xs text-slate-500 hover:text-rose-600 hover:underline shrink-0" onClick={() => setStatus(union, union.status === 'married' ? 'divorced' : 'married')}>
                  {union.status === 'married' ? 'Mark divorced' : 'Mark married'}
                </button>
              )}
            </div>
          ))}
          {children.length > 0 && (
            <p><span className="text-slate-400">Children: </span>
              {children.map((c, i) => <span key={c.id}>{i > 0 && ', '}<NameLink person={c} onSelect={onSelect} /></span>)}
            </p>
          )}
        </div>
      </div>

      {onShowFamily && children.length > 0 && (
        <button className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100" onClick={onShowFamily}>
          <Users size={14} /> Show only {person.name}’s family
        </button>
      )}

      {error && <p className="mt-4 text-sm rounded-xl px-3 py-2 bg-rose-50 text-rose-700">{error}</p>}

      {canEdit && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className={action} onClick={() => onOpenForm({ title: `Edit ${person.name}`, person })}><Pencil size={14} /> Edit / photo</button>
          <button className={action} onClick={() => onOpenForm({ title: `${spouseLabel} for ${person.name}`, relation: { type: 'spouse', personId: person.id }, defaults: { gender: opposite } })}><UserPlus size={14} /> {spouseLabel}</button>
          <button className={action} onClick={addChild}><UserPlus size={14} /> Add son / daughter</button>
          {canAddParent && parents.length < 2 && (
            <button className={action} onClick={() => onOpenForm({ title: `Add parent of ${person.name}`, relation: { type: 'parent', childId: person.id }, defaults: parents[0] ? { gender: parents[0].gender === 'male' ? 'female' : 'male' } : {} })}><UserPlus size={14} /> Add father / mother</button>
          )}
          {canDelete && <button disabled={busy} className={`${action} col-span-2 text-rose-600 border-rose-200 hover:bg-rose-50`} onClick={remove}><Trash2 size={14} /> Delete {person.name}</button>}
        </div>
      )}
    </Modal>
  );
}
