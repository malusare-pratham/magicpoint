import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import './RestaurantPagelist.css';
import Navbar from '../Navbar/Navbar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEFAULT_RESTAURANT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

const normalizeImageUrl = (rawUrl) => {
  if (!rawUrl) return DEFAULT_RESTAURANT_IMAGE;
  const value = String(rawUrl).trim();
  if (!value) return DEFAULT_RESTAURANT_IMAGE;

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

const formatDistanceKm = (km) => {
  if (!Number.isFinite(km)) return null;
  const rounded = Math.round(km * 10) / 10;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label} km`;
};

const RestaurantPagelist = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [partners, setPartners] = useState([]);
  const [partnerInfoById, setPartnerInfoById] = useState({});
  const [reviewStatsById, setReviewStatsById] = useState({});
  const [coords, setCoords] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    rating45: false,
    petFriendly: false,
    outdoorSeating: false,
    vegOnly: false,
    nonVegOnly: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const reviewStatsRef = React.useRef({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const savedCoords = localStorage.getItem('tsg_user_coords');
    if (savedCoords) {
      try {
        const parsed = JSON.parse(savedCoords);
        if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
          setCoords({ lat: parsed.lat, lng: parsed.lng });
          return;
        }
      } catch (_error) {
        // ignore
      }
    }

    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          const nextCoords = { lat: latitude, lng: longitude };
          setCoords(nextCoords);
          localStorage.setItem('tsg_user_coords', JSON.stringify(nextCoords));
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchPartnerInfo = async () => {
      const partnerIds = partners
        .map((partner) => String(partner?._id || '').trim())
        .filter(Boolean);

      if (!partnerIds.length) {
        if (isMounted) setPartnerInfoById({});
        return;
      }

      const responses = await Promise.all(
        partnerIds.map(async (partnerId) => {
          try {
            const res = await axios.get(`${API_BASE_URL}/api/admin/partner-info/${partnerId}`);
            return [partnerId, res?.data?.data || null];
          } catch (_error) {
            return [partnerId, null];
          }
        })
      );

      if (!isMounted) return;
      setPartnerInfoById(Object.fromEntries(responses));
    };

    fetchPartnerInfo();
    return () => {
      isMounted = false;
    };
  }, [partners]);

  useEffect(() => {
    let isMounted = true;
    const partnerIds = partners
      .map((partner) => String(partner?._id || '').trim())
      .filter(Boolean);

    const missingIds = partnerIds.filter((id) => !reviewStatsRef.current[id]);
    if (!missingIds.length) return;

    const fetchReviews = async () => {
      const entries = await Promise.all(
        missingIds.map(async (partnerId) => {
          try {
            const res = await axios.get(`${API_BASE_URL}/api/restaurants/${partnerId}/reviews`);
            const list = Array.isArray(res?.data?.data) ? res.data.data : [];
            const avg = list.length
              ? list.reduce((sum, item) => sum + Number(item?.rating || 0), 0) / list.length
              : null;
            return [partnerId, { avg, count: list.length }];
          } catch (_error) {
            return [partnerId, { avg: null, count: 0 }];
          }
        })
      );

      if (!isMounted) return;
      const next = { ...reviewStatsRef.current, ...Object.fromEntries(entries) };
      reviewStatsRef.current = next;
      setReviewStatsById(next);
    };

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [partners]);

  const categoryParam = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const raw = params.get('category');
    return raw ? decodeURIComponent(raw) : '';
  }, [location.search]);

  const queryParam = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const raw = params.get('q');
    return raw ? decodeURIComponent(raw) : '';
  }, [location.search]);

  useEffect(() => {
    if (queryParam) {
      setSearchTerm(queryParam);
    }
  }, [queryParam]);

  const normalizeCategory = (value) => String(value || '').trim().toLowerCase();

  const effectiveCategory = useMemo(() => {
    const category = String(categoryParam || '').trim();
    return category || 'Food & Dining';
  }, [categoryParam]);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        if (coords) {
          const response = await axios.get(`${API_BASE_URL}/api/partners/nearby`, {
            params: {
              lat: coords.lat,
              lng: coords.lng,
              radius: 80000,
              category: effectiveCategory
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
  }, [coords, effectiveCategory]);

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth <= 500);
    };
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  const isAuthenticated = Boolean(localStorage.getItem('authToken'));

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/');
  };

  const pageLabels = useMemo(() => {
    const category = String(effectiveCategory || '').trim();
    if (!category) {
      return {
        title: 'Restaurants Near You',
        subtitle: 'Discover great food spots around your location.',
        cta: 'Check out all the restaurants',
        searchPlaceholder: 'Search restaurants...'
      };
    }

    if (category.toLowerCase() === 'activities & adventure'.toLowerCase()) {
      return {
        title: 'Activities & Adventure Near You',
        subtitle: 'Discover thrilling adventures around your location.',
        cta: 'Check out all the activities',
        searchPlaceholder: 'Search activities...'
      };
    }

    if (category.toLowerCase() === 'local stores & gift house'.toLowerCase()) {
      return {
        title: 'Local Stores & Gift House Near You',
        subtitle: 'Discover great stores around your location.',
        cta: 'Check out all the stores',
        searchPlaceholder: 'Search stores...'
      };
    }

    if (category.toLowerCase() === 'stay & hotels'.toLowerCase()) {
      return {
        title: 'Stay & Hotels Near You',
        subtitle: 'Discover stays around your location.',
        cta: 'Check out all the hotels',
        searchPlaceholder: 'Search hotels...'
      };
    }

    return {
      title: `${category} Near You`,
      subtitle: `Discover ${category.toLowerCase()} around your location.`,
      cta: `Check out all the ${category.toLowerCase()}`,
      searchPlaceholder: `Search ${category.toLowerCase()}...`
    };
  }, [effectiveCategory]);

  const restaurants = useMemo(
    () =>
      partners
        .filter((partner) => String(partner?.status || '').trim() !== 'Blocked')
        .map((partner, index) => {
          const partnerId = String(partner?._id || '').trim();
          const info = partnerInfoById[partnerId];
          const reviewStats = reviewStatsById[partnerId];
          const partnerCoords = normalizePartnerCoords(partner);
          const computedDistance = coords && partnerCoords ? haversineKm(coords, partnerCoords) : null;
          const distanceLabel = partner?.distance || formatDistanceKm(computedDistance) || '1.2 km';
          const ratingValue = Number(
            reviewStats?.count
              ? reviewStats.avg
              : info?.rating ?? partner?.rating ?? 0
          );
          const descriptionFromInfo = String(info?.description || '').trim();
          const descriptionFromPartner = String(partner?.description || '').trim();
          const addressFromPartner = String(partner?.address || '').trim();
          const categoryFromPartner = String(partner?.businessCategory || '').trim();

          const rawFoodType = info?.foodType ?? partner?.foodType;

          return {
            id: partner?._id || index,
            name: partner?.restaurantName || 'Partner Restaurant',
            rating: Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : '0.0',
            foodType: String(rawFoodType || '').trim().toLowerCase(),
            discount: Number.isFinite(Number(partner?.customerDiscount))
              ? Number(partner.customerDiscount)
              : 10,
            description:
              descriptionFromInfo ||
              descriptionFromPartner ||
              addressFromPartner ||
              categoryFromPartner ||
              'Great food and service',
            location: partner?.area || 'Panchgani',
            distance: distanceLabel,
            img: normalizeImageUrl(partner?.imageUrl),
            businessCategory: categoryFromPartner,
            hasOffer: true,
            petFriendly:
              Boolean(partner?.petFriendly) ||
              String(partner?.address || '').toLowerCase().includes('pet'),
            outdoorSeating:
              Boolean(partner?.outdoorSeating) ||
              String(partner?.address || '').toLowerCase().includes('outdoor')
          };
        }),
    [partners, partnerInfoById, reviewStatsById, coords]
  );

  const filteredRestaurants = useMemo(() => {
    const hasPetData = restaurants.some((item) => item.petFriendly);
    const hasOutdoorData = restaurants.some((item) => item.outdoorSeating);
    const query = String(searchTerm || '').trim().toLowerCase();
    const normalizedEffectiveCategory = normalizeCategory(effectiveCategory);

    const isFoodDiningFilter =
      normalizedEffectiveCategory === normalizeCategory('Food & Dining');
    const isFoodType = (value) => {
      const v = String(value || '').toLowerCase();
      return v.includes('veg') || v.includes('non') || v.includes('both');
    };

    return restaurants.filter((item) => {
      const normalizedItemCategory = normalizeCategory(item.businessCategory);

      if (normalizedEffectiveCategory) {
        if (isFoodDiningFilter) {
          if (!normalizedItemCategory) return false;
          if (
            !normalizedItemCategory.includes('food') &&
            !normalizedItemCategory.includes('dining')
          ) {
            return false;
          }
          if (!isFoodType(item.foodType)) return false;
        } else if (normalizedItemCategory !== normalizedEffectiveCategory) {
          return false;
        }
      }
      if (activeFilters.rating45 && Number(item.rating) < 4.5) return false;
      if (activeFilters.petFriendly && hasPetData && !item.petFriendly) return false;
      if (activeFilters.outdoorSeating && hasOutdoorData && !item.outdoorSeating) return false;
      if (activeFilters.vegOnly && !(item.foodType.includes('veg') && !item.foodType.includes('non')) && !item.foodType.includes('both')) return false;
      if (activeFilters.nonVegOnly && !item.foodType.includes('non') && !item.foodType.includes('both')) return false;
      if (query) {
        const haystack = `${item.name} ${item.description} ${item.location}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [restaurants, activeFilters, searchTerm, effectiveCategory]);


  const activeFilterCount = useMemo(
    () => Object.values(activeFilters).filter(Boolean).length,
    [activeFilters]
  );

  const toggleFilter = (key) => {
    setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetFilters = () => {
    setActiveFilters({
      rating45: false,
      petFriendly: false,
      outdoorSeating: false,
      vegOnly: false,
      nonVegOnly: false
    });
  };

  return (
    <div className="zomato-container">
      {isMobile && (
        <div className="rl-mobile-navbar">
          <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        </div>
      )}
      <div className="rl-top-nav">
        <button
          type="button"
          className="rl-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="rl-brand">Tripspotgo</h1>
        <div className="rl-search-wrap">
          <Search size={16} className="rl-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={pageLabels.searchPlaceholder}
            aria-label="Search restaurants"
          />
          <button type="button" className="rl-search-btn">
            Get Deal
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <button
          type="button"
          className={`f-btn ${activeFilterCount > 0 ? 'active' : ''}`}
          onClick={resetFilters}
        >
          <i className="fas fa-sliders-h"></i> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <button type="button" className={`f-btn ${activeFilters.rating45 ? 'active' : ''}`} onClick={() => toggleFilter('rating45')}>
          Rating: 4.5+
        </button>
        <button type="button" className={`f-btn ${activeFilters.vegOnly ? 'active' : ''}`} onClick={() => toggleFilter('vegOnly')}>
          Veg
        </button>
        <button type="button" className={`f-btn ${activeFilters.nonVegOnly ? 'active' : ''}`} onClick={() => toggleFilter('nonVegOnly')}>
          Non-Veg
        </button>
        <button type="button" className={`f-btn ${activeFilters.petFriendly ? 'active' : ''}`} onClick={() => toggleFilter('petFriendly')}>
          Pet friendly
        </button>
        <button type="button" className={`f-btn ${activeFilters.outdoorSeating ? 'active' : ''}`} onClick={() => toggleFilter('outdoorSeating')}>
          Outdoor seating
        </button>
      </div>

      <div className="main-banner">
        <div className="banner-overlay">
          <div className="banner-txt">
            <p>Get up to</p>
            <h1 className="discount-val">10% OFF</h1>
            <p>on your dining bills with Tripspotgo</p>
            <button className="cta-btn">{pageLabels.cta}</button>
          </div>
        </div>
      </div>

      <h2 className="city-title">{pageLabels.title}</h2>
      <p className="city-subtitle">{pageLabels.subtitle}</p>

      <div className="res-grid">
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map((item) => (
            <div
              key={item.id}
              className="restaurant-card"
              onClick={() =>
                navigate(`/restaurant?partnerId=${encodeURIComponent(String(item.id || ''))}`, { state: { partnerId: item.id } })
              }
              style={{ cursor: 'pointer' }}
            >
              <div className="img-wrapper">
                <div className="rl-offer-badge">
                  <strong>{item.discount}%</strong>
                  <span>OFF</span>
                </div>
                <img
                  src={item.img}
                  alt={item.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_RESTAURANT_IMAGE;
                  }}
                />
              </div>
              <div className="info-section">
                <div className="title-row">
                  <h4 className="res-name">{item.name}</h4>
                  <div className="food-type-icons" aria-label={`Rating${item.businessCategory === 'Food & Dining' && item.foodType ? `, food type: ${item.foodType}` : ''}`}>
                    <span className="rl-rating-mini">
                      <i className="fas fa-star rl-rating-star" aria-hidden="true"></i>
                      {item.rating}
                    </span>
                    {item.businessCategory === 'Food & Dining' && item.foodType && (
                      item.foodType.includes('both') ? (
                        <>
                          <span className="food-type-logo veg" />
                          <span className="food-type-logo nonveg" />
                        </>
                      ) : (
                        <span className={`food-type-logo ${item.foodType.includes('non') ? 'nonveg' : 'veg'}`} />
                      )
                    )}
                  </div>
                </div>
                <div className="desc-row">
                  <span className="cuisine-txt">{item.description}</span>
                </div>
                <div className="loc-row">
                  <span className="loc-txt">{item.location}</span>
                  <span className="dist-txt">{item.distance}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No restaurants available for selected filters.</p>
        )}
      </div>
    </div>
  );
};

export default RestaurantPagelist;
