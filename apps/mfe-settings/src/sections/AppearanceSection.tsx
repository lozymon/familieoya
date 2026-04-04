import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@familieoya/ui';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'familieoya_theme';

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
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

const themes: { value: Theme; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use the light theme' },
  { value: 'dark', label: 'Dark', description: 'Always use the dark theme' },
  {
    value: 'system',
    label: 'System',
    description: 'Follow your system preference',
  },
];

export default function AppearanceSection() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appearance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Theme
          </p>
          <div className="flex flex-wrap gap-3">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'flex flex-col gap-1 rounded-lg border-2 px-4 py-3 text-left transition-colors',
                  theme === t.value
                    ? 'border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600',
                )}
              >
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {t.label}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Language preference can be changed in the{' '}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Profile
            </span>{' '}
            tab.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
