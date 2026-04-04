import '../styles.css';
import { useState } from 'react';
import ProfileSection from '../sections/ProfileSection';
import SecuritySection from '../sections/SecuritySection';
import AppearanceSection from '../sections/AppearanceSection';
import ActivitySection from '../sections/ActivitySection';
import PrivacySection from '../sections/PrivacySection';
import { cn } from '@familieoya/ui';

type Tab = 'profile' | 'security' | 'appearance' | 'activity' | 'privacy';

const tabs: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'activity', label: 'Activity' },
  { id: 'privacy', label: 'Privacy' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Settings
      </h1>

      <div className="flex gap-8">
        {/* Sidebar tab list */}
        <nav className="flex w-44 shrink-0 flex-col gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-l-2 border-emerald-600 bg-white pl-[10px] text-emerald-700 dark:border-emerald-500 dark:bg-zinc-800 dark:text-emerald-400'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {activeTab === 'profile' && <ProfileSection />}
          {activeTab === 'security' && <SecuritySection />}
          {activeTab === 'appearance' && <AppearanceSection />}
          {activeTab === 'activity' && <ActivitySection />}
          {activeTab === 'privacy' && <PrivacySection />}
        </div>
      </div>
    </div>
  );
}
