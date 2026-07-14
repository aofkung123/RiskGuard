'use client';

import { useServerInsertedHTML } from 'next/navigation';

export default function ThemeScript() {
  useServerInsertedHTML(() => {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var migrated = localStorage.getItem('riskguard-theme-v2');
                var saved = localStorage.getItem('theme');
                var theme = migrated ? (saved || 'light') : 'light';
                if (!migrated) {
                  localStorage.setItem('theme', 'light');
                  localStorage.setItem('riskguard-theme-v2', '1');
                }
                document.documentElement.setAttribute('data-theme', theme);
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();
          `,
        }}
      />
    );
  });

  return null;
}
