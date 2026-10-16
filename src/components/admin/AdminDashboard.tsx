import React from 'react';
import { WeekMenu } from '@/types/menu';
import {
  Upload,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Star,
  Users,
  Clock,
  History,
  TrendingUp,
} from 'lucide-react';
import { formatTime12h, formatFriendlyDate, getTodayIST } from '@/utils/dateUtils';

interface AdminDashboardProps {
  weekMenu: WeekMenu;
  onNavigateTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  weekMenu,
  onNavigateTab,
}) => {
  const todayStr = getTodayIST();
  const allMeals = Object.values(weekMenu.days).flat();

  // Statistics
  const totalMeals = allMeals.length;
  const uncertainDishesCount = allMeals.reduce(
    (acc, m) => acc + m.dishes.filter((d) => d.needsReview).length,
    0
  );

  const totalRatings = allMeals.reduce((acc, m) => acc + (m.ratingSummary?.count ?? 0), 0);
  const totalScoreSum = allMeals.reduce(
    (acc, m) => acc + (m.ratingSummary?.average ?? 0) * (m.ratingSummary?.count ?? 0),
    0
  );
  const avgRating = totalRatings > 0 ? (totalScoreSum / totalRatings).toFixed(2) : '—';

  // Highest & lowest rated meals (only considering meals that have at least 1 rating)
  const ratedMeals = allMeals.filter((m) => (m.ratingSummary?.count ?? 0) > 0);
  const sorted = [...ratedMeals].sort(
    (a, b) => (b.ratingSummary?.average || 0) - (a.ratingSummary?.average || 0)
  );
  const highestMeal = sorted[0];
  const lowestMeal = sorted.length > 1 ? sorted[sorted.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Published Menu
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {weekMenu.label}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Version <strong className="text-slate-800">v{weekMenu.version}</strong> • Published by {weekMenu.publishedBy || 'admin@chitkara.edu.in'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={() => onNavigateTab('upload')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white font-bold text-xs shadow-xs transition-colors active-press"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photo & OCR</span>
          </button>
          <button
            onClick={() => onNavigateTab('manual')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors active-press"
          >
            <Edit3 className="w-4 h-4" />
            <span>Manual Editor</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Scheduled Meals</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{totalMeals}</span>
            <span className="text-xs text-emerald-600 font-bold">Mon – Sun</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Student Ratings</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{totalRatings}</span>
            <span className="text-xs text-slate-500">confirmed</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Campus Avg Rating</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-500">{avgRating}</span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Uncertain OCR Flags</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-black ${uncertainDishesCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {uncertainDishesCount}
            </span>
            <span className="text-xs text-slate-400">
              {uncertainDishesCount > 0 ? 'needs check' : 'all clean'}
            </span>
          </div>
        </div>
      </div>

      {/* Highest & Lowest Rated Meals Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Highest */}
        {highestMeal && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Highest Rated Meal
              </span>
              <h4 className="text-base font-extrabold text-slate-900 mt-1">
                {highestMeal.dayOfWeek} {highestMeal.name}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                {highestMeal.dishes.map((d) => d.name).join(', ')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-base font-black text-emerald-800">
                <Star className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                <span>{highestMeal.ratingSummary?.average?.toFixed(1) ?? '—'}</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">
                {highestMeal.ratingSummary?.count ?? 0} ratings
              </span>
            </div>
          </div>
        )}

        {/* Lowest */}
        {lowestMeal && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Needs Improvement
              </span>
              <h4 className="text-base font-extrabold text-slate-900 mt-1">
                {lowestMeal.dayOfWeek} {lowestMeal.name}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                {lowestMeal.dishes.map((d) => d.name).join(', ')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-base font-black text-amber-800">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>{lowestMeal.ratingSummary?.average?.toFixed(1) ?? '—'}</span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium">
                {lowestMeal.ratingSummary?.count ?? 0} ratings
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Nav Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigateTab('upload')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-chitkara text-left transition-all shadow-2xs group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-chitkara flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Upload className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Notice Photo Upload & OCR</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload new notice photo, auto-extract dishes, and compare with current menu.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('manual')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-400 text-left transition-all shadow-2xs group"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Edit3 className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Manual Dish Editor</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Add, remove, reorder dishes, adjust meal timings, and duplicate weeks.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('ratings')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-400 text-left transition-all shadow-2xs group"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Star className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Ratings & Moderation</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect meal feedback tags, review text, and moderate inappropriate comments.
          </p>
        </button>
      </div>
    </div>
  );
};
