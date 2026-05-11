import { Link } from 'react-router-dom';

import useSiteSettings from '../hooks/useSiteSettings.js';

export default function Footer() {
  const settings = useSiteSettings();

  const phoneHref = settings.phone
    ? `tel:${settings.phone.replace(/[^\d+]/g, '')}`
    : '';

  return (
    <footer className="footer-mega">
      <div className="container footer-mega-top">
        <div className="footer-col">
          <img
            src={
              settings.logo_white_url ||
              settings.logo_url ||
              '/assets/logo-full-white.png'
            }
            className="footer-logo"
            alt={settings.site_title || 'TETIM'}
          />

          <p>{settings.footer_text || 'Локальный бренд одежды TETIM'}</p>
        </div>

        <div className="footer-col">
          <h4>Каталог</h4>
          <Link to="/catalog">Все товары</Link>
          <Link to="/catalog?category=sweatshirts">Худи</Link>
          <Link to="/catalog?category=tshirts-longsleeves">Футболки</Link>
          <Link to="/catalog?category=jackets">Куртки</Link>
        </div>

        <div className="footer-col">
          <h4>Информация</h4>
          <a href="#">Доставка</a>
          <a href="#">Оплата</a>
          <a href="#">Возврат</a>
        </div>

        <div className="footer-col footer-col-wide">
          <h4>Контакты</h4>

          {settings.phone && (
            <a href={phoneHref} className="footer-phone">
              {settings.phone}
            </a>
          )}

          {settings.email && (
            <a href={`mailto:${settings.email}`}>
              {settings.email}
            </a>
          )}

          {settings.address && <span>{settings.address}</span>}

          <div className="footer-socials">
            {settings.whatsapp_url && (
              <a
                href={settings.whatsapp_url}
                target="_blank"
                rel="noreferrer"
              >
                WA
              </a>
            )}

            {settings.telegram_url && (
              <a
                href={settings.telegram_url}
                target="_blank"
                rel="noreferrer"
              >
                TG
              </a>
            )}

            {settings.instagram_url && (
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noreferrer"
              >
                IG
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}