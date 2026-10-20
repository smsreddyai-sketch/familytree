'use client';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { api } from '@/lib/client';

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const requestCode = async e => {
    e?.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api('/api/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) });
      setStep('code');
      setMessage({ type: 'info', text: `We emailed a 6-digit code to ${email}. Check your inbox (and spam folder).` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const verify = async e => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ email, code }) });
      onLoggedIn();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Mail size={22} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-3">Family Tree</h1>
          <p className="text-sm text-slate-500 mt-1">Private to our family. Log in with your email.</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={requestCode} className="space-y-3">
            <input type="email" required autoFocus placeholder="your@email.com" className="p-3 border rounded-xl text-sm w-full" value={email} onChange={e => setEmail(e.target.value)} />
            <button disabled={busy} className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 disabled:bg-slate-400">
              {busy ? 'Sending code…' : 'Send login code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <input inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={6} placeholder="6-digit code" className="p-3 border rounded-xl text-center tracking-[0.4em] text-lg w-full" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
            <button disabled={busy || code.length !== 6} className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 disabled:bg-slate-400">
              {busy ? 'Checking…' : 'Log in'}
            </button>
            <div className="flex justify-between text-xs">
              <button type="button" className="text-slate-500 hover:underline" onClick={() => { setStep('email'); setCode(''); setMessage(null); }}>Use another email</button>
              <button type="button" disabled={busy} className="text-indigo-600 hover:underline" onClick={requestCode}>Send a new code</button>
            </div>
          </form>
        )}

        {message && (
          <p className={`text-sm rounded-xl px-3 py-2 ${message.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700'}`}>{message.text}</p>
        )}
      </div>
    </main>
  );
}
