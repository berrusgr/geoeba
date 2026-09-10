'use client';

import React, { createContext, useContext, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * LocalStorage anahtarı. Aynı anahtar, ilk boyamadan önce çalışan
 * src/app/layout.tsx içindeki engelleyici <script> tarafından da okunur.
 */
export const THEME_STORAGE_KEY = 'matematik_tema_tercihi_v1';

const DEFAULT_THEME: Theme = 'light';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * localStorage'a yazılamadığında (gizli sekme, dolu kota, depolama engeli) kullanılan
 * bellek içi yedek. Kalıcı yazma başarılı olduğunda null'a döner ve tek gerçek kaynak
 * yine localStorage olur.
 */
let memoryTheme: Theme | null = null;

/** Kayıtlı tema tercihini okur (istemci tarafı; sunucuda varsayılan). */
function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  // Kalıcı kayıt yapılamadıysa bellekteki tercih önceliklidir; aksi halde
  // okuma başarılı olup eski değeri döndürdüğü için arayüz hiç güncellenmez.
  if (memoryTheme) return memoryTheme;
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

// --- Tema tercihi için harici depo (useSyncExternalStore) ---------------------
// Sunucu anlık görüntüsü her zaman varsayılan temadır; istemci hidrasyondan sonra
// kayıtlı tercihe geçer. Böylece hidrasyon uyuşmazlığı oluşmaz ve efekt içinde
// setState kullanılmaz.
const themeListeners = new Set<() => void>();

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY) return;
    // Başka bir sekme kalıcı olarak yazabildiyse bellek yedeği geçersizdir.
    memoryTheme = null;
    callback();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    themeListeners.delete(callback);
    window.removeEventListener('storage', onStorage);
  };
}

function notifyThemeListeners() {
  themeListeners.forEach((cb) => cb());
}

// --- Sistem tercihi (prefers-color-scheme) için harici depo -------------------
function subscribeSystemDark(callback: () => void) {
  const mql = window.matchMedia(DARK_MEDIA_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSystemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_MEDIA_QUERY).matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readStoredTheme, () => DEFAULT_THEME);
  const systemDark = useSyncExternalStore(subscribeSystemDark, getSystemDark, () => false);

  const isDark = useMemo(
    () => theme === 'dark' || (theme === 'system' && systemDark),
    [theme, systemDark]
  );

  // Etkin temayı <html> sınıfına yansıt (ilk boyama layout.tsx'teki script ile yapılır)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const setTheme = useCallback((newTheme: Theme) => {
    // Önce belleğe yaz: kalıcı kayıt başarısız olsa bile tema anında değişsin.
    memoryTheme = newTheme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      memoryTheme = null;
    } catch (e) {
      console.warn('Tema tercihi kaydedilemedi, yalnızca bu oturumda geçerli:', e);
    }
    notifyThemeListeners();
  }, []);

  const value = useMemo(() => ({ theme, setTheme, isDark }), [theme, setTheme, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme, ThemeProvider içinde kullanılmalıdır.');
  }
  return context;
}
