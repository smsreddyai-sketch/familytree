'use client';
import { useCallback, useEffect, useState } from 'react';
import Login from '@/components/Login';
import TreeApp from '@/components/TreeApp';
import { api } from '@/lib/client';

export default function Home() {
  // undefined = still checking, null = logged out
  const [me, setMe] = useState(undefined);
  const [error, setError] = useState('');

  const checkLogin = useCallback(async () => {
    try {
      setMe(await api('/api/auth/me'));
      setError('');
    } catch (err) {
      if (err.status === 401) setMe(null);
      else setError(err.message);
    }
  }, []);

  useEffect(() => { checkLogin(); }, [checkLogin]);

  const loggedOut = useCallback(() => setMe(null), []);

  if (error) return <p className="m-8 text-sm rounded-xl px-3 py-2 bg-rose-50 text-rose-700">{error}</p>;
  if (me === undefined) return <p className="text-center py-24 text-sm text-slate-400">Loading…</p>;
  if (!me) return <Login onLoggedIn={checkLogin} />;
  return <TreeApp me={me} onLoggedOut={loggedOut} />;
}
