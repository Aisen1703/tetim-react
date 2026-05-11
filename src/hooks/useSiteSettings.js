import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:4000/api';

const defaultSettings = {
  site_title: 'TETIM',
  logo_url: '/assets/logo-full.png',
  logo_white_url: '/assets/logo-full-white.png',
  hero_badge: 'Новая коллекция',
  hero_title: 'Функциональная одежда для города, спорта и outdoor',
  hero_text:
    'Структура сайта как у большого интернет-магазина: удобный каталог, отдельная корзина, подборки и категории.',
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

export default function useSiteSettings() {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

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