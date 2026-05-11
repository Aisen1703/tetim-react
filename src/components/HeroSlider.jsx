import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:4000/api';

function getMediaUrl(url) {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return url;
}

export default function HeroSlider() {
  const [slides, setSlides] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    loadSlides();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= slides.length - 1) {
          return 0;
        }

        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [slides.length]);

  async function loadSlides() {
    try {
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
            style={{
              backgroundColor: slide.background_color || '#111111',
            }}
          >
            {slide.media_type === 'video' ? (
              <video
                src={mediaUrl}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={mediaUrl}
                alt="TETIM slide"
              />
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