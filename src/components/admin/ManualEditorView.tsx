import React, { useState } from 'react';
import { WeekMenu, MealOccurrence, Dish } from '@/types/menu';
import {
  Plus,
  Trash2,
  Copy,
  Clock,
  Save,
  Send,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatTime12h, formatFriendlyDate } from '@/utils/dateUtils';

interface ManualEditorViewProps {
  initialMenu: WeekMenu;
  onPublish: (updatedMenu: WeekMenu, summary: string) => Promise<void>;
  onSaveDraft: (menu: WeekMenu) => void;
}

export const ManualEditorView: React.FC<ManualEditorViewProps> = ({
  initialMenu,
  onPublish,
  onSaveDraft,
}) => {
  const [menu, setMenu] = useState<WeekMenu>(initialMenu);
  const availableDates = Object.keys(menu.days).sort();
  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0] || '');
  const [selectedSlot, setSelectedSlot] = useState<string>('lunch');

  const [newDishName, setNewDishName] = useState<string>('');
  const [newDishCategory, setNewDishCategory] = useState<Dish['category']>('Main');
  const [isVeg, setIsVeg] = useState<boolean>(true);

  const [copyTargetDate, setCopyTargetDate] = useState<string>(availableDates[1] || '');
  const [showCopyModal, setShowCopyModal] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const currentMeals = menu.days[selectedDate] || [];
  const currentMeal = currentMeals.find((m) => m.slotId === selectedSlot) || currentMeals[0];

  // Update meal timings
  const handleTimingChange = (start: string, end: string) => {
    if (!currentMeal) return;
    const updated = { ...menu };
    const meal = updated.days[selectedDate]?.find((m) => m.id === currentMeal.id);
    if (meal) {
      meal.startTime = start;
      meal.endTime = end;
    }
    setMenu(updated);
  };

  // Add dish
  const handleAddDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim() || !currentMeal) return;

    const updated = { ...menu };
    const meal = updated.days[selectedDate]?.find((m) => m.id === currentMeal.id);
    if (meal) {
      meal.dishes.push({
        id: `${meal.id}-m-${Date.now()}`,
        name: newDishName.trim(),
        category: newDishCategory,
        isVegetarian: isVeg,
      });
    }
    setMenu(updated);
    setNewDishName('');
  };

  // Delete dish
  const handleDeleteDish = (dishId: string) => {
    const updated = { ...menu };
    const meal = updated.days[selectedDate]?.find((m) => m.id === currentMeal.id);
    if (meal) {
      meal.dishes = meal.dishes.filter((d) => d.id !== dishId);
    }
    setMenu(updated);
  };

  // Copy meal to another day
  const handleCopyMeal = () => {
    if (!currentMeal || !copyTargetDate) return;
    const updated = { ...menu };
    const targetMeals = updated.days[copyTargetDate];
    if (targetMeals) {
      const existingInTarget = targetMeals.find((m) => m.slotId === currentMeal.slotId);
      if (existingInTarget) {
        existingInTarget.dishes = JSON.parse(JSON.stringify(currentMeal.dishes));
        existingInTarget.startTime = currentMeal.startTime;
        existingInTarget.endTime = currentMeal.endTime;
      }
    }
    setMenu(updated);
    setShowCopyModal(false);
    setSuccessNote(`Copied ${currentMeal.name} to ${formatFriendlyDate(copyTargetDate)}!`);
    setTimeout(() => setSuccessNote(null), 3000);
  };

  // Save changes & publish
  const handlePublishNow = async () => {
    setIsPublishing(true);
    try {
      await onPublish(menu, 'Manual menu adjustments by administrator');
      setIsPublishing(false);
      setSuccessNote('Published successfully! Connected students updated.');
      setTimeout(() => setSuccessNote(null), 3000);
    } catch (err) {
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-subtle space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Manual Menu Management
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Manual Schedule Editor
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add or edit individual dishes, adjust meal service hours, or copy menus across days.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              onSaveDraft(menu);
              setSuccessNote('Saved as Draft!');
              setTimeout(() => setSuccessNote(null), 2500);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={handlePublishNow}
            disabled={isPublishing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white font-extrabold text-xs shadow-xs transition-colors active-press"
          >
            <Send className="w-4 h-4" />
            <span>{isPublishing ? 'Publishing...' : 'Publish Changes'}</span>
          </button>
        </div>
      </div>

      {successNote && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successNote}</span>
        </div>
      )}

      {/* Day Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Select Day:
        </label>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {availableDates.map((dateStr) => {
            const dayMeals = menu.days[dateStr] || [];
            const dayName = dayMeals[0]?.dayOfWeek || 'Day';
            const isSelected = dateStr === selectedDate;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{dayName}</span>
                <span className="text-[10px] block opacity-75">{dateStr.split('-').slice(1).join('/')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Meal Slot Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
        {[
          { id: 'breakfast', label: 'Breakfast' },
          { id: 'lunch', label: 'Lunch' },
          { id: 'snacks', label: 'Snacks' },
          { id: 'dinner', label: 'Dinner' },
        ].map((slot) => (
          <button
            key={slot.id}
            onClick={() => setSelectedSlot(slot.id)}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              selectedSlot === slot.id
                ? 'bg-white text-chitkara shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {slot.label}
          </button>
        ))}
      </div>

      {/* Current Meal Details Box */}
      {currentMeal && (
        <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {currentMeal.dayOfWeek} • {currentMeal.name}
              </h3>
              <p className="text-xs text-slate-500">
                {currentMeal.dishes.length} dishes in this slot
              </p>
            </div>

            {/* Timings and Copy actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="time"
                  value={currentMeal.startTime}
                  onChange={(e) => handleTimingChange(e.target.value, currentMeal.endTime)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden"
                />
                <span>–</span>
                <input
                  type="time"
                  value={currentMeal.endTime}
                  onChange={(e) => handleTimingChange(currentMeal.startTime, e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowCopyModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
                title="Copy meal to another day"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Meal</span>
              </button>
            </div>
          </div>

          {/* Dishes List */}
          <div className="space-y-2">
            {currentMeal.dishes.map((dish, idx) => (
              <div
                key={dish.id}
                className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...menu };
                      const m = updated.days[selectedDate]?.find((x) => x.id === currentMeal.id);
                      const d = m?.dishes.find((x) => x.id === dish.id);
                      if (d) d.isVegetarian = !d.isVegetarian;
                      setMenu(updated);
                    }}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${
                      dish.isVegetarian ? 'border-emerald-600 bg-emerald-50' : 'border-red-600 bg-red-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${dish.isVegetarian ? 'bg-emerald-600' : 'bg-red-600'}`} />
                  </button>

                  <input
                    type="text"
                    value={dish.name}
                    onChange={(e) => {
                      const updated = { ...menu };
                      const m = updated.days[selectedDate]?.find((x) => x.id === currentMeal.id);
                      const d = m?.dishes.find((x) => x.id === dish.id);
                      if (d) d.name = e.target.value;
                      setMenu(updated);
                    }}
                    className="flex-1 text-sm font-semibold text-slate-800 bg-transparent focus:bg-slate-50 px-2 py-0.5 rounded-md focus:outline-hidden"
                  />

                  <select
                    value={dish.category || 'Main'}
                    onChange={(e) => {
                      const updated = { ...menu };
                      const m = updated.days[selectedDate]?.find((x) => x.id === currentMeal.id);
                      const d = m?.dishes.find((x) => x.id === dish.id);
                      if (d) d.category = e.target.value as Dish['category'];
                      setMenu(updated);
                    }}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white"
                  >
                    <option value="Main">Main Course</option>
                    <option value="Breads">Breads / Roti</option>
                    <option value="Rice">Rice</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Sides">Sides</option>
                    <option value="Salad">Salad</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteDish(dish.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete dish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Dish Form */}
          <form onSubmit={handleAddDish} className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              value={newDishName}
              onChange={(e) => setNewDishName(e.target.value)}
              placeholder="Dish name (e.g. Kadai Paneer, Roti)..."
              className="flex-1 text-xs sm:text-sm rounded-xl border border-slate-300 p-2.5 text-slate-800 bg-white focus:outline-hidden focus:border-chitkara"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dish</span>
            </button>
          </form>
        </div>
      )}

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl border border-slate-200 space-y-4">
            <h4 className="text-base font-extrabold text-slate-900">
              Copy {currentMeal?.name} to Another Day
            </h4>
            <p className="text-xs text-slate-500">
              Replicate dishes and timings from {currentMeal?.dayOfWeek} to the target day:
            </p>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Target Day:
              </label>
              <select
                value={copyTargetDate}
                onChange={(e) => setCopyTargetDate(e.target.value)}
                className="w-full p-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-800"
              >
                {availableDates.map((dStr) => (
                  <option key={dStr} value={dStr}>
                    {formatFriendlyDate(dStr)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopyMeal}
                className="flex-1 py-2 text-xs font-extrabold text-white bg-chitkara hover:bg-chitkara-dark rounded-xl"
              >
                Copy Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
