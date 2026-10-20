'use client';
import { useEffect, useState } from 'react';
import FamilyMemberCard from '@/components/FamilyMemberCard';
import AdminForm from '@/components/AdminForm';

export default function Home() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/family', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load family members.');
      setMembers(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load family members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const gens = [
    { num: 1, title: "👴🏽 1st Gen: Grandparents Lineage" },
    { num: 2, title: "👨‍👩‍👧‍👦 2nd Gen: Their Sons, Daughters & Spouses" },
    { num: 3, title: "🧑🏽‍💻 3rd Gen: Me & First Cousins" },
    { num: 4, title: "👶🏽 4th Gen: My Children & Their Cousins" },
    { num: 5, title: "🍼 5th Gen: Grandchildren & Their Cousins" }
  ];

  return (
    <main className="min-h-screen max-w-7xl mx-auto p-4 md:p-8 space-y-12">
      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-900">Interactive Family Tree</h1>
        <p className="text-slate-500 text-sm mt-2">Dynamic 5-generation tree map. Select local photos, preview files instantly, and hover or click on portraits for deep social maps.</p>
      </header>

      <section className="space-y-10 bg-slate-50/50 p-4 md:p-8 rounded-3xl border border-slate-100">
        {loading ? (
          <div className="text-center py-12 text-sm text-slate-400 font-medium">Loading generation branches...</div>
        ) : error ? (
          <div className="text-center py-12 text-sm text-rose-600 font-medium">{error}</div>
        ) : (
          gens.map(g => {
            const genMembers = members.filter(m => m.generation === g.num);
            if (genMembers.length === 0 && g.num > 2) return null;
            return (
              <div key={g.num} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 whitespace-nowrap">{g.title}</h2>
                  <div className="h-px bg-indigo-100 w-full"></div>
                </div>
                <div className="flex flex-wrap justify-center gap-6 py-2">
                  {genMembers.length === 0 ? (
                    <p className="text-xs italic text-slate-400 py-1">No members added to this tier yet.</p>
                  ) : (
                    genMembers.map(member => <FamilyMemberCard key={member.id} member={member} />)
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="pt-6 border-t border-slate-200">
        <AdminForm onMemberAdded={fetchMembers} />
      </section>
    </main>
  );
}
