import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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

const normalizePartnerCoords = (partner) => {
  const coords = partner?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  let [lng, lat] = coords.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // If latitude looks out of range but longitude is valid, swap (handles old swapped data).
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

const CATEGORY_OPTIONS = ["Food & Dining", "Local Stores & Gift House", "Activities & Adventure", "Stay & Hotels"];

const normalizeCategory = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getCanonicalCategory = (value) => {
  const key = normalizeCategory(value);
  if (!key) return "";

  const directMap = {
    "food dining": "Food & Dining",
    "food and dining": "Food & Dining",
    "dining": "Food & Dining",
    "restaurant": "Food & Dining",
    "restaurants": "Food & Dining",
    "local stores gift house": "Local Stores & Gift House",
    "local store gift house": "Local Stores & Gift House",
    "local stores and gift house": "Local Stores & Gift House",
    "local store and gift house": "Local Stores & Gift House",
    "stores": "Local Stores & Gift House",
    "store": "Local Stores & Gift House",
    "shops": "Local Stores & Gift House",
    "shop": "Local Stores & Gift House",
    "activities adventure": "Activities & Adventure",
    "activities and adventure": "Activities & Adventure",
    "activity": "Activities & Adventure",
    "adventure": "Activities & Adventure",
    "stay hotels": "Stay & Hotels",
    "stay and hotels": "Stay & Hotels",
    "hotel": "Stay & Hotels",
    "hotels": "Stay & Hotels",
    "stay": "Stay & Hotels",
    "resort": "Stay & Hotels",
    "resorts": "Stay & Hotels",
    "villa": "Stay & Hotels",
    "villas": "Stay & Hotels"
  };

  if (directMap[key]) return directMap[key];
  if (key.includes("food") || key.includes("dining") || key.includes("restaurant")) return "Food & Dining";
  if (key.includes("store") || key.includes("shop") || key.includes("gift")) return "Local Stores & Gift House";
  if (key.includes("activity") || key.includes("adventure") || key.includes("experience")) return "Activities & Adventure";
  if (key.includes("stay") || key.includes("hotel") || key.includes("resort") || key.includes("villa")) return "Stay & Hotels";
  return "";
};

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
        loading="lazy"
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
        <div className="mpc-food-type-icons" aria-label={`Rating${item.businessCategory === "Food & Dining" && item.foodType ? `, food type: ${item.foodType}` : ""}`}>
          <span className="mpc-rating-mini">
            <i className="fas fa-star mpc-rating-star" aria-hidden="true"></i>
            {item.rating}
          </span>
          {item.businessCategory === "Food & Dining" && item.foodType && (
            item.foodType.includes("both") ? (
              <>
                <span className="mpc-food-type-logo veg" />
                <span className="mpc-food-type-logo nonveg" />
              </>
            ) : (
              <span className={`mpc-food-type-logo ${item.foodType.includes("non") ? "nonveg" : "veg"}`} />
            )
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
  const [partnersLoaded, setPartnersLoaded] = useState(false);
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
    navigate(`/restaurant?partnerId=${encodeURIComponent(String(partnerId || ""))}`, { state: { partnerId } });
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
          // Always honor saved coords; geolocation will overwrite only if GPS is on.
          setCoords({ lat: parsed.lat, lng: parsed.lng });
        }
      } catch (_error) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (coords || selectedCity) return;
    const fallbackCity = CITY_OPTIONS[0];
    if (!fallbackCity) return;
    setSelectedCity(fallbackCity.value);
    localStorage.setItem("tsg_selected_city", fallbackCity.value);
    const nextCoords = { lat: fallbackCity.lat, lng: fallbackCity.lng };
    setCoords(nextCoords);
    localStorage.setItem("tsg_user_coords", JSON.stringify(nextCoords));
    setUseGps(false);
    localStorage.setItem("tsg_use_gps", "false");
  }, [coords, selectedCity]);

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
      try {
        // Show something quickly: load a generic partner list first, then refine by nearby results.
        if (!partnersLoaded) {
          const fallbackRes = await axios.get(`${API_BASE_URL}/api/admin/partners`);
          setPartners(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
          setPartnersLoaded(true);
        }

        if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
          const response = await axios.get(`${API_BASE_URL}/api/partners/nearby`, {
            params: {
              lat: coords.lat,
              lng: coords.lng,
              radius: 80000,
            }
          });
          setPartners(Array.isArray(response.data) ? response.data : []);
          setPartnersLoaded(true);
        }
      } catch (_error) {
        setPartners([]);
        setPartnersLoaded(true);
      }
    };

    fetchPartners();
    return undefined;
  }, [coords, partnersLoaded]);

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

  // Note: partner details (partner-info + reviews) are fetched lazily for visible cards
  // further below to avoid making dozens of requests on initial load.

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
          const partnerCoords = normalizePartnerCoords(partner);
          const computedDistance = coords && partnerCoords ? haversineKm(coords, partnerCoords) : null;
          const distanceLabel = partner.distance || formatDistanceKm(computedDistance) || "1.2 km";
          const ratingValue = Number(
            reviewStats?.count
              ? reviewStats.avg
              : info?.rating ?? partner?.rating ?? 0
          );
          const rawFoodType = info?.foodType ?? partner?.foodType;
          const descriptionFromInfo = String(info?.description || "").trim();
          const descriptionFromPartner = String(partner?.description || "").trim();
          const addressFromPartner = String(partner?.address || "").trim();
          const categoryFromPartner = String(partner?.businessCategory || "").trim();
          const canonicalCategory = getCanonicalCategory(categoryFromPartner);

          return {
            id: partner._id || index,
            name: partner.restaurantName || "Partner Restaurant",
            rating: Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : "0.0",
            foodType: String(rawFoodType || "").trim().toLowerCase(),
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
            distance: distanceLabel,
            distanceKm: Number.isFinite(computedDistance) ? computedDistance : null,
            image: normalizeImageUrl(partner.imageUrl || partner.resImage),
            businessCategory: canonicalCategory || "Food & Dining",
            categoryKey: normalizeCategory(canonicalCategory || categoryFromPartner),
            area: partner.area || "",
          };
        }),
    [partners, partnerInfoById, reviewStatsById, coords]
  );

  const sortedItems = useMemo(() => {
    if (!coords) return mappedItems;
    return [...mappedItems].sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [mappedItems, coords]);

  const filteredItems = useMemo(() => {
    const activeKey = normalizeCategory(activeCategory);
    return sortedItems.filter((item) => item.categoryKey === activeKey);
  }, [sortedItems, activeCategory]);

  const displayItems = filteredItems;

  useEffect(() => {
    if (!partnersLoaded) return undefined;
    let isMounted = true;
    const visibleIds = displayItems
      .slice(0, 12)
      .map((item) => String(item?.id || '').trim())
      .filter(Boolean);

    const missingInfoIds = visibleIds.filter((id) => partnerInfoById[id] === undefined);
    if (!missingInfoIds.length) return undefined;

    const fetchInBatches = async (ids, batchSize, worker) => {
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(batch.map(worker));
        if (!isMounted) return;
      }
    };

    const run = async () => {
      const entries = [];
      await fetchInBatches(missingInfoIds, 4, async (partnerId) => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/admin/partner-info/${partnerId}`);
          entries.push([partnerId, res?.data?.data || null]);
        } catch (_error) {
          entries.push([partnerId, null]);
        }
      });

      if (!isMounted) return;
      setPartnerInfoById((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    };

    // Defer until after first paint so cards show immediately.
    const timerId = setTimeout(run, 50);
    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [partnersLoaded, displayItems, partnerInfoById]);

  useEffect(() => {
    if (!partnersLoaded) return undefined;
    let isMounted = true;
    const visibleIds = displayItems
      .slice(0, 12)
      .map((item) => String(item?.id || '').trim())
      .filter(Boolean);

    const missingReviewIds = visibleIds.filter((id) => !reviewStatsRef.current[id]);
    if (!missingReviewIds.length) return undefined;

    const fetchInBatches = async (ids, batchSize, worker) => {
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(batch.map(worker));
        if (!isMounted) return;
      }
    };

    const run = async () => {
      const entries = [];
      await fetchInBatches(missingReviewIds, 4, async (partnerId) => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/restaurants/${partnerId}/reviews`);
          const list = Array.isArray(res?.data?.data) ? res.data.data : [];
          const avg = list.length
            ? list.reduce((sum, item) => sum + Number(item?.rating || 0), 0) / list.length
            : null;
          entries.push([partnerId, { avg, count: list.length }]);
        } catch (_error) {
          entries.push([partnerId, { avg: null, count: 0 }]);
        }
      });

      if (!isMounted) return;
      const next = { ...reviewStatsRef.current, ...Object.fromEntries(entries) };
      reviewStatsRef.current = next;
      setReviewStatsById(next);
    };

    const timerId = setTimeout(run, 100);
    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [partnersLoaded, displayItems]);

  useEffect(() => {
    if (hasManualCategory) return;
    if (!mappedItems.length) return;
    const available = new Set(mappedItems.map((item) => item.categoryKey).filter(Boolean));
    if (!available.size) return;
    const activeKey = normalizeCategory(activeCategory);
    if (available.has(activeKey)) return;
    const next = CATEGORY_OPTIONS.find((cat) => available.has(normalizeCategory(cat))) || activeCategory;
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
        <div className="mp-mobile-sticky">
          <header className="mp-page-header">
            <h1 className="mp-gradient-title">Trending Offers Near You</h1>
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
            ) : partnersLoaded ? (
              <p className="no-data">No offers available.</p>
            ) : (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={`skeleton-${idx}`} className="mpc-skeleton-card" />
              ))
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

