'use client';
import { useState } from 'react';
import { Briefcase, MapPin, Share2, X } from 'lucide-react';

// Shows the photo, or the person's initials if there is no photo or it fails to load.
function Avatar({ member }) {
  const [failed, setFailed] = useState(false);
  if (member.imageUrl && !failed) {
    return <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" onError={() => setFailed(true)} />;
  }
  const initials = (member.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  return (
    <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold text-xl">
      {initials}
    </div>
  );
}

export default function FamilyMemberCard({ member }) {
  const [isOpen, setIsOpen] = useState(false);
  const safeSocialLink = /^https?:\/\//i.test(member.socialMedia || '') ? member.socialMedia : '';

  return (
    <div className="relative group flex flex-col items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 w-44">
      {/* Circle Photo */}
      <div 
        className="w-20 h-20 rounded-full overflow-hidden border-4 border-indigo-500 cursor-pointer transition-transform duration-300 transform group-hover:scale-110 shadow-md bg-slate-100" 
        onClick={() => setIsOpen(true)}
      >
        <Avatar member={member} />
      </div>

      {/* Main Details */}
      <div className="text-center mt-3">
        <h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{member.name}</h4>
        {member.spouseName && <p className="text-xs text-rose-500 font-medium truncate max-w-[150px]">& {member.spouseName}</p>}
        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[150px]">{member.occupation || 'Family Member'}</p>
      </div>

      {/* Hover Tooltip (Quick View Location) */}
      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[11px] rounded-lg py-1.5 px-3 whitespace-nowrap z-10 shadow-lg">
        <span>📍 {member.location || 'Global'}</span>
        <div className="w-2 h-2 bg-slate-900 rotate-45 mt-1 -mb-2"></div>
      </div>

      {/* Detailed Modal Popup On Click */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl relative border border-slate-100" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
            <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border-4 border-indigo-50 shadow-inner bg-slate-50">
              <Avatar member={member} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mt-4">{member.name}</h2>
            {member.spouseName && <p className="text-sm text-rose-500 font-semibold mt-0.5">Married to {member.spouseName}</p>}
            
            <div className="mt-6 space-y-3.5 text-left border-t border-slate-100 pt-4 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Briefcase size={16} /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Occupation</p>
                  <p className="font-medium text-slate-700">{member.occupation || 'Not Specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><MapPin size={16} /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Location</p>
                  <p className="font-medium text-slate-700">{member.location || 'Not Specified'}</p>
                </div>
              </div>
              {safeSocialLink && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-600"><Share2 size={16} /></div>
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Social Link</p>
                    <a href={safeSocialLink} target="_blank" rel="noreferrer" className="font-medium text-sky-600 hover:underline">Open Profile</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
