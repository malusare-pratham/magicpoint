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

const toRad = (value) => (Number(value) * Math.PI) / 180;
const haversineKm = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const normalizePartnerCoords = (partner) => {
  const coords = partner?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  let [lng, lat] = coords.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    const nextLat = lng;
    const nextLng = lat;
    lat = nextLat;
    lng = nextLng;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

const MainContent = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("Food & Dining");
  const [partners, setPartners] = useState([]);
  const [coords, setCoords] = useState(null);
  const [useGps, setUseGps] = useState(true);

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
    const savedUseGps = localStorage.getItem('tsg_use_gps');
    if (savedUseGps === 'false') setUseGps(false);

    let fallbackCoords = null;
    const savedCoords = localStorage.getItem('tsg_user_coords');
    if (savedCoords) {
      try {
        const parsed = JSON.parse(savedCoords);
        if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
          fallbackCoords = { lat: parsed.lat, lng: parsed.lng };
        }
      } catch (_error) {
        // ignore
      }
    }

    if (navigator?.geolocation && savedUseGps !== 'false') {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords || {};
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            setCoords({ lat: latitude, lng: longitude });
            return;
          }
          if (fallbackCoords) setCoords(fallbackCoords);
        },
        () => {
          if (fallbackCoords) setCoords(fallbackCoords);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    } else if (fallbackCoords) {
      setCoords(fallbackCoords);
    }

    const handleLocationChange = (event) => {
      const detail = event?.detail || {};
      const nextCoords = detail.coords && Number.isFinite(detail.coords.lat) && Number.isFinite(detail.coords.lng)
        ? { lat: Number(detail.coords.lat), lng: Number(detail.coords.lng) }
        : null;
      const nextUseGps = typeof detail.useGps === 'boolean' ? detail.useGps : undefined;
      if (nextCoords) {
        setCoords(nextCoords);
      }
      if (nextUseGps !== undefined) {
        setUseGps(nextUseGps);
      }
    };

    window.addEventListener('tsg-location-change', handleLocationChange);
    return () => window.removeEventListener('tsg-location-change', handleLocationChange);
  }, []);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        if (coords) {
          const response = await axios.get(`${API_BASE_URL}/api/partners/nearby`, {
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
            params: {
              lat: coords.lat,
              lng: coords.lng,
              radius: 80000,
              _ts: Date.now()
            }
          });
          setPartners(Array.isArray(response?.data) ? response.data : []);
        } else {
          const response = await axios.get(`${API_BASE_URL}/api/admin/partners`);
          setPartners(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (_error) {
        setPartners([]);
      }
    };

    fetchPartners();
    const refreshTimer = setInterval(fetchPartners, 10000);
    return () => clearInterval(refreshTimer);
  }, [coords]);

  const visibleCategory = useMemo(
    () => categories.find((cat) => cat.title === activeCategory) || categories[0],
    [activeCategory]
  );

  const visibleItems = useMemo(() => {
    const categoryToShow = String(visibleCategory?.apiCategory || '').trim();
    return partners
      .filter((partner) => String(partner?.status || '').trim() !== 'Blocked')
      .filter((partner) => {
        if (!coords) return true;
        const partnerCoords = normalizePartnerCoords(partner);
        if (!partnerCoords) return false;
        return haversineKm(coords, partnerCoords) <= 80;
      })
      .filter((partner) => String(partner?.businessCategory || '').trim() === categoryToShow)
      .map((partner, index) => ({
        id: partner?._id || index,
        name: partner?.restaurantName || 'Partner Restaurant',
        area: partner?.area || 'Panchgani',
        img: normalizeImageUrl(partner?.imageUrl || partner?.resImage),
        discount: Number.isFinite(Number(partner?.customerDiscount))
          ? Number(partner.customerDiscount)
          : 10,
      }));
  }, [partners, visibleCategory, coords]);

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
