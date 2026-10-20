'use client';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import PersonCard from '@/components/PersonCard';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.5;

const TreeView = forwardRef(function TreeView({ layout, onSelect, onDelete, canDelete = () => true }, treeRef) {
  const scrollRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  const fit = () => {
    const box = scrollRef.current;
    if (!box) return;
    const z = Math.min((box.clientWidth - 16) / layout.width, (box.clientHeight - 16) / layout.height, 1);
    setZoom(Math.max(MIN_ZOOM, z));
  };

  // Fit the whole tree on screen the first time it loads.
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && layout.nodes.length) {
      fitted.current = true;
      fit();
    }
  });

  const change = delta => setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2))));

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10 flex gap-1 bg-white/90 rounded-xl shadow border border-slate-100 p-1">
        <button aria-label="Zoom out" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => change(-0.1)}><ZoomOut size={16} /></button>
        <span className="px-1 self-center text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button aria-label="Zoom in" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => change(0.1)}><ZoomIn size={16} /></button>
        <button aria-label="Fit to screen" className="p-2 rounded-lg hover:bg-slate-100" onClick={fit}><Maximize size={16} /></button>
      </div>

      <div ref={scrollRef} className="overflow-auto h-[calc(100vh-150px)] min-h-[420px] bg-slate-50/60 rounded-3xl border border-slate-100">
        <div style={{ width: layout.width * zoom, height: layout.height * zoom }}>
          <div
            ref={treeRef}
            className="relative bg-white"
            style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})`, transformOrigin: '0 0' }}
          >
            <svg className="absolute inset-0" width={layout.width} height={layout.height}>
              {layout.lines.map((l, i) => (
                <line
                  key={i}
                  x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={l.kind === 'marriage' ? (l.dashed ? '#f43f5e' : '#94a3b8') : l.color || '#475569'}
                  strokeWidth={l.kind === 'child' ? 3 : 2}
                  strokeLinecap="round"
                  strokeDasharray={l.dashed ? '6 5' : undefined}
                />
              ))}
              {layout.markers.map(m => (
                <g key={m.key}>
                  <circle cx={m.x} cy={m.y} r={10} fill="#fff" stroke={m.status === 'married' ? '#f43f5e' : '#94a3b8'} strokeWidth={1.5} />
                  <text x={m.x} y={m.y + 4} textAnchor="middle" fontSize="11" fill={m.status === 'married' ? '#f43f5e' : '#64748b'}>
                    {m.status === 'married' ? '♥' : '✕'}
                  </text>
                </g>
              ))}
            </svg>
            {layout.nodes.map(n => (
              <PersonCard key={n.key} person={n.person} x={n.x} y={n.y} duplicate={n.duplicate} color={n.color} parentLabel={n.parentLabel} onClick={() => onSelect(n.person.id)} onDelete={onDelete && canDelete(n.person) ? () => onDelete(n.person) : undefined} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TreeView;
