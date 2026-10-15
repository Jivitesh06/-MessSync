import React, { useState } from 'react';
import { WeekMenu, MealOccurrence } from '@/types/menu';
import {
  computeWeekDiff,
  applyAcceptedDiff,
  DishDiffItem,
  WeekMenuDiffSummary,
} from '@/services/diffService';
import {
  Check,
  X,
  AlertTriangle,
  ArrowLeft,
  Send,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface MenuDiffViewProps {
  existingMenu: WeekMenu | null;
  proposedMenu: WeekMenu;
  onPublishConfirmed: (finalMenu: WeekMenu, changeSummary: string) => Promise<void>;
  onBack: () => void;
}

export const MenuDiffView: React.FC<MenuDiffViewProps> = ({
  existingMenu,
  proposedMenu,
  onPublishConfirmed,
  onBack,
}) => {
  const [diffSummary, setDiffSummary] = useState<WeekMenuDiffSummary>(() =>
    computeWeekDiff(existingMenu, proposedMenu)
  );

  const [diffItems, setDiffItems] = useState<DishDiffItem[]>(diffSummary.items);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [changeNotes, setChangeNotes] = useState<string>('Weekly notice board menu updates');

  const toggleItemAccepted = (id: string) => {
    const updated = diffItems.map((item) =>
      item.id === id ? { ...item, accepted: !item.accepted } : item
    );
    setDiffItems(updated);
  };

  const changedItems = diffItems.filter((i) => i.type !== 'unchanged');

  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    try {
      const finalMenu = applyAcceptedDiff(existingMenu, proposedMenu, diffItems);
      await onPublishConfirmed(finalMenu, changeNotes);
      setIsPublishing(false);
      setShowConfirmModal(false);
    } catch (err) {
      console.error(err);
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-subtle space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dish Editor</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-chitkara">
              Step 4 of 4 • Change Verification
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Compare Proposed Menu with Published Timetable
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review side-by-side differences. Accept or reject individual dish changes before broadcasting to students.
          </p>
        </div>

        <button
          onClick={() => setShowConfirmModal(true)}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white font-extrabold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 active-press"
        >
          <Send className="w-4 h-4" />
          <span>Publish Approved Changes</span>
        </button>
      </div>

      {/* Difference Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
            Additions
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-800">
            +{diffSummary.addedCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 block">
            Removals
          </span>
          <span className="text-xl sm:text-2xl font-black text-red-800">
            -{diffSummary.removedCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
            Modified / Renamed
          </span>
          <span className="text-xl sm:text-2xl font-black text-blue-800">
            {diffSummary.modifiedCount}
          </span>
        </div>
      </div>

      {/* Changes List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Individual Dish Diffs ({changedItems.length} changes detected)
        </h3>

        {changedItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-800">No differences detected.</p>
            <p className="text-xs text-slate-500 mt-0.5">
              The proposed menu exactly matches the current published schedule.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {changedItems.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  !item.accepted
                    ? 'bg-slate-50/70 border-slate-200 opacity-60'
                    : item.type === 'added'
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : item.type === 'removed'
                    ? 'bg-red-50/60 border-red-300'
                    : 'bg-blue-50/60 border-blue-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        item.type === 'added'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.type === 'removed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      {item.dayName} • {item.mealName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {item.oldDish && (
                      <span className={item.type === 'removed' ? 'line-through text-red-700' : 'text-slate-400 line-through'}>
                        {item.oldDish.name}
                      </span>
                    )}
                    {item.oldDish && item.newDish && <span className="text-slate-400">→</span>}
                    {item.newDish && (
                      <span className={item.type === 'added' ? 'text-emerald-800 font-bold' : 'text-slate-900 font-bold'}>
                        {item.newDish.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Accept / Reject Toggle Button */}
                <button
                  onClick={() => toggleItemAccepted(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 active-press ${
                    item.accepted
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {item.accepted ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Accepted</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Rejected</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation & Publish Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900">
              Confirm Menu Publication
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to publish an updated timetable for <strong>{proposedMenu.label}</strong>. Connected students will see these changes live immediately.
            </p>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Changelog Note (Audit Log):
              </label>
              <input
                type="text"
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:border-chitkara"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={handleConfirmPublish}
                className="flex-1 py-2.5 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white text-xs font-extrabold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {isPublishing ? (
                  <span>Broadcasting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
