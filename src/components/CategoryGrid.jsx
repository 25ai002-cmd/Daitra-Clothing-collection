import React from 'react';

const CATEGORIES = [
  {
    id: 'kurtas',
    name: "Kurtas & Sets",
    tagline: "Intricate Silks & Block Prints",
    image: "/assets/banner_festive.png"
  },
  {
    id: 'gowns',
    name: "Ethnic Gowns",
    tagline: "Flowing Georgettes & Glimmer",
    image: "/assets/banner_gowns.png"
  },
  {
    id: 'fusion',
    name: "Fusion Wear",
    tagline: "Modern Cuts meets Indian Motifs",
    image: "/assets/banner_fusion.png"
  }
];

export default function CategoryGrid({ onCategorySelect }) {
  return (
    <section className="category-section">
      <div className="section-header-center">
        <span className="section-subtitle">THE COLLECTIONS</span>
        <h2 className="section-title">Shop by Category</h2>
        <div className="section-divider"></div>
      </div>
      
      <div className="category-grid">
        {CATEGORIES.map((cat) => (
          <div 
            key={cat.id} 
            className="category-card"
            onClick={() => onCategorySelect(cat.id)}
          >
            <div className="category-img-wrapper">
              <img src={cat.image} alt={cat.name} className="category-img" />
              <div className="category-overlay"></div>
            </div>
            <div className="category-info">
              <span className="category-tagline">{cat.tagline}</span>
              <h3 className="category-name">{cat.name}</h3>
              <span className="category-cta-link">Explore Now &rarr;</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
