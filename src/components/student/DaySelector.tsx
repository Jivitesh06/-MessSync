import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getTodayIST } from '@/utils/dateUtils';

interface DaySelectorProps {
  dates: string[]; // array of ISO dates for this week
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  weekLabel?: string;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
  dates,
  selectedDate,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  weekLabel,
}) => {
  const todayStr = getTodayIST();

  const getDayInfo = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getUTCDate();
    const isToday = dateStr === todayStr;
    return { dayName, dayNum, isToday };
  };

  return (
    <div className="space-y-2">
      {/* Week Header & Pagination */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {weekLabel || 'Select Day'}
        </span>
        <div className="flex items-center gap-1">
          {onPreviousWeek && (
            <button
              onClick={onPreviousWeek}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 active-press transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onSelectDate(todayStr)}
            className="text-xs font-semibold px-2 py-0.5 rounded-md text-chitkara hover:bg-red-50 transition-colors"
          >
            Today
          </button>
          {onNextWeek && (
            <button
              onClick={onNextWeek}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 active-press transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Day Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {dates.map((dateStr) => {
          const { dayName, dayNum, isToday } = getDayInfo(dateStr);
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`flex-1 min-w-[3.6rem] py-2 px-1.5 rounded-xl flex flex-col items-center justify-center transition-all active-press select-none border ${
                isSelected
                  ? 'bg-chitkara text-white border-chitkara shadow-xs scale-102 font-bold'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`text-[11px] uppercase tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-400 font-semibold'}`}>
                {dayName}
              </span>
              <span className="text-base font-extrabold leading-tight">
                {dayNum}
              </span>
              {isToday && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected ? 'bg-white' : 'bg-chitkara'
                  }`}
                  title="Today"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
