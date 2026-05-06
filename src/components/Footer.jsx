import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer-mega">
      <div className="container footer-mega-top">
        <div className="footer-col">
          <img
            src="/assets/logo-full-white.png"
            className="footer-logo"
            alt="TETIM"
          />
          <p>Локальный бренд одежды TETIM</p>
        </div>

        <div className="footer-col">
          <h4>Каталог</h4>
          <Link to="/catalog">Все товары</Link>
          <Link to="/catalog?category=hoodies">Худи</Link>
          <Link to="/catalog?category=tshirts">Футболки</Link>
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
          <a href="tel:+79990600075" className="footer-phone">
            +7 (999) 060-00-75
          </a>

          <div className="footer-socials">
            <a href="http://wa.me/7999060075">WA</a>
            <a href="http://max.ru/7999060075">MAX</a>
            <a href="https://instagram.com/tetim_yktbrand">IG</a>
          </div>
        </div>
      </div>


    </footer>
  );
}