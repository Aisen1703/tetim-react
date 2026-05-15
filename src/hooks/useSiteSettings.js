import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:4000/api';

const defaultSettings = {
  site_title: 'TETIM',
  logo_url: '/assets/logo-full.png',
  logo_white_url: '/assets/logo-full-white.png',

  site_theme: 'auto',
  holiday_theme_enabled: '1',

  header_ornament_url: '/assets/sakha-ornament.png',
  background_pattern_url: '',
  decor_image_url: '',
  snow_enabled: '0',

  newyear_theme_start: '2026-01-01',
  newyear_theme_end: '2026-01-08',

  defender_theme_start: '2026-02-23',
  defender_theme_end: '2026-02-23',

  womens_theme_start: '2026-03-08',
  womens_theme_end: '2026-03-08',

  republic_theme_start: '2026-04-27',
  republic_theme_end: '2026-04-27',

  ysyakh_theme_start: '2026-06-21',
  ysyakh_theme_end: '2026-06-21',

  statehood_theme_start: '2026-09-27',
  statehood_theme_end: '2026-09-27',

  hero_badge: 'Новая коллекция',
  hero_title: 'Одежда с характером Севера',
  hero_text:
    'Создаём одежду для города, спорта и активной жизни — с вниманием к деталям, комфорту и северному характеру.',
  hero_button_primary: 'Каталог',
  hero_button_secondary: 'Индивидуальный заказ',

  footer_text: '© 2026 TETIM. Все права защищены.',
  phone: '+7 999 060 00 75',
  email: 'info@tetim.ru',
  address: 'Якутск',

  telegram_url: '',
  whatsapp_url: '',
  instagram_url: '',

  accent_color: '#111111',
  background_color: '#f4f0e8',
};

function isDateBetween(today, start, end) {
  if (!start || !end) {
    return false;
  }

  return today >= start && today <= end;
}

function getAutoTheme(settings) {
  if (String(settings.holiday_theme_enabled) !== '1') {
    return settings.site_theme === 'auto'
      ? 'sakha'
      : settings.site_theme || 'sakha';
  }

  const today = new Date().toISOString().slice(0, 10);

  if (
    isDateBetween(
      today,
      settings.newyear_theme_start,
      settings.newyear_theme_end
    )
  ) {
    return 'newyear';
  }

  if (
    isDateBetween(
      today,
      settings.defender_theme_start,
      settings.defender_theme_end
    )
  ) {
    return 'defender';
  }

  if (
    isDateBetween(today, settings.womens_theme_start, settings.womens_theme_end)
  ) {
    return 'womens';
  }

  if (
    isDateBetween(
      today,
      settings.republic_theme_start,
      settings.republic_theme_end
    )
  ) {
    return 'sakha-republic';
  }

  if (
    isDateBetween(today, settings.ysyakh_theme_start, settings.ysyakh_theme_end)
  ) {
    return 'ysyakh';
  }

  if (
    isDateBetween(
      today,
      settings.statehood_theme_start,
      settings.statehood_theme_end
    )
  ) {
    return 'sakha-statehood';
  }

  if (settings.site_theme === 'auto') {
    return 'sakha';
  }

  return settings.site_theme || 'sakha';
}

export default function useSiteSettings() {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const activeTheme = getAutoTheme(settings);

    document.body.classList.remove(
      'theme-default',
      'theme-sakha',
      'theme-newyear',
      'theme-defender',
      'theme-womens',
      'theme-sakha-republic',
      'theme-ysyakh',
      'theme-sakha-statehood',
      'snow-enabled'
    );

    document.body.classList.add(`theme-${activeTheme}`);

    if (activeTheme === 'newyear' && String(settings.snow_enabled) === '1') {
      document.body.classList.add('snow-enabled');
    }

    document.body.style.setProperty(
      '--site-pattern',
      settings.background_pattern_url
        ? `url("${settings.background_pattern_url}")`
        : 'none'
    );

    document.body.style.setProperty(
      '--decor-image',
      settings.decor_image_url
        ? `url("${settings.decor_image_url}")`
        : 'none'
    );
  }, [settings]);

  async function loadSettings() {
    try {
      const response = await fetch(`${API_URL}/public/settings`);
      const data = await response.json();

      if (response.ok) {
        setSettings({
          ...defaultSettings,
          ...(data.settings || {}),
        });
      }
    } catch {
      setSettings(defaultSettings);
    }
  }

  return settings;
}