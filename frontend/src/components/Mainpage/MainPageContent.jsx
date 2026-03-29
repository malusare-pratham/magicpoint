import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import MenuSlider from "../menuslider/MenuSlider";
import "./MainPageContent.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const DEFAULT_OFFER_IMAGE = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";

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

const FilterBar = ({ activeCategory, setActiveCategory }) => {
  const categories = ["Food & Dining", "Local Stores & Gift House", "Activities & Adventure", "Stay & Hotels"];

  return (
    <div className="mp-filter-section">
      <div className="mp-category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`mp-tab ${activeCategory === cat ? "active" : ""}`}
            onClick={() => setActiveCategory(cat)}
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
    const fetchPartners = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/admin/partners`);
        setPartners(Array.isArray(response.data) ? response.data : []);
      } catch (_error) {
        setPartners([]);
      }
    };

    fetchPartners();
    const refreshTimer = setInterval(fetchPartners, 10000);
    return () => clearInterval(refreshTimer);
  }, []);

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

  const filteredItems = useMemo(
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
            image: normalizeImageUrl(partner.imageUrl),
            businessCategory: partner.businessCategory || "Food & Dining",
          };
        })
        .filter((item) => item.businessCategory === activeCategory),
    [partners, partnerInfoById, reviewStatsById, activeCategory]
  );

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

          <FilterBar activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
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
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
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

