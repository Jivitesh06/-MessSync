import React from 'react';
import {
  Clock,
  ShieldCheck,
  Smartphone,
  Info,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  LogOut,
  Wifi,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { useSyncStatus } from '@/services/syncService';
import { formatTime12h } from '@/utils/dateUtils';

interface MorePageProps {
  onOpenAdminLogin: () => void;
  onNavigateToAdmin: () => void;
}

export const MorePage: React.FC<MorePageProps> = ({
  onOpenAdminLogin,
  onNavigateToAdmin,
}) => {
  const isAdmin = authService.isAdmin();
  const currentUser = authService.getCurrentUser();
  const syncState = useSyncStatus();

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Settings & Info
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          MessSync • Chitkara University Mess Companion
        </p>
      </div>

      {/* Official Mess Timings Card */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-subtle space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Clock className="w-4 h-4 text-chitkara" />
          <span>Official Hostel Mess Schedule</span>
        </div>
        <p className="text-xs text-slate-500">
          Timings apply to all Chitkara University dining halls (Boys & Girls Hostels).
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Breakfast
            </span>
            <span className="text-xs font-extrabold text-slate-800">
              07:00 AM – 10:00 AM
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Lunch
            </span>
            <span className="text-xs font-extrabold text-slate-800">
              12:00 PM – 03:00 PM
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Evening Snacks
            </span>
            <span className="text-xs font-extrabold text-slate-800">
              04:00 PM – 06:00 PM
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Dinner
            </span>
            <span className="text-xs font-extrabold text-slate-800">
              07:00 PM – 10:00 PM
            </span>
          </div>
        </div>
      </section>

      {/* App & Offline Storage Status */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-subtle space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Wifi className="w-4 h-4 text-emerald-600" />
          <span>Offline Data & Sync Status</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Connection State:</span>
            <span className={`font-bold ${syncState.isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
              {syncState.isOnline ? 'Online (Real-time sync)' : 'Offline (Local IndexedDB)'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Last Synced:</span>
            <span className="font-medium text-slate-700">
              {syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleTimeString() : 'Just now'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Offline Pending Ratings:</span>
            <span className="font-bold text-slate-700">
              {syncState.pendingCount}
            </span>
          </div>
        </div>
      </section>

      {/* Admin Management Section */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-elevated space-y-4">
        <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>Mess Administration</span>
        </div>

        {isAdmin ? (
          <div className="space-y-3">
            <div className="bg-white/10 p-3 rounded-xl">
              <span className="text-[11px] text-slate-300 block">Signed in as Administrator:</span>
              <span className="font-bold text-sm text-white">{currentUser?.email}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onNavigateToAdmin}
                className="flex-1 py-2.5 px-4 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Open Admin Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={async () => {
                  await authService.logout();
                }}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Mess Wardens and Chief Chefs can sign in here to upload printed notice photographs, review OCR extractions, edit dish schedules, and monitor student meal ratings.
            </p>

            <button
              onClick={onOpenAdminLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Administrator Sign In</span>
            </button>
          </div>
        )}
      </section>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-400 space-y-1">
        <p>MessSync v1.0 • Designed for Chitkara University</p>
        <p>Your mess menu. Always in sync.</p>
      </div>
    </div>
  );
};
