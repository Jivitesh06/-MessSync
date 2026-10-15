import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  ShieldCheck,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  MealTimingsConfig,
  DEFAULT_CHITKARA_TIMINGS,
  validateMealTiming,
} from '@/config/mealTimings';
import { mealTimingService } from '@/services/mealTimingService';
import { formatTime12h } from '@/utils/dateUtils';
import { authService } from '@/services/authService';
import { WeekMenu } from '@/types/menu';
import { menuService } from '@/services/menuService';

interface MealTimingsConfigViewProps {
  currentWeekMenu?: WeekMenu;
  onMenuUpdated?: (menu: WeekMenu) => void;
}

export const MealTimingsConfigView: React.FC<MealTimingsConfigViewProps> = ({
  currentWeekMenu,
  onMenuUpdated,
}) => {
  const [timings, setTimings] = useState<MealTimingsConfig>(mealTimingService.getCurrentTimings());
  const [applyToCurrentWeek, setApplyToCurrentWeek] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentUser = authService.getCurrentUser();
  const adminEmail = currentUser?.email || 'admin@chitkara.edu.in';

  useEffect(() => {
    mealTimingService.getTimings().then((loaded) => {
      setTimings(loaded);
    });
  }, []);

  const handleTimeChange = (
    slotId: 'breakfast' | 'lunch' | 'snacks' | 'dinner',
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setTimings((prev) => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        [field]: value,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validate
    const slots: ('breakfast' | 'lunch' | 'snacks' | 'dinner')[] = [
      'breakfast',
      'lunch',
      'snacks',
      'dinner',
    ];
    for (const slot of slots) {
      const check = validateMealTiming(timings[slot]);
      if (!check.valid) {
        setIsSaving(false);
        setErrorMessage(check.error || 'Invalid timing values');
        return;
      }
    }

    try {
      // 2. Persist timings to Firestore appConfig and local caches
      const res = await mealTimingService.updateTimings(timings, adminEmail);
      if (!res.success) {
        throw new Error(res.error || 'Failed to save timings');
      }

      // 3. Optionally update existing meals in active week menu so student views update immediately
      if (applyToCurrentWeek && currentWeekMenu) {
        const updatedDays = { ...currentWeekMenu.days };
        let modifiedCount = 0;

        Object.keys(updatedDays).forEach((dateStr) => {
          updatedDays[dateStr] = updatedDays[dateStr].map((meal) => {
            const slotTiming = timings[meal.slotId as 'breakfast' | 'lunch' | 'snacks' | 'dinner'];
            if (slotTiming) {
              modifiedCount++;
              return {
                ...meal,
                startTime: slotTiming.startTime,
                endTime: slotTiming.endTime,
                updatedAt: new Date().toISOString(),
              };
            }
            return meal;
          });
        });

        const updatedMenu: WeekMenu = {
          ...currentWeekMenu,
          days: updatedDays,
        };

        await menuService.publishWeekMenu(
          updatedMenu,
          adminEmail,
          'Updated mess service window timings across schedule'
        );
        onMenuUpdated?.(updatedMenu);
      }

      setSuccessMessage('Official mess timings saved to Firestore and synchronized with student app.');
      setIsSaving(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error updating timings');
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setTimings(DEFAULT_CHITKARA_TIMINGS);
    setSuccessMessage('Reset to official Chitkara timings (Breakfast 07:30–08:50, Lunch 12:00–14:30, Dinner 19:30–20:50). Click "Save Changes" to publish.');
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-subtle space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-chitkara">
          <span>Campus Operations & Schedule</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
          Official Mess Service Timings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure active dining hall service windows in <strong>Asia/Kolkata (IST)</strong>. Changes automatically update student meal cards, countdown timers, and "Serving Now" status labels.
        </p>
      </div>

      {/* Official Timings Summary Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Active Chitkara Official Service Schedule (IST)</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The verified university dining hall schedule serves Breakfast (7:30 AM–8:50 AM), Lunch (12:00 PM–2:30 PM), and Dinner (7:30 PM–8:50 PM). Evening Tea & Snacks remains fully configurable below.
        </p>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Timings Edit Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Breakfast */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-900">Breakfast</span>
              <span className="text-xs font-bold text-chitkara">
                {formatTime12h(timings.breakfast.startTime)} – {formatTime12h(timings.breakfast.endTime)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Start (24h)
                </label>
                <input
                  type="time"
                  value={timings.breakfast.startTime}
                  onChange={(e) => handleTimeChange('breakfast', 'startTime', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-chitkara"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  End (24h)
                </label>
                <input
                  type="time"
                  value={timings.breakfast.endTime}
                  onChange={(e) => handleTimeChange('breakfast', 'endTime', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-chitkara"
                />
              </div>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Official: 7:30 AM to 8:50 AM
            </span>
          </div>

          {/* Lunch */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-900">Lunch</span>
              <span className="text-xs font-bold text-chitkara">
                {formatTime12h(timings.lunch.startTime)} – {formatTime12h(timings.lunch.endTime)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Start (24h)
                </label>
                <input
                  type="time"
                  value={timings.lunch.startTime}
                  onChange={(e) => handleTimeChange('lunch', 'startTime', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-chitkara"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  End (24h)
                </label>
                <input
                  type="time"
                  value={timings.lunch.endTime}
                  onChange={(e) => handleTimeChange('lunch', 'endTime', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-chitkara"
                />
              </div>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Official: 12:00 PM to 2:30 PM
            </span>
          </div>

          {/* Evening Tea & Snacks (Highlight configurable) */}
          <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900">Evening Tea & Snacks</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                  Configurable
                </span>
              </div>
              <span className="text-xs font-bold text-amber-900">
                {formatTime12h(timings.snacks.startTime)} – {formatTime12h(timings.snacks.endTime)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Start (24h)
                </label>
                <input
                  type="time"
                  value={timings.snacks.startTime}
                  onChange={(e) => handleTimeChange('snacks', 'startTime', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-chitkara"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  End (24h)
                </label>
                <input
                  type="time"
                  value={timings.snacks.endTime}
                  onChange={(e) => handleTimeChange('snacks', 'endTime', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-chitkara"
                />
              </div>
            </div>
            <span className="text-[11px] text-amber-800 font-medium block">
              Adjust as needed when official notifications change.
            </span>
          </div>

          {/* Dinner */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-900">Dinner</span>
              <span className="text-xs font-bold text-chitkara">
                {formatTime12h(timings.dinner.startTime)} – {formatTime12h(timings.dinner.endTime)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Start (24h)
                </label>
                <input
                  type="time"
                  value={timings.dinner.startTime}
                  onChange={(e) => handleTimeChange('dinner', 'startTime', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-chitkara"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  End (24h)
                </label>
                <input
                  type="time"
                  value={timings.dinner.endTime}
                  onChange={(e) => handleTimeChange('dinner', 'endTime', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-chitkara"
                />
              </div>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Official: 7:30 PM to 8:50 PM (After 8:50 PM, app highlights tomorrow's breakfast)
            </span>
          </div>
        </div>

        {/* Sync checkbox */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            id="applyToCurrentWeek"
            checked={applyToCurrentWeek}
            onChange={(e) => setApplyToCurrentWeek(e.target.checked)}
            className="w-4 h-4 text-chitkara rounded focus:ring-chitkara border-slate-300"
          />
          <label htmlFor="applyToCurrentWeek" className="text-xs text-slate-700 font-medium cursor-pointer">
            Automatically update all scheduled meals in the active published week menu to match these timings
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Official Chitkara Timings</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 active-press disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving to Firestore...' : 'Save & Publish Timings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
