import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import './MainContent.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEFAULT_CARD_IMAGE = 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80';

const normalizeImageUrl = (rawUrl) => {
  if (!rawUrl) return DEFAULT_CARD_IMAGE;
  const value = String(rawUrl).trim();
  if (!value) return DEFAULT_CARD_IMAGE;

  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) {
    return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${value}`;
  }

  if (!API_BASE_URL) return value;
  const base = API_BASE_URL.replace(/\/+$/, '');
  const path = value.replace(/^\/+/, '');
  return `${base}/${path}`;
};

const MainContent = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("Food & Dining");
  const [partners, setPartners] = useState([]);

  const categories = [
    {
      title: "Food & Dining",
      apiCategory: "Food & Dining",
    },
    {
      title: "Local Stores & Gift House",
      apiCategory: "Local Stores & Gift House",
    },
    {
      title: "Activities & Adventure",
      apiCategory: "Activities & Adventure",
    },
    {
      title: "Stay & Hotels",
      apiCategory: "Stay & Hotels",
    }
  ];

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/admin/partners`);
        setPartners(Array.isArray(response?.data) ? response.data : []);
      } catch (_error) {
        setPartners([]);
      }
    };

    fetchPartners();
    const refreshTimer = setInterval(fetchPartners, 10000);
    return () => clearInterval(refreshTimer);
  }, []);

  const visibleCategory = useMemo(
    () => categories.find((cat) => cat.title === activeCategory) || categories[0],
    [activeCategory]
  );

  const visibleItems = useMemo(() => {
    const categoryToShow = String(visibleCategory?.apiCategory || '').trim();
    return partners
      .filter((partner) => String(partner?.status || '').trim() !== 'Blocked')
      .filter((partner) => String(partner?.businessCategory || '').trim() === categoryToShow)
      .map((partner, index) => ({
        id: partner?._id || index,
        name: partner?.restaurantName || 'Partner Restaurant',
        area: partner?.area || 'Panchgani',
        img: normalizeImageUrl(partner?.imageUrl),
        discount: Number.isFinite(Number(partner?.customerDiscount))
          ? Number(partner.customerDiscount)
          : 10,
      }));
  }, [partners, visibleCategory]);

  const goToLogin = () => navigate('/login');

  return (
    <div className="mc-main-container">
      <h1 className="mc-main-top-heading">
        Lowest prices for your favorite Tripspotgos
      </h1>

      <div className="mc-tab-row">
        {categories.map((cat) => (
          <button
            key={cat.title}
            type="button"
            className={`mc-tab-btn ${activeCategory === cat.title ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.title)}
          >
            {cat.title}
          </button>
        ))}
      </div>

      <section className="mc-category-section">
        <div className="mc-section-header">
          <h2 className="mc-section-title">{visibleCategory.title}</h2>
          <button type="button" className="mc-view-all" onClick={goToLogin}>View All</button>
        </div>

        <div className="mc-sliding-row">
          {visibleItems.length > 0 ? (
            visibleItems.map((item) => (
              <div key={item.id} className="mc-deal-card" onClick={goToLogin}>
                <div className="mc-image-container">
                  <div className="mc-discount-badge">
                    <strong>{item.discount}%</strong>
                    <span>OFF</span>
                  </div>
                  <img src={item.img} alt={item.name} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_CARD_IMAGE; }} />
                </div>
                <div className="mc-card-info">
                  <h3 className="mc-item-name">{item.name}</h3>
                  <span className="mc-shop-label">
                    <span className="mc-shop-left">
                      <MapPin size={12} />
                      {item.area}
                    </span>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="mc-item-name">No partners available.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default MainContent;
