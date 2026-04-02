import '../styles.css';
import { useState } from 'react';
import ProfileSection from '../sections/ProfileSection';
import SecuritySection from '../sections/SecuritySection';
import AppearanceSection from '../sections/AppearanceSection';
import ActivitySection from '../sections/ActivitySection';
import PrivacySection from '../sections/PrivacySection';

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
      <h1 className="text-2xl font-semibold dark:text-slate-100">Settings</h1>

      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'security' && <SecuritySection />}
        {activeTab === 'appearance' && <AppearanceSection />}
        {activeTab === 'activity' && <ActivitySection />}
        {activeTab === 'privacy' && <PrivacySection />}
      </div>
    </div>
  );
}
