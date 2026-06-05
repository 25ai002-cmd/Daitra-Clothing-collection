import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Check, Calendar, AlertCircle } from 'lucide-react';
import { db } from '../utils/db';

export default function ReviewPortal() {
  const [reviews, setReviews] = useState([]);
  const [writeMode, setWriteMode] = useState(false);
  const [newReview, setNewReview] = useState({ name: '', rating: 5, comment: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const loadReviews = async () => {
      const data = await db.getReviews();
      setReviews(data.filter(r => !r.productId));
    };
    loadReviews();
  }, []);

  const handleStarClick = (ratingValue) => {
    setNewReview(prev => ({ ...prev, rating: ratingValue }));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.comment.trim()) {
      setValidationError('Please fill in both name and review comment.');
      return;
    }
    setValidationError('');

    const reviewObject = {
      id: Date.now(),
      name: newReview.name,
      rating: newReview.rating,
      date: "Just now",
      comment: newReview.comment,
      ownerReply: null,
      verified: false,
      productId: null
    };

    await db.saveReview(reviewObject);
    const updatedReviews = await db.getReviews();
    setReviews(updatedReviews.filter(r => !r.productId));

    setNewReview({ name: '', rating: 5, comment: '' });
    setSuccessMsg('Thank you! Your review has been added successfully.');
    setWriteMode(false);

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Calculations
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";

  return (
    <section id="reviews-section" className="reviews-section">
      <div className="section-header-center">
        <span className="section-subtitle">TESTIMONIALS</span>
        <h2 className="section-title">What Our Customers Say</h2>
        <div className="section-divider"></div>
      </div>

      <div className="reviews-container">
        {/* Review Summary Scoreboard */}
        <div className="reviews-summary-card">
          <div className="rating-score-block">
            <span className="score-big">{averageRating}</span>
            <div className="stars-wrapper">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} fill="var(--primary-gold)" stroke="var(--primary-gold)" />
              ))}
            </div>
            <span className="reviews-total-count">Based on {reviews.length} verified reviews</span>
          </div>

          <div className="rating-bars-block">
            <div className="rating-bar-row">
              <span>5 ★</span>
              <div className="bar-bg"><div className="bar-fill" style={{ width: '100%' }}></div></div>
              <span>{reviews.filter(r => r.rating === 5).length}</span>
            </div>
            <div className="rating-bar-row">
              <span>4 ★</span>
              <div className="bar-bg"><div className="bar-fill" style={{ width: `${(reviews.filter(r => r.rating === 4).length / reviews.length) * 100}%` }}></div></div>
              <span>{reviews.filter(r => r.rating === 4).length}</span>
            </div>
            <div className="rating-bar-row">
              <span>3 ★</span>
              <div className="bar-bg"><div className="bar-fill" style={{ width: '0%' }}></div></div>
              <span>0</span>
            </div>
            <div className="rating-bar-row">
              <span>2 ★</span>
              <div className="bar-bg"><div className="bar-fill" style={{ width: '0%' }}></div></div>
              <span>0</span>
            </div>
            <div className="rating-bar-row">
              <span>1 ★</span>
              <div className="bar-bg"><div className="bar-fill" style={{ width: '0%' }}></div></div>
              <span>0</span>
            </div>
          </div>

          <div className="reviews-actions">
            {!writeMode ? (
              <button className="btn btn-gold write-review-btn" onClick={() => setWriteMode(true)}>
                <MessageSquare size={16} />
                <span>WRITE A REVIEW</span>
              </button>
            ) : (
              <button className="btn btn-dark write-review-btn" onClick={() => setWriteMode(false)}>
                <span>CANCEL REVIEW</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="review-success-alert">
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Write Review Form */}
        {writeMode && (
          <form className="write-review-form active" onSubmit={handleReviewSubmit}>
            <h3>Write a Customer Review</h3>
            
            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="e.g. ARTI GUPTA"
                value={newReview.name}
                onChange={(e) => setNewReview(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>Select Rating</label>
              <div className="rating-selector-stars">
                {[1, 2, 3, 4, 5].map((starNum) => (
                  <button
                    key={starNum}
                    type="button"
                    className={`star-select-btn ${newReview.rating >= starNum ? 'active' : ''}`}
                    onClick={() => handleStarClick(starNum)}
                  >
                    <Star size={24} fill={newReview.rating >= starNum ? "var(--primary-gold)" : "transparent"} stroke="var(--primary-gold)" />
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Review Comment</label>
              <textarea
                placeholder="Describe your shopping experience, material quality, and staff response..."
                rows="4"
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                required
              />
            </div>

            {validationError && (
              <div className="review-validation-error-card">
                <AlertCircle size={16} />
                <span>{validationError}</span>
              </div>
            )}

            <button type="submit" className="btn btn-gold submit-review-btn">
              SUBMIT REVIEW
            </button>
          </form>
        )}

        {/* Reviews List */}
        <div className="reviews-list">
          {reviews.map((rev) => (
            <div key={rev.id} className="review-card">
              <div className="review-header">
                <div className="reviewer-avatar">
                  {rev.name.charAt(0).toUpperCase()}
                </div>
                <div className="reviewer-info">
                  <div className="reviewer-name-row">
                    <h4>{rev.name}</h4>
                    {rev.verified && <span className="verified-badge">Verified Customer</span>}
                  </div>
                  <div className="review-meta-row">
                    <div className="stars-small">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < rev.rating ? "var(--primary-gold)" : "transparent"} stroke="var(--primary-gold)" />
                      ))}
                    </div>
                    <span className="review-date">
                      <Calendar size={12} />
                      {rev.date}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="review-comment">"{rev.comment}"</p>

              {/* Owner Response Box */}
              {rev.ownerReply && (
                <div className="owner-reply-box">
                  <div className="reply-header">
                    <strong>Response from the owner</strong>
                    <span>a week ago</span>
                  </div>
                  <p>"{rev.ownerReply}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
