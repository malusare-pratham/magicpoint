import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import './MainContent.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEFAULT_CARD_IMAGE = 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80';
const CITY_OPTIONS = [
  { label: "Panchgani", value: "Panchgani", lat: 17.9237, lng: 73.8007 },
  { label: "Mahabaleshwar", value: "Mahabaleshwar", lat: 17.9237, lng: 73.6586 },
];

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

const formatDistanceLabel = (value) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  const rounded = Math.round(num * 10) / 10;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label} km`;
};

const normalizeCategory = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getCanonicalCategory = (value) => {
  const key = normalizeCategory(value);
  if (!key) return '';

  const directMap = {
    'food dining': 'Food & Dining',
    'food and dining': 'Food & Dining',
    'dining': 'Food & Dining',
    'restaurant': 'Food & Dining',
    'restaurants': 'Food & Dining',
    'local stores gift house': 'Local Stores & Gift House',
    'local store gift house': 'Local Stores & Gift House',
    'local stores and gift house': 'Local Stores & Gift House',
    'local store and gift house': 'Local Stores & Gift House',
    'stores': 'Local Stores & Gift House',
    'store': 'Local Stores & Gift House',
    'shops': 'Local Stores & Gift House',
    'shop': 'Local Stores & Gift House',
    'activities adventure': 'Activities & Adventure',
    'activities and adventure': 'Activities & Adventure',
    'activity': 'Activities & Adventure',
    'adventure': 'Activities & Adventure',
    'stay hotels': 'Stay & Hotels',
    'stay and hotels': 'Stay & Hotels',
    'hotel': 'Stay & Hotels',
    'hotels': 'Stay & Hotels',
    'stay': 'Stay & Hotels',
    'resort': 'Stay & Hotels',
    'resorts': 'Stay & Hotels',
    'villa': 'Stay & Hotels',
    'villas': 'Stay & Hotels'
  };

  if (directMap[key]) return directMap[key];
  if (key.includes('food') || key.includes('dining') || key.includes('restaurant')) return 'Food & Dining';
  if (key.includes('store') || key.includes('shop') || key.includes('gift')) return 'Local Stores & Gift House';
  if (key.includes('activity') || key.includes('adventure') || key.includes('experience')) return 'Activities & Adventure';
  if (key.includes('stay') || key.includes('hotel') || key.includes('resort') || key.includes('villa')) return 'Stay & Hotels';
  return '';
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

    if (!fallbackCoords) {
      const savedCity = localStorage.getItem('tsg_selected_city');
      const match = CITY_OPTIONS.find((city) => city.value === savedCity);
      if (match) {
        fallbackCoords = { lat: match.lat, lng: match.lng };
      }
    }

    if (navigator?.geolocation && savedUseGps !== 'false') {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords || {};
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            setCoords({ lat: latitude, lng: longitude });
            localStorage.setItem('tsg_user_coords', JSON.stringify({ lat: latitude, lng: longitude }));
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
      const nextCity = String(detail.city || '').trim();
      const nextUseGps = typeof detail.useGps === 'boolean' ? detail.useGps : undefined;
      if (nextCoords) {
        setCoords(nextCoords);
        localStorage.setItem('tsg_user_coords', JSON.stringify(nextCoords));
      }
      if (nextCity) {
        localStorage.setItem('tsg_selected_city', nextCity);
      }
      if (nextUseGps !== undefined) {
        setUseGps(nextUseGps);
        localStorage.setItem('tsg_use_gps', String(nextUseGps));
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
    const activeKey = normalizeCategory(categoryToShow);
    return partners
      .filter((partner) => String(partner?.status || '').trim() !== 'Blocked')
      .filter((partner) => {
        if (!coords) return true;
        if (partner?.distance) return true;
        const partnerCoords = normalizePartnerCoords(partner);
        if (!partnerCoords) return true;
        return haversineKm(coords, partnerCoords) <= 80;
      })
      .filter((partner) => {
        const canonical = getCanonicalCategory(partner?.businessCategory || '');
        const partnerKey = normalizeCategory(canonical || partner?.businessCategory || '');
        return partnerKey === activeKey;
      })
      .map((partner, index) => {
        const parsedDistance = typeof partner?.distance === 'string'
          ? Number.parseFloat(partner.distance)
          : Number(partner?.distance);
        const partnerCoords = coords ? normalizePartnerCoords(partner) : null;
        const distanceKm = Number.isFinite(parsedDistance)
          ? parsedDistance
          : coords && partnerCoords
            ? haversineKm(coords, partnerCoords)
            : Number.POSITIVE_INFINITY;
        return {
          id: partner?._id || index,
          name: partner?.restaurantName || 'Partner Restaurant',
          area: partner?.area || 'Panchgani',
          img: normalizeImageUrl(partner?.imageUrl || partner?.resImage),
          discount: Number.isFinite(Number(partner?.customerDiscount))
            ? Number(partner.customerDiscount)
            : 10,
          distanceKm,
          distanceLabel: formatDistanceLabel(partner?.distance || distanceKm),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      ;
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
                    {item.distanceLabel && (
                      <span className="mc-distance">{item.distanceLabel}</span>
                    )}
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
