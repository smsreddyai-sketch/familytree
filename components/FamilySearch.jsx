'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';

const MAX_RESULTS = 8;

// Type a name, pick a match, and the tree shows only that person's family.
// `people` items: { id, name, gen, detail } where detail is e.g. "S/o Ramesh".
export default function FamilySearch({ people, onPick }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const q = query.trim().toLowerCase();
  const matches = q
    ? people
        .filter(p => p.name.toLowerCase().includes(q))
        // Names that start with the typed text first, then older generations first.
        .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)) || a.gen - b.gen || a.name.localeCompare(b.name))
        .slice(0, MAX_RESULTS)
    : [];

  const pick = p => {
    onPick(p.id);
    setQuery(p.name);
    setOpen(false);
  };

  const onKeyDown = e => {
    if (!matches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(matches[active] || matches[0]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative w-full sm:w-72">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="search"
        placeholder="Search a name…"
        aria-label="Search a name to show their family"
        className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm bg-white"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {open && q && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">No one named “{query.trim()}”</li>
          ) : matches.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm ${i === active ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                onMouseDown={e => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(p)}
              >
                <span className="font-medium text-slate-800">{p.name}</span>
                <span className="text-xs text-slate-500"> · Gen {p.gen}{p.detail ? ` · ${p.detail}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
