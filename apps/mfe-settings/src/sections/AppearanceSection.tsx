import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@familieoya/ui';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'familieoya_theme';

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  }
}

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system')
    return stored;
  return 'system';
}

export default function AppearanceSection() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const themes: { value: Theme; label: string; description: string }[] = [
    {
      value: 'light',
      label: 'Light',
      description: 'Always use the light theme',
    },
    { value: 'dark', label: 'Dark', description: 'Always use the dark theme' },
    {
      value: 'system',
      label: 'System',
      description: 'Follow your system preference',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Theme</p>
          <div className="flex gap-3 flex-wrap">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex flex-col gap-1 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                  theme === t.value
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-medium text-slate-900">
                  {t.label}
                </span>
                <span className="text-xs text-slate-500">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Language preference can be changed in the{' '}
            <span className="font-medium text-slate-700">Profile</span> tab.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
