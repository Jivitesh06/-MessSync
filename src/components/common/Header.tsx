import React from 'react';
import { Wifi, WifiOff, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { useSyncStatus, syncService } from '@/services/syncService';
import { authService } from '@/services/authService';

interface HeaderProps {
  onOpenSearch?: () => void;
  onNavigateToAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch, onNavigateToAdmin }) => {
  const syncState = useSyncStatus();
  const isAdmin = authService.isAdmin();

  const handleManualSync = async () => {
    await syncService.triggerSync();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-colors">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chitkara to-chitkara-dark flex items-center justify-center text-white shadow-xs">
            <span className="font-extrabold text-base tracking-tight">M</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-base tracking-tight">MessSync</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-red-50 text-chitkara border border-red-100">
                Chitkara
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-none hidden sm:block">
              Hostel Mess • Always in sync
            </p>
          </div>
        </div>

        {/* Right Actions: Sync status + Admin/Search */}
        <div className="flex items-center gap-2">
          {/* Network / Offline pill */}
          <button
            onClick={handleManualSync}
            title={syncState.isOnline ? 'Online • Tap to refresh data' : 'Offline • Using cached menu'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              syncState.isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70'
                : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
            }`}
          >
            {syncState.isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : syncState.isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="hidden xs:inline">
              {syncState.isSyncing ? 'Syncing...' : syncState.isOnline ? 'Live' : 'Offline'}
            </span>
            {syncState.pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title={`${syncState.pendingCount} pending ratings`} />
            )}
          </button>

          {/* Admin badge shortcut if logged in */}
          {isAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-600 text-white shadow-xs hover:bg-red-700 active-press"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
