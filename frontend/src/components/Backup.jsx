import React, { useEffect, useState } from 'react';
import { Save, Download, CloudUpload, ShieldCheck, Clock, FileJson, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getBackups, exportBackup } from '../api/client.js';

export default function Backup() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = () => {
    setLoading(true);
    getBackups()
      .then(list => setBackups(list || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setSuccessMsg('');
    try {
      const res = await exportBackup();
      setSuccessMsg(`Backup created successfully: ${res.filename}`);
      loadData();
    } catch (err) {
      alert(err.message || 'Error generating backup');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-10">
      
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Save size={18} className="text-emerald-600 shrink-0" />
              <span className="truncate">Cloud Backup & Restore</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate hidden sm:block">Secure JSON database snapshots stored in Cloudflare R2 bucket</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <CloudUpload size={14} strokeWidth={2.5} />
              <span className="whitespace-nowrap">{exporting ? 'Creating…' : 'Backup Now'}</span>
            </button>

            <button
              onClick={loadData}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh Backups"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span className="truncate">{successMsg}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historical Database Snapshots</h2>
          <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{backups.length} snapshots</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading backups…</span>
          </div>
        ) : backups.length > 0 ? (
          <>
            <div className="sm:hidden space-y-2">
              {backups.map(b => (
                <div
                  key={b.id}
                  className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-2 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileJson size={14} className="text-emerald-600 shrink-0" />
                      <span className="font-mono font-bold text-slate-900 text-xs truncate">{b.filename}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {(b.size_bytes / 1024).toFixed(1)} KB
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                    <span className="text-[10px] text-slate-400 font-medium">{b.created_at}</span>
                    <a
                      href={`https://cdn.r2.sumanonline.com/${b.r2_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs"
                    >
                      <Download size={12} />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold tracking-wider whitespace-nowrap">
                    <th className="pb-2">Snapshot Filename</th>
                    <th className="pb-2">Created Timestamp</th>
                    <th className="pb-2 text-right">Size</th>
                    <th className="pb-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-mono font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                        <FileJson size={15} className="text-emerald-600 shrink-0" />
                        <span>{b.filename}</span>
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">{b.created_at}</td>
                      <td className="py-3 text-right font-mono text-slate-600 whitespace-nowrap">{(b.size_bytes / 1024).toFixed(1)} KB</td>
                      <td className="py-3 text-center whitespace-nowrap">
                        <a
                          href={`https://cdn.r2.sumanonline.com/${b.r2_key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold text-xs"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            <ShieldCheck size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No backup snapshots generated yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click "Backup Now" to save a full store snapshot.</p>
          </div>
        )}
      </div>

    </div>
  );
}
