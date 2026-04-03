import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import MenuSlider from "../menuslider/MenuSlider";
import "./MainPageContent.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const DEFAULT_OFFER_IMAGE = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";

const CITY_OPTIONS = [
  { label: "Panchgani", value: "Panchgani", lat: 17.9237, lng: 73.8007 },
  { label: "Mahabaleshwar", value: "Mahabaleshwar", lat: 17.9237, lng: 73.6586 },
];

const normalizeImageUrl = (rawUrl) => {
  if (!rawUrl) return DEFAULT_OFFER_IMAGE;
  const value = String(rawUrl).trim();
  if (!value) return DEFAULT_OFFER_IMAGE;

  if (/^https?:\/\//i.test(value)) {
    if (typeof window !== "undefined" && window.location.protocol === "https:" && value.startsWith("http://")) {
      return value.replace(/^http:\/\//i, "https://");
    }
    return value;
  }

  if (value.startsWith("//")) {
    return `${typeof window !== "undefined" ? window.location.protocol : "https:"}${value}`;
  }

  if (!API_BASE_URL) return value;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const path = value.replace(/^\/+/, "");
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

const CATEGORY_OPTIONS = ["Food & Dining", "Local Stores & Gift House", "Activities & Adventure", "Stay & Hotels"];

const FilterBar = ({ activeCategory, onCategoryChange }) => {
  const categories = CATEGORY_OPTIONS;

  return (
    <div className="mp-filter-section">
      <div className="mp-category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`mp-tab ${activeCategory === cat ? "active" : ""}`}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};

const OfferCard = ({ item, onClick, isPressed, onPressStart, onPressEnd }) => (
  <div
    className={`mpc-restaurant-card ${isPressed ? "mpc-press" : ""}`}
    onClick={onClick}
    onTouchStart={onPressStart}
    onTouchEnd={onPressEnd}
    onTouchCancel={onPressEnd}
  >
    <div className="mpc-img-wrapper">
      <div className="mpc-offer-badge">
        <strong>{item.discount}%</strong>
        <span>OFF</span>
      </div>
      <img
        src={item.image}
        alt={item.name}
        loading="eager"
        decoding="async"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = DEFAULT_OFFER_IMAGE;
        }}
      />
    </div>
    <div className="mpc-info-section">
      <div className="mpc-title-row">
        <h4 className="mpc-res-name">{item.name}</h4>
        <div className="mpc-food-type-icons" aria-label={`Food type: ${item.foodType}`}>
          <span className="mpc-rating-mini">
            <i className="fas fa-star mpc-rating-star" aria-hidden="true"></i>
            {item.rating}
          </span>
          {item.foodType.includes("both") ? (
            <>
              <span className="mpc-food-type-logo veg" />
              <span className="mpc-food-type-logo nonveg" />
            </>
          ) : (
            <span className={`mpc-food-type-logo ${item.foodType.includes("non") ? "nonveg" : "veg"}`} />
          )}
        </div>
      </div>
      <div className="mpc-desc-row">
        <span className="mpc-cuisine-txt">{item.description}</span>
      </div>
      <div className="mpc-loc-row">
        <span className="mpc-loc-txt">{item.location}</span>
        <span className="mpc-dist-txt">{item.distance}</span>
      </div>
    </div>
  </div>
);

const MainPageContent = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [partnerInfoById, setPartnerInfoById] = useState({});
  const [reviewStatsById, setReviewStatsById] = useState({});
  const [activeCategory, setActiveCategory] = useState("Food & Dining");
  const [selectedCity, setSelectedCity] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle");
  const [coords, setCoords] = useState(null);
  const [useGps, setUseGps] = useState(true);
  const [hasManualCategory, setHasManualCategory] = useState(false);
  const [pressedCardId, setPressedCardId] = useState(null);
  const pressResetTimer = useRef(null);
  const reviewStatsRef = useRef({});

  const openRestaurant = (partnerId) => {
    if (partnerId) {
      localStorage.setItem("selectedPartnerId", String(partnerId));
    }
    navigate("/restaurant", { state: { partnerId } });
  };

  const handlePressStart = (id) => {
    if (pressResetTimer.current) {
      clearTimeout(pressResetTimer.current);
      pressResetTimer.current = null;
    }
    setPressedCardId(id);
  };

  const handlePressEnd = () => {
    if (pressResetTimer.current) clearTimeout(pressResetTimer.current);
    pressResetTimer.current = setTimeout(() => {
      setPressedCardId(null);
      pressResetTimer.current = null;
    }, 180);
  };

  useEffect(() => {
    const savedCoords = localStorage.getItem("tsg_user_coords");
    const savedCity = localStorage.getItem("tsg_selected_city");
    const savedUseGps = localStorage.getItem("tsg_use_gps");
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 600;
    if (isMobile && savedUseGps !== "false") {
      setUseGps(true);
      localStorage.setItem("tsg_use_gps", "true");
    }
    if (savedUseGps === "false") setUseGps(false);
    if (savedCity) setSelectedCity(savedCity);
    if (savedCoords) {
      try {
        const parsed = JSON.parse(savedCoords);
        if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
          if (savedUseGps !== "false") {
            setCoords({ lat: parsed.lat, lng: parsed.lng });
          }
        }
      } catch (_error) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const handleLocationChange = (event) => {
      const detail = event?.detail || {};
      const city = String(detail.city || '').trim();
      const nextCoords = detail.coords && Number.isFinite(detail.coords.lat) && Number.isFinite(detail.coords.lng)
        ? { lat: Number(detail.coords.lat), lng: Number(detail.coords.lng) }
        : null;
      const nextUseGps = typeof detail.useGps === 'boolean' ? detail.useGps : undefined;

      if (city) {
        setSelectedCity(city);
        localStorage.setItem("tsg_selected_city", city);
      }
      if (nextCoords) {
        setCoords(nextCoords);
        localStorage.setItem("tsg_user_coords", JSON.stringify(nextCoords));
        setLocationStatus("ok");
      }
      if (nextUseGps !== undefined) {
        setUseGps(nextUseGps);
        localStorage.setItem("tsg_use_gps", String(nextUseGps));
      }
    };

    window.addEventListener("tsg-location-change", handleLocationChange);
    return () => window.removeEventListener("tsg-location-change", handleLocationChange);
  }, []);

  useEffect(() => {
    const fetchPartners = async () => {
      if (!coords) {
        setPartners([]);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/api/partners/nearby`, {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          params: {
            lat: coords.lat,
            lng: coords.lng,
            radius: 15000,
            _ts: Date.now()
          }
        });
        setPartners(Array.isArray(response.data) ? response.data : []);
      } catch (_error) {
        setPartners([]);
      }
    };

    fetchPartners();
    const refreshTimer = setInterval(fetchPartners, 10000);
    return () => clearInterval(refreshTimer);
  }, [coords]);

  useEffect(() => {
    if (!navigator?.geolocation) {
      setLocationStatus("unavailable");
      return;
    }
    if (!useGps) return;

    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setLocationStatus("denied");
          return;
        }

        const current = { lat: latitude, lng: longitude };
        setCoords(current);
        localStorage.setItem("tsg_user_coords", JSON.stringify(current));
        setLocationStatus("ok");

        const ranked = CITY_OPTIONS.map((city) => ({
          ...city,
          distance: haversineKm(current, city),
        })).sort((a, b) => a.distance - b.distance);
        const nearest = ranked[0];
        if (nearest && nearest.distance <= 80) {
          setSelectedCity(nearest.value);
          localStorage.setItem("tsg_selected_city", nearest.value);
        }
      },
      () => {
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }, [useGps]);

  useEffect(() => {
    if (coords) return;
    if (!selectedCity) return;
    const match = CITY_OPTIONS.find((city) => city.value === selectedCity);
    if (match) {
      const nextCoords = { lat: match.lat, lng: match.lng };
      setCoords(nextCoords);
      localStorage.setItem("tsg_user_coords", JSON.stringify(nextCoords));
    }
  }, [coords, selectedCity]);

  useEffect(() => {
    if (coords) return;
    if (locationStatus !== "denied" && locationStatus !== "unavailable") return;
    if (selectedCity) return;
    const fallbackCity = CITY_OPTIONS[0];
    if (!fallbackCity) return;
    setSelectedCity(fallbackCity.value);
    localStorage.setItem("tsg_selected_city", fallbackCity.value);
    const nextCoords = { lat: fallbackCity.lat, lng: fallbackCity.lng };
    setCoords(nextCoords);
    localStorage.setItem("tsg_user_coords", JSON.stringify(nextCoords));
  }, [coords, locationStatus, selectedCity]);

  useEffect(() => {
    let isMounted = true;

    const fetchPartnerInfo = async () => {
      const partnerIds = partners
        .map((partner) => String(partner?._id || "").trim())
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
      .map((partner) => String(partner?._id || "").trim())
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

  const mappedItems = useMemo(
    () =>
      partners
        .filter((p) => {
          const approvalStatus = String(p.status || "").trim();
          const businessStatus = String(p.businessStatus || "OPEN").trim().toUpperCase();
          return approvalStatus === "Active" && businessStatus === "OPEN";
        })
        .map((partner, index) => {
          const partnerId = String(partner?._id || "").trim();
          const info = partnerInfoById[partnerId];
          const reviewStats = reviewStatsById[partnerId];
          const ratingValue = Number(
            reviewStats?.count
              ? reviewStats.avg
              : info?.rating ?? partner?.rating ?? 4.5
          );
          const descriptionFromInfo = String(info?.description || "").trim();
          const descriptionFromPartner = String(partner?.description || "").trim();
          const addressFromPartner = String(partner?.address || "").trim();
          const categoryFromPartner = String(partner?.businessCategory || "").trim();

          return {
            id: partner._id || index,
            name: partner.restaurantName || "Partner Restaurant",
            rating: Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : "0.0",
            foodType: String(partner?.foodType || "Veg").trim().toLowerCase(),
            discount: Number.isFinite(Number(partner?.customerDiscount))
              ? Number(partner.customerDiscount)
              : 10,
            description:
              descriptionFromInfo ||
              descriptionFromPartner ||
              addressFromPartner ||
              categoryFromPartner ||
              "Great food and service",
            location: partner.area || "Panchgani",
            distance: partner.distance || "1.2 km",
            image: normalizeImageUrl(partner.imageUrl || partner.resImage),
            businessCategory: partner.businessCategory || "Food & Dining",
            area: partner.area || "",
          };
        }),
    [partners, partnerInfoById, reviewStatsById]
  );

  const filteredItems = useMemo(
    () => mappedItems.filter((item) => item.businessCategory === activeCategory),
    [mappedItems, activeCategory]
  );

  const displayItems = filteredItems;

  useEffect(() => {
    if (hasManualCategory) return;
    if (!mappedItems.length) return;
    const available = new Set(
      mappedItems
        .map((item) => String(item?.businessCategory || "").trim())
        .filter(Boolean)
    );
    if (!available.size) return;
    if (available.has(activeCategory)) return;
    const next = CATEGORY_OPTIONS.find((cat) => available.has(cat)) || activeCategory;
    if (next !== activeCategory) setActiveCategory(next);
  }, [mappedItems, activeCategory, hasManualCategory]);

  useEffect(
    () => () => {
      if (pressResetTimer.current) clearTimeout(pressResetTimer.current);
    },
    []
  );

  return (
    <div className="mp-scope">
      <div className="mp-main-container">
        <MenuSlider />

        <div className="mp-mobile-sticky">
          <header className="mp-page-header">
            <h1 className="mp-gradient-title">Explore nearby offers</h1>
            <p className="mp-sub-title">Lowest prices for all your favourite Tripspotgos</p>
          </header>

          <FilterBar
            activeCategory={activeCategory}
            onCategoryChange={(cat) => {
              setHasManualCategory(true);
              setActiveCategory(cat);
            }}
          />
        </div>

        <section className="mp-section">
          <div className="mp-section-header">
            <h2>{activeCategory}</h2>
            <button
              type="button"
              className="mp-view-all"
              onClick={() => navigate(`/restaurant-list?category=${encodeURIComponent(activeCategory)}`)}
            >
              See All
            </button>
          </div>

          <div className="mpc-card-grid">
            {displayItems.length > 0 ? (
              displayItems.map((item) => (
                <OfferCard
                  key={item.id}
                  item={item}
                  isPressed={pressedCardId === item.id}
                  onPressStart={() => handlePressStart(item.id)}
                  onPressEnd={handlePressEnd}
                  onClick={() => openRestaurant(item.id)}
                />
              ))
            ) : (
              <p className="no-data">No offers available.</p>
            )}
          </div>
          <button
            type="button"
            className="mpc-explore-more"
            onClick={() => navigate(`/restaurant-list?category=${encodeURIComponent(activeCategory)}`)}
          >
            Explore more..
          </button>
        </section>
      </div>
    </div>
  );
};

export default MainPageContent;

