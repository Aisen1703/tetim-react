import { useEffect, useState } from 'react';

const fallbackSlides = [
  {
    image_url: '/assets/afisha1.jpg',
    media_type: 'image',
    background_color: '#d8c900',
  },
  {
    image_url: '/assets/afisha2.jpg',
    media_type: 'image',
    background_color: '#4aa7d8',
  },
  {
    image_url: '/assets/afisha3.jpg',
    media_type: 'image',
    background_color: '#d88422',
  },
];

export default function HeroSlider() {
  const [slides, setSlides] = useState(fallbackSlides);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    loadSlides();
  }, []);

  useEffect(() => {
    if (!slides.length) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides]);

  async function loadSlides() {
    try {
      const response = await fetch('http://localhost:4000/api/public/slides');
      const data = await response.json();

      if (response.ok && data.slides?.length >= 3) {
        setSlides(data.slides.slice(0, 10));
      }
    } catch {
      setSlides(fallbackSlides);
    }
  }

  function nextSlide() {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }

  function prevSlide() {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }

  const activeSlide = slides[currentSlide];

  return (
    <div
      className="hero-large-image hero-slider"
      style={{ background: activeSlide.background_color || '#d8c900' }}
    >
      <div className="hero-slides">
        {slides.map((slide, index) => (
          <div
            key={slide.id || slide.image_url}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
          >
            {slide.media_type === 'video' ? (
              <video
                src={slide.image_url}
                className="hero-slide-video"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={slide.image_url}
                alt={slide.title || `TETIM слайд ${index + 1}`}
              />
            )}
          </div>
        ))}
      </div>

      <button
        className="hero-arrow hero-arrow-prev"
        type="button"
        onClick={prevSlide}
      >
        ‹
      </button>

      <button
        className="hero-arrow hero-arrow-next"
        type="button"
        onClick={nextSlide}
      >
        ›
      </button>

      <div className="hero-slider-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
            type="button"
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}