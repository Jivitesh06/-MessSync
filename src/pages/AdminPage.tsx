import React, { useState, useEffect } from 'react';
import { WeekMenu, MenuDraft, MenuVersion } from '@/types/menu';
import { authService } from '@/services/authService';
import { menuService } from '@/services/menuService';
import { UserProfile } from '@/types/user';
import { OcrExtractionResult } from '@/services/ocrService';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowLeft,
  LayoutDashboard,
  Upload,
  Edit3,
  Star,
  History,
  LogOut,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Eye,
} from 'lucide-react';

import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { PhotoUploadView } from '@/components/admin/PhotoUploadView';
import { OcrReviewView } from '@/components/admin/OcrReviewView';
import { MenuDiffView } from '@/components/admin/MenuDiffView';
import { ManualEditorView } from '@/components/admin/ManualEditorView';
import { RatingModerationView } from '@/components/admin/RatingModerationView';
import { VersionHistoryView } from '@/components/admin/VersionHistoryView';

interface AdminPageProps {
  currentWeekMenu: WeekMenu;
  onMenuUpdated: (updated: WeekMenu) => void;
  onExitToStudent: () => void;
}

export type AdminTab =
  | 'overview'
  | 'upload'
  | 'ocr_review'
  | 'menu_diff'
  | 'manual'
  | 'ratings'
  | 'history';

export const AdminPage: React.FC<AdminPageProps> = ({
  currentWeekMenu,
  onMenuUpdated,
  onExitToStudent,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Login form state (empty defaults for security)
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Active OCR workflow state
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrExtractionResult | null>(null);
  const [reviewedCandidateMenu, setReviewedCandidateMenu] = useState<WeekMenu | null>(null);

  useEffect(() => {
    return authService.subscribe((user) => setCurrentUser(user));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      await authService.loginAdmin(email, password);
      setIsLoggingIn(false);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setActiveTab('overview');
  };

  // OCR Step 2 -> Step 3
  const handleOcrExtractionDone = (
    result: OcrExtractionResult,
    photoUrl: string,
    targetMonday: string
  ) => {
    setOcrResult(result);
    setUploadedPhotoUrl(photoUrl);
    setReviewedCandidateMenu(result.menu);
    setActiveTab('ocr_review');
  };

  // OCR Step 3 -> Step 4
  const handleProceedToDiff = (reviewedMenu: WeekMenu) => {
    setReviewedCandidateMenu(reviewedMenu);
    setActiveTab('menu_diff');
  };

  // Step 4: Publish
  const handleFinalPublish = async (finalMenu: WeekMenu, changeSummary: string) => {
    const adminEmail = currentUser?.email || 'admin@chitkara.edu.in';
    const published = await menuService.publishWeekMenu(finalMenu, adminEmail, changeSummary);
    onMenuUpdated(published);
    setActiveTab('overview');
  };

  // Save Draft
  const handleSaveDraft = async (draftMenu: WeekMenu) => {
    const adminEmail = currentUser?.email || 'admin@chitkara.edu.in';
    const draft: MenuDraft = {
      id: `draft-${Date.now()}`,
      weekId: draftMenu.id,
      startDate: draftMenu.startDate,
      endDate: draftMenu.endDate,
      label: draftMenu.label,
      days: draftMenu.days,
      sourcePhotoUrl: uploadedPhotoUrl || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: adminEmail,
      hasUncertainDishes: false,
    };
    await menuService.saveDraft(draft);
  };

  // Restore past version
  const handleRestoreVersion = async (versionRecord: MenuVersion) => {
    const adminEmail = currentUser?.email || 'admin@chitkara.edu.in';
    const restored = await menuService.publishWeekMenu(
      versionRecord.data,
      adminEmail,
      `Rollback to v${versionRecord.version}`
    );
    onMenuUpdated(restored);
  };

  // Resume editing a saved draft
  const handleResumeDraft = (draft: MenuDraft) => {
    const restoredWeek: WeekMenu = {
      id: draft.weekId,
      startDate: draft.startDate,
      endDate: draft.endDate,
      label: draft.label,
      isPublished: false,
      version: currentWeekMenu.version,
      days: draft.days,
    };
    setReviewedCandidateMenu(restoredWeek);
    if (draft.sourcePhotoUrl) {
      setUploadedPhotoUrl(draft.sourcePhotoUrl);
      setActiveTab('ocr_review');
    } else {
      setActiveTab('manual');
    }
  };

  // 1. If not authenticated as Admin, show login screen
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-elevated space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-chitkara text-white flex items-center justify-center mx-auto shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              MessSync Administrator
            </h2>
            <p className="text-xs text-slate-500">
              Chitkara University Hostel Dining Committee & Warden Portal
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Admin Email:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@chitkara.edu.in"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:border-chitkara focus:ring-1 focus:ring-chitkara"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Password:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:border-chitkara focus:ring-1 focus:ring-chitkara"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white font-bold text-sm shadow-xs transition-colors active-press"
            >
              {isLoggingIn ? 'Verifying Credentials...' : 'Sign In as Administrator'}
            </button>
          </form>

          {/* Demo Helper Button (Development mode only) */}
          {!import.meta.env.PROD && (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-center space-y-1">
              <p className="text-[11px] font-bold text-amber-800">
                Local Dev Evaluation Credentials:
              </p>
              <p className="text-xs font-mono font-semibold text-amber-900">
                admin@chitkara.edu.in / admin123
              </p>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@chitkara.edu.in');
                  setPassword('admin123');
                }}
                className="text-[11px] font-bold text-chitkara underline hover:text-chitkara-dark"
              >
                Auto-fill for Dev Testing
              </button>
            </div>
          )}

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onExitToStudent}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              ← Return to Student Mess Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  return (
    <div className="space-y-6 pb-20">
      {/* Top Admin Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-elevated">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-chitkara flex items-center justify-center font-black text-sm">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base">MessSync Admin Hub</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600/60 px-2 py-0.5 rounded-md">
                Chitkara
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {currentUser.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onExitToStudent}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Student View</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Sign out of Admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {[
          { id: 'overview' as AdminTab, label: 'Overview', icon: LayoutDashboard },
          { id: 'upload' as AdminTab, label: 'Photo Upload & OCR', icon: Upload },
          ...(ocrResult && uploadedPhotoUrl
            ? [{ id: 'ocr_review' as AdminTab, label: 'Review OCR', icon: Sparkles }]
            : []),
          ...(reviewedCandidateMenu
            ? [{ id: 'menu_diff' as AdminTab, label: 'Compare & Publish', icon: ShieldCheck }]
            : []),
          { id: 'manual' as AdminTab, label: 'Manual Editor', icon: Edit3 },
          { id: 'ratings' as AdminTab, label: 'Rating Analytics', icon: Star },
          { id: 'history' as AdminTab, label: 'Versions & Drafts', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-chitkara text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Views */}
      {activeTab === 'overview' && (
        <AdminDashboard
          weekMenu={currentWeekMenu}
          onNavigateTab={(tab) => setActiveTab(tab as AdminTab)}
        />
      )}

      {activeTab === 'upload' && (
        <PhotoUploadView
          currentPublishedWeek={currentWeekMenu}
          onExtractionComplete={handleOcrExtractionDone}
        />
      )}

      {activeTab === 'ocr_review' && ocrResult && uploadedPhotoUrl && (
        <OcrReviewView
          photoUrl={uploadedPhotoUrl}
          extractedResult={ocrResult}
          onProceedToDiff={handleProceedToDiff}
          onSaveDraft={handleSaveDraft}
          onBack={() => setActiveTab('upload')}
        />
      )}

      {activeTab === 'menu_diff' && reviewedCandidateMenu && (
        <MenuDiffView
          existingMenu={currentWeekMenu}
          proposedMenu={reviewedCandidateMenu}
          onPublishConfirmed={handleFinalPublish}
          onBack={() => setActiveTab('ocr_review')}
        />
      )}

      {activeTab === 'manual' && (
        <ManualEditorView
          initialMenu={currentWeekMenu}
          onPublish={async (updated, summary) => {
            await handleFinalPublish(updated, summary);
          }}
          onSaveDraft={handleSaveDraft}
        />
      )}

      {activeTab === 'ratings' && (
        <RatingModerationView weekMenu={currentWeekMenu} />
      )}

      {activeTab === 'history' && (
        <VersionHistoryView
          currentWeek={currentWeekMenu}
          onRestoreVersion={handleRestoreVersion}
          onResumeDraft={handleResumeDraft}
        />
      )}
    </div>
  );
};
