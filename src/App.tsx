import React, { useState, useEffect } from 'react';
import { WeekMenu } from '@/types/menu';
import { menuService } from '@/services/menuService';
import { syncService } from '@/services/syncService';
import { authService } from '@/services/authService';
import { getTodayIST, getWeekBoundaries } from '@/utils/dateUtils';

import { Header } from '@/components/common/Header';
import { BottomNav, NavTab } from '@/components/common/BottomNav';
import { DishSearchModal } from '@/components/student/DishSearchModal';

import { HomePage } from '@/pages/HomePage';
import { MenuPage } from '@/pages/MenuPage';
import { RatingsPage } from '@/pages/RatingsPage';
import { MorePage } from '@/pages/MorePage';
import { AdminPage } from '@/pages/AdminPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab | 'admin'>('home');
  const [targetDate, setTargetDate] = useState<string>(getTodayIST());
  const [weekMenu, setWeekMenu] = useState<WeekMenu | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Initialize network & auth listeners on launch
  useEffect(() => {
    syncService.init();
    authService.init();
  }, []);

  // Fetch initial menu and subscribe to real-time updates
  useEffect(() => {
    let isMounted = true;

    // Load initial
    menuService.getWeekMenu(targetDate).then((menu) => {
      if (isMounted) {
        setWeekMenu(menu);
        setLoading(false);
      }
    });

    // Subscribe to live changes
    const unsub = menuService.subscribeToWeekMenu(targetDate, (updatedMenu) => {
      if (isMounted) {
        setWeekMenu(updatedMenu);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [targetDate]);

  // Navigate week offset (+7 days, -7 days)
  const handleNavigateWeek = (offsetDays: number) => {
    const d = new Date(targetDate + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + offsetDays);
    const nextDate = d.toISOString().split('T')[0];
    setTargetDate(nextDate);
  };

  if (loading || !weekMenu) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-chitkara to-chitkara-dark flex items-center justify-center text-white mx-auto shadow-md animate-bounce">
            <span className="font-black text-xl">M</span>
          </div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
            MessSync
          </h2>
          <p className="text-xs text-slate-400">Loading Chitkara mess schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-red-100 selection:text-chitkara">
      {/* App Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onNavigateToAdmin={() => setActiveTab('admin')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 sm:py-6">
        {activeTab === 'home' && (
          <HomePage
            weekMenu={weekMenu}
            onNavigateToTab={(t) => setActiveTab(t)}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}

        {activeTab === 'menu' && (
          <MenuPage
            weekMenu={weekMenu}
            onOpenSearch={() => setIsSearchOpen(true)}
            onNavigateWeek={handleNavigateWeek}
          />
        )}

        {activeTab === 'ratings' && (
          <RatingsPage weekMenu={weekMenu} />
        )}

        {activeTab === 'more' && (
          <MorePage
            onOpenAdminLogin={() => setActiveTab('admin')}
            onNavigateToAdmin={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPage
            currentWeekMenu={weekMenu}
            onMenuUpdated={(updated) => setWeekMenu(updated)}
            onExitToStudent={() => setActiveTab('home')}
          />
        )}
      </main>

      {/* Fixed Mobile Bottom Navigation (Hidden on Admin screen to avoid collision) */}
      {activeTab !== 'admin' && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      )}

      {/* Dish Search Across Menu Modal */}
      <DishSearchModal
        weekMenu={weekMenu}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMeal={(date, mealId) => {
          setActiveTab('menu');
        }}
      />
    </div>
  );
};

export default App;
