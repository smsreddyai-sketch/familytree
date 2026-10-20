'use client';
import Modal from '@/components/Modal';

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-3 text-center">
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Bar({ label, count, max, children }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-slate-500">{count}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 mt-1">
          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(4, (count / max) * 100)}%` }} />
        </div>
      </summary>
      <p className="text-xs text-slate-500 mt-1.5">{children}</p>
    </details>
  );
}

export default function SummaryPanel({ summary, onClose }) {
  const maxPlace = Math.max(1, ...summary.places.map(p => p.people.length));
  const maxCountry = Math.max(1, ...summary.countries.map(c => c.people.length));

  return (
    <Modal title="Family Summary" onClose={onClose} wide>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="People" value={summary.total} />
        <Stat label="Living" value={summary.living} />
        <Stat label="Late" value={summary.late} />
        <Stat label="Generations" value={summary.generations} />
      </div>

      <h3 className="mt-6 mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600">Where our relatives live now</h3>
      {summary.places.length === 0 ? (
        <p className="text-sm text-slate-400">No places entered yet. Add “Lives in” when editing a person.</p>
      ) : (
        <div className="space-y-3">
          {summary.places.map(p => (
            <Bar key={p.label} label={p.label} count={p.people.length} max={maxPlace}>
              {p.people.map(x => x.name).join(', ')}
            </Bar>
          ))}
        </div>
      )}
      {summary.unknownPlace > 0 && <p className="text-xs text-slate-400 mt-2">{summary.unknownPlace} living relative(s) have no place entered.</p>}

      {summary.countries.length > 1 && (
        <>
          <h3 className="mt-6 mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600">By country</h3>
          <div className="space-y-3">
            {summary.countries.map(c => (
              <Bar key={c.label} label={c.label} count={c.people.length} max={maxCountry}>
                {c.people.map(x => x.name).join(', ')}
              </Bar>
            ))}
          </div>
        </>
      )}

      <h3 className="mt-6 mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600">People per generation</h3>
      <table className="w-full text-sm">
        <tbody>
          {summary.byGeneration.map(g => (
            <tr key={g.generation} className="border-b border-slate-100">
              <td className="py-1.5 text-slate-700">Generation {g.generation}</td>
              <td className="py-1.5 text-right text-slate-500">{g.living} living · {g.late} late</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-3">Tip: write places as “City, State, Country” so the country totals work.</p>
    </Modal>
  );
}
