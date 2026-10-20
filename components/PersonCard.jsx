'use client';
import { useState } from 'react';
import { MapPin, Trash2 } from 'lucide-react';
import { CARD_H, CARD_W } from '@/lib/treeLayout';
import { photoSrc, yearsText } from '@/lib/client';

const BORDER = { male: 'border-sky-500', female: 'border-pink-500', other: 'border-slate-400' };

function Avatar({ person }) {
  const [failed, setFailed] = useState(false);
  const late = person.isAlive === false;
  if (person.photoUrl && !failed) {
    return (
      <img src={photoSrc(person.photoUrl)} alt={person.name} className={`w-full h-full object-cover ${late ? 'grayscale' : ''}`} onError={() => setFailed(true)} />
    );
  }
  const initials = (person.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  return <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold text-2xl">{initials}</div>;
}

export default function PersonCard({ person, x, y, duplicate, color, parentLabel, onClick, onDelete }) {
  const late = person.isAlive === false;
  const years = yearsText(person);

  return (
    <div className="absolute" style={{ left: x, top: y, width: CARD_W, height: CARD_H }}>
      <button
        type="button"
        onClick={onClick}
        style={color ? { borderTop: `5px solid ${color}` } : undefined}
        className={`w-full h-full flex flex-col items-center text-center px-2 pt-3 pb-2 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition ${late ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'}`}
      >
        <div className={`w-[92px] h-[92px] shrink-0 rounded-full overflow-hidden border-4 ${BORDER[person.gender] || BORDER.other}`}>
          <Avatar person={person} />
        </div>
        <p className="mt-2 font-bold text-slate-800 text-sm leading-tight line-clamp-2">{person.name}</p>
        {parentLabel && (
          <p className="text-[11px] font-medium mt-0.5 truncate max-w-full" style={{ color: color || '#475569' }}>{parentLabel}</p>
        )}
        <p className="text-[11px] text-slate-500 mt-0.5 h-4">
          {late && <span className="font-semibold text-slate-600">Late </span>}
          {years}
        </p>
        {person.location && (
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-0.5 max-w-full">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{person.location}</span>
          </p>
        )}
        {duplicate && <p className="text-[10px] text-amber-600 mt-auto">also shown elsewhere</p>}
      </button>
      {onDelete && (
        <button
          type="button"
          data-export-ignore
          aria-label={`Delete ${person.name}`}
          title={`Delete ${person.name}`}
          onClick={onDelete}
          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/90 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 shadow-sm"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
