'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-3 overflow-y-auto" onClick={onClose}>
      <div
        className={`bg-white rounded-3xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} shadow-2xl relative my-6`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button aria-label="Close" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
