import { useState, useEffect } from 'react';

export const getTheme = () => {
  try {
    return localStorage.getItem('theme') || 'system';
  } catch {
    return 'system';
  }
};

export const applyTheme = (themeName) => {
  if (typeof window === 'undefined') return;
  const current = themeName || getTheme();
  let isDark = false;
  if (current === 'dark') {
    isDark = true;
  } else if (current === 'system') {
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    isDark = false;
  }

  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
  return isDark;
};

export const setTheme = (newTheme) => {
  try {
    localStorage.setItem('theme', newTheme);
  } catch {}
  applyTheme(newTheme);
  window.dispatchEvent(new CustomEvent('hk_theme_changed', { detail: { theme: newTheme } }));
  window.dispatchEvent(new Event('theme_changed'));
};

export const initTheme = () => {
  if (typeof window === 'undefined') return;
  applyTheme();

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (getTheme() === 'system') {
        applyTheme('system');
      }
    };
    try {
      mq.addEventListener('change', handleChange);
    } catch {
      mq.addListener(handleChange);
    }
  }
};

export function useTheme() {
  const [theme, setLocalTheme] = useState(() => getTheme());

  useEffect(() => {
    const handleUpdate = () => {
      setLocalTheme(getTheme());
    };
    window.addEventListener('hk_theme_changed', handleUpdate);
    window.addEventListener('theme_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('hk_theme_changed', handleUpdate);
      window.removeEventListener('theme_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    setLocalTheme(newTheme);
  };

  return { theme, setTheme: changeTheme };
}
