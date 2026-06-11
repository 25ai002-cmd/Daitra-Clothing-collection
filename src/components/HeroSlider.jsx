import React, { useState, useEffect } from 'react';

const SLIDES = [
  {
    image: "/assets/banner_festive.png",
    title: "Navy Anarkali Zari Gown",
    subtitle: "DAITRA COUTURE EDIT",
    tagline: "Majestic navy Anarkali gown with a rich gold zari border and an exquisite Banarasi-weave dupatta.",
    btnText: "Explore Kurtas & Sets",
    category: "kurtas"
  },
  {
    image: "/assets/banner_gowns.png",
    title: "Midnight Navy Zari Anarkali",
    subtitle: "THE GOWNS COLLECTION",
    tagline: "The crown jewel of Daitra's collection — a floor-length georgette Anarkali with gold zari embroidery.",
    btnText: "Discover Gowns",
    category: "gowns"
  },
  {
    image: "/assets/banner_fusion.png",
    title: "Sage Green Embroidered Coord Set",
    subtitle: "INDO-WESTERN FUSION",
    tagline: "Earthy sage green button-down shirt set with floral embroidered patch pockets and straight-cut pants.",
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
