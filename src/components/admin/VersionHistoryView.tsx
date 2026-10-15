import React, { useState, useEffect } from 'react';
import { WeekMenu, MenuVersion, MenuDraft } from '@/types/menu';
import { menuService } from '@/services/menuService';
import { History, RotateCcw, Clock, Check, FileText, Trash2, ArrowRight } from 'lucide-react';
import { authService } from '@/services/authService';

interface VersionHistoryViewProps {
  currentWeek: WeekMenu;
  onRestoreVersion: (version: MenuVersion) => Promise<void>;
  onResumeDraft: (draft: MenuDraft) => void;
}

export const VersionHistoryView: React.FC<VersionHistoryViewProps> = ({
  currentWeek,
  onRestoreVersion,
  onResumeDraft,
}) => {
  const [versions, setVersions] = useState<MenuVersion[]>([]);
  const [drafts, setDrafts] = useState<MenuDraft[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      menuService.getVersionHistory(currentWeek.id),
      menuService.getDrafts(),
    ]).then(([vList, dList]) => {
      setVersions(vList);
      setDrafts(dList);
      setLoading(false);
    });
  }, [currentWeek.id]);

  const handleRestore = async (version: MenuVersion) => {
    setRestoringId(version.id);
    try {
      await onRestoreVersion(version);
      setNotice(`Restored version v${version.version} successfully!`);
      setTimeout(() => setNotice(null), 3000);
      setRestoringId(null);
    } catch {
      setRestoringId(null);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    await menuService.deleteDraft(draftId);
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-subtle space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-chitkara">
          <span>Audit & Rollback Controls</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
          Version History & Saved Drafts
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review previous published versions for {currentWeek.label} or restore a previous snapshot with 1-click rollback.
        </p>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Saved Drafts Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>Unpublished Drafts ({drafts.length})</span>
        </h3>

        {drafts.length === 0 ? (
          <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-200 italic">
            No pending drafts. Any in-progress edits will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {drafts.map((d) => (
              <div
                key={d.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Draft for {d.label}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Updated {new Date(d.updatedAt).toLocaleString()} by {d.createdBy}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onResumeDraft(d)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center gap-1"
                  >
                    <span>Resume</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(d.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Published Version History */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-slate-400" />
          <span>Published Snapshots History</span>
        </h3>

        {loading ? (
          <p className="text-xs text-slate-400 py-3">Loading historical snapshots...</p>
        ) : versions.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No previous versions on record.</p>
        ) : (
          <div className="space-y-2.5">
            {versions.map((v) => {
              const isCurrent = v.version === currentWeek.version;
              return (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isCurrent
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        v{v.version}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Currently Active
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(v.publishedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">
                      {v.changeSummary || 'Weekly notice menu published.'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Published by: {v.publishedBy}
                    </p>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRestore(v)}
                      disabled={restoringId === v.id}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 active-press"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                      <span>{restoringId === v.id ? 'Restoring...' : 'Rollback to v' + v.version}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
