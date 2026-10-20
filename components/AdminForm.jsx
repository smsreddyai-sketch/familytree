'use client';
import { useState } from 'react';

export default function AdminForm({ onMemberAdded }) {
  const [formData, setFormData] = useState({ name: '', spouseName: '', generation: '1', occupation: '', location: '', socialMedia: '' });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Name is required');
    setLoading(true);

    try {
      let imageUrl = '';
      if (file) {
        const uploadRes = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, { method: 'POST', body: file });
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url || '';
      }

      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, imageUrl }),
      });

      if (res.ok) {
        setFormData({ name: '', spouseName: '', generation: '1', occupation: '', location: '', socialMedia: '' });
        setFile(null);
        setPreviewUrl('');
        onMemberAdded();
        alert('Family member saved successfully!');
      }
    } catch (err) {
      alert('Error saving data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm max-w-xl mx-auto space-y-4">
      <h3 className="text-lg font-bold text-slate-800 border-b pb-2">➕ Add New Family Member</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Full Name *" className="p-2.5 border rounded-xl text-sm w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        <input type="text" placeholder="Spouse / Husband Name" className="p-2.5 border rounded-xl text-sm w-full" value={formData.spouseName} onChange={e => setFormData({...formData, spouseName: e.target.value})} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select className="p-2.5 border rounded-xl text-sm bg-white w-full" value={formData.generation} onChange={e => setFormData({...formData, generation: e.target.value})}>
          <option value="1">1st Gen: Grandparents</option>
          <option value="2">2nd Gen: Sons / Daughters / Spouses</option>
          <option value="3">3rd Gen: Me & Cousins</option>
          <option value="4">4th Gen: My Kids & Their Cousins</option>
          <option value="5">5th Gen: Grandchildren & Their Cousins</option>
        </select>
        <input type="text" placeholder="Occupation / Job" className="p-2.5 border rounded-xl text-sm w-full" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Current Location" className="p-2.5 border rounded-xl text-sm w-full" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
        <input type="url" placeholder="Social Profile Link (https://...)" className="p-2.5 border rounded-xl text-sm w-full" value={formData.socialMedia} onChange={e => setFormData({...formData, socialMedia: e.target.value})} />
      </div>

      <div className="flex items-center gap-4 border border-dashed rounded-xl p-3 bg-slate-50">
        <input type="file" accept="image/*" className="text-xs text-slate-600 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 cursor-pointer" onChange={handleFileChange} />
        {previewUrl && <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border" />}
      </div>

      <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 disabled:bg-slate-400">
        {loading ? 'Processing Uploads...' : 'Save Family Member to Tree'}
      </button>
    </form>
  );
}
