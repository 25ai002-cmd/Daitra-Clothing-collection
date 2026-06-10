import React, { useState, useEffect } from 'react';

const SLIDES = [
  {
    image: "/dresses/60.jpg",
    title: "Festive Splendor",
    subtitle: "DAITRA COUTURE EDIT 2026",
    tagline: "Embrace the timeless beauty of hand-embroidered silks designed to make every occasion unforgettable.",
    btnText: "Explore Kurtas & Sets",
    category: "kurtas"
  },
  {
    image: "/dresses/66.jpg",
    title: "Ethnic Grace",
    subtitle: "THE GOWNS COLLECTION",
    tagline: "Experience modern elegance in flared georgettes and weaves that sweep the floor with royal vibes.",
    btnText: "Discover Gowns",
    category: "gowns"
  },
  {
    image: "/dresses/20.jpg",
    title: "Modern Heritage",
    subtitle: "INDO-WESTERN FUSION",
    tagline: "Chic coord sets designed for the modern woman who values tradition, craftsmanship, and comfort.",
    btnText: "Shop Fusion Wear",
    category: "fusion"
  }
];

export default function HeroSlider({ onShopClick }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero-slider">
      {SLIDES.map((slide, idx) => (
        <div 
          key={idx} 
          className={`hero-slide ${idx === current ? 'active' : ''}`}
          style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.65)), url(${slide.image})` }}
        >
          <div className="hero-content">
            <span className="hero-subtitle">{slide.subtitle}</span>
            <h1 className="hero-title">{slide.title}</h1>
            <p className="hero-tagline">{slide.tagline}</p>
            <button 
              className="btn btn-gold hero-cta"
              onClick={() => onShopClick(slide.category)}
            >
              {slide.btnText}
            </button>
          </div>
        </div>
      ))}
      
      {/* Slider Controls */}
      <div className="slider-dots">
        {SLIDES.map((_, idx) => (
          <button 
            key={idx} 
            className={`slider-dot ${idx === current ? 'active' : ''}`}
            onClick={() => setCurrent(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
