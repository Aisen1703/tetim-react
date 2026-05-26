import { useEffect, useState } from 'react';

// Используем переменную окружения для адреса бэкенда
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Если URL начинается с /uploads, то это относительный путь к файлам на бэкенде
  if (url.startsWith('/uploads')) return `${API_URL}${url}`;
  return url;
}

export default function HeroSlider() {
  const [slides, setSlides] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    loadSlides();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev >= slides.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  async function loadSlides() {
    try {
      // Запрос к публичному API слайдов
      const response = await fetch(`${API_URL}/public/slides`);
      const data = await response.json();
      if (response.ok) {
        setSlides(data.slides || []);
      } else {
        setSlides([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки слайдов:', error);
      setSlides([]);
    }
  }

  if (slides.length === 0) {
    return (
      <div className="hero-slider hero-slider-empty">
        <span>Слайды пока не добавлены</span>
      </div>
    );
  }

  return (
    <div className="hero-slider">
      {slides.map((slide, index) => {
        const mediaUrl = getMediaUrl(slide.image_url);
        const isActive = index === activeIndex;
        return (
          <div
            key={slide.id}
            className={`hero-slide ${isActive ? 'active' : ''}`}
            style={{ backgroundColor: slide.background_color || '#111111' }}
          >
            {slide.media_type === 'video' ? (
              <video src={mediaUrl} autoPlay muted loop playsInline />
            ) : (
              <img src={mediaUrl} alt={slide.title || 'TETIM slide'} />
            )}
          </div>
        );
      })}
      {slides.length > 1 && (
        <div className="hero-slider-dots">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={index === activeIndex ? 'active' : ''}
              onClick={() => setActiveIndex(index)}
              aria-label={`Слайд ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}