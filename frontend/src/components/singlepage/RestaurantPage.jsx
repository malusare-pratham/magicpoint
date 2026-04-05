import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Star, Camera, Video, Share2, Pencil, ChevronLeft, ChevronRight, Home, UtensilsCrossed, BookOpen, Phone, Navigation, MapPin, ThumbsUp, User } from 'lucide-react';
import './RestaurantPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const normalizeAssetUrl = (rawUrl) => {
  if (!rawUrl) return '';
  const value = String(rawUrl).trim();
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && value.startsWith('http://')) {
      return value.replace(/^http:\/\//i, 'https://');
    }
    return value;
  }

  if (value.startsWith('//')) {
    return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${value}`;
  }

  if (!API_BASE_URL) return value;
  const base = API_BASE_URL.replace(/\/+$/, '');
  const path = value.replace(/^\/+/, '');
  return `${base}/${path}`;
};

const defaultInfo = {
  email: '',
  memberSince: '2026',
  logo: '',
  restaurantName: 'Pizza Hut',
  subtitle: 'Pizza • Italian • Fast Food',
  foodType: '',
  description: '',
  rating: 0,
  discountPercent: 10,
  location: 'Connaught Place, New Delhi',
  openTime: '11:00 AM',
  closeTime: '11:00 PM',
  callNumber: '+919876543210',
  directionLink: 'https://maps.google.com',
  menuSections: [],
  interiorImages: [],
  foodImages: [],
  menuImages: [],
  otherImages: [],
  photos: [],
  videos: []
};

const toArrayValue = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch (_error) {
      return [value];
    }
  }
  return [];
};

const normalizeImageList = (items = []) =>
  toArrayValue(items)
    .map((item) => {
      const raw = toPhotoUrl(item);
      return normalizeAssetUrl(raw) || raw;
    })
    .filter(Boolean);

const buildGalleryItems = (data = {}, extraPhotos = []) => {
  const normalizedPhotos = [
    ...normalizeImageList(data.interiorImages),
    ...normalizeImageList(data.foodImages),
    ...normalizeImageList(data.menuImages),
    ...normalizeImageList(data.photos),
    ...normalizeImageList(extraPhotos)
  ];
  const normalizedVideos = normalizeImageList(data.videos);
  const uniquePhotos = Array.from(new Set(normalizedPhotos));
  return [
    ...uniquePhotos.map((src) => ({ type: 'image', src })),
    ...normalizedVideos.map((src) => ({ type: 'video', src }))
  ];
};

const formatTimeLabel = (value, fallbackMeridiem = 'AM') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/\b(am|pm)\b/i.test(raw)) return raw.toUpperCase();

  const match = raw.match(/^(\d{1,2})([:.](\d{1,2}))?$/);
  if (!match) return raw;

  let hour = Number(match[1]);
  const minute = Number(match[3] || 0);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return raw;

  let meridiem = fallbackMeridiem;
  if (hour === 0) {
    hour = 12;
    meridiem = 'AM';
  } else if (hour === 12) {
    meridiem = 'PM';
  } else if (hour > 12) {
    hour -= 12;
    meridiem = 'PM';
  }

  const paddedMin = String(minute).padStart(2, '0');
  return `${hour}:${paddedMin} ${meridiem}`;
};

const buildRecentMonths = (count = 12) => {
  const base = new Date();
  const months = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    months.push(d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }));
  }
  return months;
};

const fallbackMenu = [];

const getAuthUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem('authUser') || '{}') || {};
  } catch (_error) {
    return {};
  }
};

const getOrCreateLikeUserId = () => {
  try {
    const existing = String(localStorage.getItem('reviewLikeUserId') || '').trim();
    if (existing) return existing;
    const next = `anon_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem('reviewLikeUserId', next);
    return next;
  } catch (_error) {
    return '';
  }
};

const buildReviewMeta = (review) => {
  const parts = [];
  const visitMonth = String(review?.visitMonth || '').trim();
  const visitWith = String(review?.visitWith || '').trim();
  if (visitMonth) {
    parts.push(visitMonth);
  } else if (review?.createdAt) {
    const createdAt = new Date(review.createdAt);
    if (!Number.isNaN(createdAt.getTime())) {
      parts.push(createdAt.toLocaleString('en-IN', { month: 'short', year: 'numeric' }));
    }
  }
  if (visitWith) {
    parts.push(visitWith);
  }
  return parts.length ? parts.join(' • ') : 'Recent';
};

const toPhotoUrl = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    return item.secure_url || item.url || item.path || '';
  }
  return '';
};

const normalizeReviewPhotos = (photos) => {
  if (Array.isArray(photos)) return photos;
  if (typeof photos === 'string') {
    const trimmed = photos.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [trimmed];
      } catch (_error) {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  return [];
};

const mapReviewToCard = (review) => ({
  id: review?._id || review?.id || `rev-${Math.random().toString(36).slice(2, 8)}`,
  partnerId: String(review?.partnerId || ''),
  name: String(review?.userName || 'Customer'),
  location: (() => {
    const raw = String(review?.userLocation || '').trim();
    return raw.toLowerCase() === 'india' ? '' : raw;
  })(),
  title: String(review?.title || 'Review'),
  meta: buildReviewMeta(review),
  text: String(review?.text || ''),
  likes: Number(review?.likes || 0),
  rating: Number(review?.rating || 0),
  photos: normalizeReviewPhotos(review?.photos)
    .map((src) => normalizeAssetUrl(toPhotoUrl(src)) || toPhotoUrl(src))
    .filter(Boolean)
});

const RestaurantPage = () => {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const navigate = useNavigate();
  const location = useLocation();
  const [userRating, setUserRating] = useState(0);
  const [visitMonth, setVisitMonth] = useState(() => buildRecentMonths(1)[0] || '');
  const [visitWith, setVisitWith] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewAgree, setReviewAgree] = useState(false);
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [reviewPhotoPreviews, setReviewPhotoPreviews] = useState([]);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [foodFilter, setFoodFilter] = useState('all');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const reviewPhotoInputRef = useRef(null);
  const reviewFormRef = useRef(null);
  const touchStartXRef = useRef(null);
  const [restaurantInfo, setRestaurantInfo] = useState(defaultInfo);
  const [reviews, setReviews] = useState([]);
  const recentMonths = useMemo(() => buildRecentMonths(12), []);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const likeUserId = useMemo(() => {
    const authUser = getAuthUserFromStorage();
    const fromAuth = String(authUser?._id || authUser?.id || '').trim();
    return fromAuth || getOrCreateLikeUserId();
  }, []);
  const [localLikes, setLocalLikes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('reviewLikes') || '{}') || {};
    } catch (_error) {
      return {};
    }
  });

  const tabs = ['OVERVIEW', 'MENU', 'REVIEWS', 'PHOTOS'];
  const foodTypeRaw = String(restaurantInfo.foodType || '').toLowerCase();
  const isVegOnly = foodTypeRaw.includes('veg') && !foodTypeRaw.includes('non') && !foodTypeRaw.includes('both');
  const isNonVegOnly = foodTypeRaw.includes('non') && !foodTypeRaw.includes('both') && !foodTypeRaw.includes('veg');
  const menuSectionFilters = Array.isArray(restaurantInfo.menuSections)
    ? restaurantInfo.menuSections.map((section) => section?.name || 'Menu').filter(Boolean)
    : [];
  const hasMenuSections = menuSectionFilters.length > 0;
  const foodFilters = hasMenuSections
    ? menuSectionFilters
    : isVegOnly
    ? ['veg']
    : isNonVegOnly
      ? ['nonveg']
      : ['all', 'veg', 'nonveg'];
  const companionOptions = ['Business', 'Couples', 'Family', 'Friends', 'Solo'];

  const partnerIdFromState = location?.state?.partnerId;
  const partnerIdFromQuery = new URLSearchParams(location.search).get('partnerId');
  const partnerIdFromStorage = (() => {
    try {
      return JSON.parse(localStorage.getItem('partnerInfo') || '{}')?.id;
    } catch (_error) {
      return '';
    }
  })();
  const partnerIdFromSelection = localStorage.getItem('selectedPartnerId') || '';
  const partnerId = partnerIdFromState || partnerIdFromQuery || partnerIdFromSelection || partnerIdFromStorage;

  const handleBack = () => {
    navigate('/DashboardPage');
  };

  const handleShare = async () => {
    const shareData = {
      title: restaurantInfo.restaurantName || 'Restaurant',
      text: `Check out ${restaurantInfo.restaurantName || 'this restaurant'}`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (_error) {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (_error) {
      // no-op
    }
  };

  const handleRedeem = () => {
    const redeemState = {
      partnerId,
      partnerName: restaurantInfo.restaurantName || 'Partner Restaurant',
      discountPercent: restaurantInfo.discountPercent
    };
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { state: { redirectTo: '/upload-bill', redirectState: redeemState } });
      return;
    }
    navigate('/upload-bill', { state: redeemState });
  };

  const openReviewForm = () => {
    setReviewError('');
    setActiveTab('REVIEWS');
    setIsReviewFormOpen(true);
  };

  useEffect(() => {
    if (!isReviewFormOpen) return;
    const timer = setTimeout(() => {
      reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    return () => clearTimeout(timer);
  }, [isReviewFormOpen, activeTab]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    return () => {
      reviewPhotoPreviews.forEach((src) => {
        if (src?.startsWith('blob:')) {
          URL.revokeObjectURL(src);
        }
      });
    };
  }, [reviewPhotoPreviews]);


  useEffect(() => {
    if (!partnerId) return;
    const fetchInfo = async () => {
      try {
        const partnersRes = await axios.get(`${API_BASE_URL}/api/admin/partners`);
        const partners = Array.isArray(partnersRes?.data) ? partnersRes.data : [];
        const basePartner = partners.find((p) => String(p?._id || '') === String(partnerId));

        if (basePartner) {
          setRestaurantInfo((prev) => ({
            ...prev,
            logo: normalizeAssetUrl(basePartner.imageUrl) || prev.logo,
            restaurantName: basePartner.restaurantName || prev.restaurantName,
            subtitle: basePartner.businessCategory || prev.subtitle,
            foodType: basePartner.foodType || prev.foodType,
            discountPercent: Number.isFinite(Number(basePartner.customerDiscount))
              ? Number(basePartner.customerDiscount)
              : prev.discountPercent,
            location: basePartner.area || prev.location,
            openTime: basePartner.openTime || prev.openTime,
            closeTime: basePartner.closeTime || prev.closeTime,
            directionLink: basePartner.locationLink || prev.directionLink
          }));
        }

        const res = await axios.get(`${API_BASE_URL}/api/admin/partner-info/${partnerId}`);
        const info = res?.data?.data;
        if (!info) return;

        setRestaurantInfo((prev) => ({
          ...prev,
          email: info.email || '',
          memberSince: info.memberSince || '2026',
          logo: normalizeAssetUrl(info.logo) || prev.logo,
          restaurantName: info.restaurantName || prev.restaurantName,
          subtitle: info.subtitle || prev.subtitle,
          foodType: info.foodType || prev.foodType,
          description: info.description || prev.description,
          rating: Number(info.rating ?? prev.rating),
          location: info.location || prev.location,
          openTime: info.openTime || prev.openTime,
          closeTime: info.closeTime || prev.closeTime,
          callNumber: info.callNumber || prev.callNumber,
          directionLink: info.directionLink || prev.directionLink,
          menuSections: Array.isArray(info.menuSections) ? info.menuSections : [],
          interiorImages: normalizeImageList(info.interiorImages),
          foodImages: normalizeImageList(info.foodImages),
          menuImages: normalizeImageList(info.menuImages),
          otherImages: normalizeImageList(info.otherImages),
          photos: Array.isArray(info.photos) ? info.photos.map((src) => normalizeAssetUrl(src) || src) : [],
          videos: Array.isArray(info.videos) ? info.videos.map((src) => normalizeAssetUrl(src) || src) : []
        }));

      } catch (_error) {
        // Keep fallback UI data
      }
    };
    fetchInfo();
  }, [partnerId]);

  useEffect(() => {
    if (!foodFilters.includes(foodFilter)) {
      setFoodFilter(foodFilters[0]);
    }
  }, [foodFilters, foodFilter]);

  useEffect(() => {
    if (!partnerId) return;
    const fetchReviews = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/restaurants/${partnerId}/reviews`);
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setReviews(list);
      } catch (_error) {
        // Keep fallback UI data
      }
    };
    fetchReviews();
  }, [partnerId]);

  const addFilesToGallery = async (fileList, type) => {
    const files = Array.from(fileList || []);
    if (!files.length || !partnerId) return;

    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('photos', JSON.stringify(Array.isArray(restaurantInfo.photos) ? restaurantInfo.photos : []));
      formData.append('videos', JSON.stringify(Array.isArray(restaurantInfo.videos) ? restaurantInfo.videos : []));

      files.forEach((file) => {
        if (type === 'image') {
          formData.append('photoFiles', file);
        } else {
          formData.append('videoFiles', file);
        }
      });

      const res = await axios.put(`${API_BASE_URL}/api/admin/partner-info/${partnerId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      let savedInfo = res?.data?.data;
      if (!savedInfo) {
        const refetch = await axios.get(`${API_BASE_URL}/api/admin/partner-info/${partnerId}`);
        savedInfo = refetch?.data?.data;
      }
      if (!savedInfo && res?.data?.success) {
        savedInfo = res.data;
      }

      const nextPhotos = Array.isArray(savedInfo?.photos) ? savedInfo.photos.map((src) => normalizeAssetUrl(src) || src) : [];
      const nextVideos = Array.isArray(savedInfo?.videos) ? savedInfo.videos.map((src) => normalizeAssetUrl(src) || src) : [];
      setRestaurantInfo((prev) => ({
        ...prev,
        photos: nextPhotos,
        videos: nextVideos
      }));
    } catch (_error) {
      // no-op
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const menuData = useMemo(() => {
    const menuSections = Array.isArray(restaurantInfo.menuSections) ? restaurantInfo.menuSections : [];

    if (menuSections.length) {
      return menuSections.map((section) => ({
        category: section.name || 'Menu',
        items: Array.isArray(section.items) ? section.items.map((item) => ({
          name: item?.name || 'Menu Item',
          price: Number(item?.price) || 0,
          desc: item?.description || '',
          img: normalizeAssetUrl(item?.image) || '',
          type: 'all'
        })) : []
      }));
    }

    return fallbackMenu;
  }, [restaurantInfo.menuSections]);

  const overviewReviews = useMemo(() => reviews.slice(0, 3).map(mapReviewToCard), [reviews]);
  const reviewCards = useMemo(() => (reviews.length ? reviews.map(mapReviewToCard) : []), [reviews]);
  const reviewGalleryPhotos = useMemo(
    () => reviewCards.flatMap((review) => (Array.isArray(review.photos) ? review.photos : [])),
    [reviewCards]
  );
  const galleryItems = useMemo(
    () => buildGalleryItems(restaurantInfo, reviewGalleryPhotos),
    [restaurantInfo, reviewGalleryPhotos]
  );
  const interiorImages = useMemo(() => normalizeImageList(restaurantInfo.interiorImages), [restaurantInfo.interiorImages]);
  const foodImages = useMemo(() => normalizeImageList(restaurantInfo.foodImages), [restaurantInfo.foodImages]);
  const menuImages = useMemo(() => normalizeImageList(restaurantInfo.menuImages), [restaurantInfo.menuImages]);
  const otherImages = useMemo(() => normalizeImageList(restaurantInfo.otherImages), [restaurantInfo.otherImages]);
  const showcaseCards = useMemo(
    () => ([
      { label: 'Interior', count: interiorImages.length, cover: interiorImages[0], icon: Home },
      { label: 'Food', count: foodImages.length, cover: foodImages[0], icon: UtensilsCrossed },
      { label: 'Menu', count: menuImages.length, cover: menuImages[0], icon: BookOpen },
      { label: 'Other', count: otherImages.length, cover: otherImages[0], icon: Camera }
    ].filter((card) => card.count > 0)),
    [interiorImages, foodImages, menuImages, otherImages]
  );
  const showcaseImages = useMemo(
    () => showcaseCards.map((card) => card.cover).filter(Boolean),
    [showcaseCards]
  );
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const activeShowcaseCard = showcaseCards[showcaseIndex % (showcaseCards.length || 1)];
  const ActiveBadgeIcon = activeShowcaseCard?.icon || Camera;

  const goToNextShowcase = () => {
    if (!showcaseImages.length) return;
    setShowcaseIndex((prev) => (prev + 1) % showcaseImages.length);
  };

  const goToPrevShowcase = () => {
    if (!showcaseImages.length) return;
    setShowcaseIndex((prev) => (prev - 1 + showcaseImages.length) % showcaseImages.length);
  };

  useEffect(() => {
    if (showcaseImages.length <= 1) return;
    const interval = setInterval(() => {
      setShowcaseIndex((prev) => (prev + 1) % showcaseImages.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [showcaseImages.length]);

  const getShowcaseImage = (offset = 0) => {
    const len = showcaseImages.length;
    if (!len) return '';
    return showcaseImages[(showcaseIndex + offset + len) % len];
  };

  const foodTypeText = (() => {
    const raw = String(restaurantInfo.foodType || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (lower.includes('non')) return 'Non-Veg';
    if (lower.includes('veg')) return 'Veg';
    return raw;
  })();
  const foodBadgeType = (() => {
    if (!foodTypeText) return '';
    if (foodTypeText === 'Both') return 'both';
    if (foodTypeText === 'Veg') return 'veg';
    if (foodTypeText === 'Non-Veg') return 'nonveg';
    return '';
  })();
  const reviewCount = reviews.length;
  const displayRating = reviews.length
    ? reviews.reduce((sum, item) => sum + Number(item?.rating || 0), 0) / reviews.length
    : Number(restaurantInfo.rating || 0);
  const ratingLabel = displayRating >= 4.5
    ? 'Excellent'
    : displayRating >= 3.5
      ? 'Good'
      : displayRating >= 2.5
        ? 'Average'
        : displayRating >= 1.5
          ? 'Poor'
          : 'Terrible';
  const ratingCounts = reviews.reduce(
    (acc, item) => {
      const bucket = Math.min(5, Math.max(1, Math.round(Number(item?.rating || 0))));
      acc[bucket] += 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  );
  const ratingBars = [
    { label: 'Excellent', value: ratingCounts[5] },
    { label: 'Good', value: ratingCounts[4] },
    { label: 'Average', value: ratingCounts[3] },
    { label: 'Poor', value: ratingCounts[2] },
    { label: 'Terrible', value: ratingCounts[1] }
  ];

  const handleLikeReview = async (reviewId, reviewPartnerId) => {
    const effectivePartnerId = reviewPartnerId || partnerId;
    if (!reviewId || !effectivePartnerId) return;
    if (localLikes[reviewId]) return;
    if (!likeUserId) {
      setReviewError('Unable to identify user for like.');
      return;
    }

    setLocalLikes((prev) => {
      const next = { ...prev, [reviewId]: true };
      localStorage.setItem('reviewLikes', JSON.stringify(next));
      return next;
    });

    setReviews((prev) =>
      prev.map((item) =>
        String(item._id || item.id) === String(reviewId)
          ? { ...item, likes: Number(item.likes || 0) + 1 }
          : item
      )
    );

    try {
      const res = await axios.post(`${API_BASE_URL}/api/restaurants/${effectivePartnerId}/reviews/${reviewId}/like`, {
        userId: likeUserId
      });
      const saved = res?.data?.data;
      if (saved && (saved._id || saved.id)) {
        setReviews((prev) =>
          prev.map((item) =>
            String(item._id || item.id) === String(saved._id || saved.id)
              ? { ...item, likes: Number(saved.likes || item.likes || 0) }
              : item
          )
        );
      }
    } catch (_error) {
      setReviewError('Unable to like review right now.');
      setLocalLikes((prev) => {
        const next = { ...prev };
        delete next[reviewId];
        localStorage.setItem('reviewLikes', JSON.stringify(next));
        return next;
      });
      setReviews((prev) =>
        prev.map((item) =>
          String(item._id || item.id) === String(reviewId)
            ? { ...item, likes: Math.max(0, Number(item.likes || 0) - 1) }
            : item
        )
      );
    }
  };

  const getLikeCount = (review) => {
    const base = Number(review?.likes || 0);
    const key = review?.id || review?._id;
    const extra = key && localLikes[key] ? 1 : 0;
    return base + extra;
  };

  const handleSubmitReview = async () => {
    if (!partnerId) {
      setReviewError('Partner not selected.');
      return;
    }
    if (!userRating) {
      setReviewError('Please select a rating.');
      return;
    }
    if (!reviewText.trim()) {
      setReviewError('Please write your review.');
      return;
    }
    if (!reviewTitle.trim()) {
      setReviewError('Please add a title.');
      return;
    }
    if (!visitWith.trim()) {
      setReviewError('Please select who you went with.');
      return;
    }
    if (!reviewAgree) {
      setReviewError('Please accept the review consent.');
      return;
    }

    setIsSavingReview(true);
    setReviewError('');
    try {
      const authUser = getAuthUserFromStorage();
      let res;
      if (reviewPhotos.length) {
        const formData = new FormData();
        formData.append('rating', String(userRating));
        formData.append('visitMonth', visitMonth);
        formData.append('visitWith', visitWith);
        formData.append('text', reviewText.trim());
        formData.append('title', reviewTitle.trim());
        formData.append('agree', String(reviewAgree));
        if (authUser?._id || authUser?.id) {
          formData.append('userId', authUser?._id || authUser?.id);
        }
        if (authUser?.name || authUser?.fullName) {
          formData.append('userName', authUser?.name || authUser?.fullName);
        }
        reviewPhotos.forEach((file) => {
          formData.append('reviewPhotos', file);
        });
        res = await axios.post(`${API_BASE_URL}/api/restaurants/${partnerId}/reviews`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        const payload = {
          rating: userRating,
          visitMonth,
          visitWith,
          text: reviewText.trim(),
          title: reviewTitle.trim(),
          agree: reviewAgree,
          userId: authUser?._id || authUser?.id,
          userName: authUser?.name || authUser?.fullName || ''
        };
        res = await axios.post(`${API_BASE_URL}/api/restaurants/${partnerId}/reviews`, payload);
      }
      const saved = res?.data?.data;
      if (saved) {
        setReviews((prev) => [saved, ...prev]);
      }
      setIsReviewFormOpen(false);
      setUserRating(0);
      setVisitWith('');
      setReviewText('');
      setReviewTitle('');
      setReviewAgree(false);
      setReviewPhotos([]);
      reviewPhotoPreviews.forEach((src) => {
        if (src?.startsWith('blob:')) {
          URL.revokeObjectURL(src);
        }
      });
      setReviewPhotoPreviews([]);
    } catch (error) {
      setReviewError(error?.response?.data?.message || 'Failed to submit review.');
    } finally {
      setIsSavingReview(false);
    }
  };

  return (
    <div className="rp-main-wrapper">
      <header className="rp-header">
        <div className="rp-header-content">
          <div className="rp-nav-left">
            <button className="rp-back-btn" onClick={handleBack}>
              <ArrowLeft size={20} />
            </button>
            <div className="rp-logo">Tripspotgos</div>
          </div>
          <div className="rp-search-bar">
            <Search className="rp-s-icon" size={16} />
            <input type="text" placeholder="Search menu..." />
          </div>
          <div className="rp-nav-right">
            <button
              className="rp-redeem-nav-btn"
              onClick={handleRedeem}
            >
              Redeem
            </button>
          </div>
        </div>
      </header>

      <main className="rp-content-container">
        <section className="rp-restaurant-card">
          <div className="rp-summary-transparent-box">
            <div className="rp-summary-row">
              <div className="rp-summary-left">
                <div className="rp-summary-title-row">
                  <h1 className="rp-summary-title">{restaurantInfo.restaurantName || 'Restaurant'}</h1>
                </div>
                <div className="rp-summary-subtext-row">
                  {restaurantInfo.subtitle && (
                    <div className="rp-summary-subtext">{restaurantInfo.subtitle}</div>
                  )}
                  {foodBadgeType === 'both' && (
                    <span className="rp-summary-food-badge rp-summary-food-badge-mobile-inline both-badge" aria-label="Veg and Non-Veg">
                      <span className="food-dot veg-dot" />
                      <span className="food-dot nonveg-dot" />
                    </span>
                  )}
                  {foodBadgeType === 'veg' && (
                    <span className="rp-summary-food-badge rp-summary-food-badge-mobile-inline both-badge" aria-label="Veg">
                      <span className="food-dot veg-dot" />
                    </span>
                  )}
                  {foodBadgeType === 'nonveg' && (
                    <span className="rp-summary-food-badge rp-summary-food-badge-mobile-inline both-badge" aria-label="Non-Veg">
                      <span className="food-dot nonveg-dot" />
                    </span>
                  )}
                </div>
                <div className="rp-summary-rating">
                  <span className="rp-summary-rating-num">{Number(displayRating || 0).toFixed(1)}</span>
                  <div className="rp-summary-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className="rp-summary-star"
                        fill={star <= Math.round(Number(displayRating || 0)) ? '#7c3aed' : 'none'}
                        stroke="#7c3aed"
                      />
                    ))}
                  </div>
                  <button type="button" className="rp-summary-reviews-link">({reviewCount} reviews)</button>
                  <div className="rp-summary-inline-actions">
                    <button type="button" className="rp-summary-inline-action-btn" onClick={handleShare}>
                      <Share2 size={14} /> Share
                    </button>
                    <button type="button" className="rp-summary-inline-action-btn" onClick={openReviewForm}>
                      <Pencil size={14} /> Review
                    </button>
                  </div>
                </div>
              </div>
              <div className="rp-summary-actions">
                <button type="button" className="rp-summary-action-btn" onClick={handleShare}>
                  <Share2 size={18} /> Share
                </button>
                <button type="button" className="rp-summary-action-btn" onClick={openReviewForm}>
                  <Pencil size={18} /> Review
                </button>
                {foodBadgeType === 'both' && (
                  <span className="rp-summary-food-badge both-badge" aria-label="Veg and Non-Veg">
                    <span className="food-dot veg-dot" />
                    <span className="food-dot nonveg-dot" />
                  </span>
                )}
                {foodBadgeType === 'veg' && (
                  <span className="rp-summary-food-badge both-badge" aria-label="Veg">
                    <span className="food-dot veg-dot" />
                  </span>
                )}
                {foodBadgeType === 'nonveg' && (
                  <span className="rp-summary-food-badge both-badge" aria-label="Non-Veg">
                    <span className="food-dot nonveg-dot" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {showcaseImages.length > 0 && (
            <div className="rp-top-gallery-shell">
              <div className="rp-top-gallery">
                <div className="rp-top-main-image">
                  <img
                    src={getShowcaseImage(0)}
                    alt="Restaurant showcase"
                    onTouchStart={(e) => {
                      touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
                    }}
                    onTouchEnd={(e) => {
                      const startX = touchStartXRef.current;
                      const endX = e.changedTouches?.[0]?.clientX ?? null;
                      if (startX == null || endX == null) return;
                      const delta = endX - startX;
                      if (Math.abs(delta) < 40) return;
                      if (delta < 0) goToNextShowcase();
                      else goToPrevShowcase();
                      touchStartXRef.current = null;
                    }}
                  />
                  <button
                    type="button"
                    className="rp-showcase-nav rp-showcase-nav-left"
                    onClick={goToPrevShowcase}
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    className="rp-showcase-nav rp-showcase-nav-right"
                    onClick={goToNextShowcase}
                    aria-label="Next image"
                  >
                    <ChevronRight size={20} />
                  </button>
                  {activeShowcaseCard && (
                    <div className="rp-showcase-count">
                      <ActiveBadgeIcon size={16} />
                      <span>{activeShowcaseCard.label}</span>
                      <span>{activeShowcaseCard.count}</span>
                    </div>
                  )}
                </div>
                <div className="rp-top-side-grid">
                  {showcaseCards.map((card, idx) => {
                    const Icon = card.icon || Camera;
                    return (
                      <div key={card.label} className="rp-side-image-card">
                        <img src={card.cover || getShowcaseImage(idx + 1)} alt={card.label} />
                        <div className="rp-side-image-overlay">
                          <span>{card.label}</span>
                          <span className="rp-side-image-meta">
                            <Icon size={14} />
                            {card.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </section>

        <nav className="rp-tabs-nav">
          {tabs.map((tab) => (
            <button key={tab} className={`rp-tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </nav>

        <div className="rp-tab-panel">
          {activeTab === 'OVERVIEW' && (
            <div className="rp-overview-wrap">
              <div className="rp-overview-card">
                {restaurantInfo.description && (
                  <p className="rp-overview-desc">{restaurantInfo.description}</p>
                )}

                <div className="rp-overview-divider" />

                <div className="rp-overview-inline-row">
                  <div className="rp-overview-status-block">
                    <div className="rp-overview-place-row">
                      <span className="rp-overview-place-inline">
                        <MapPin size={14} />
                        {(restaurantInfo.location || 'mahabaleshwe').split(',')[0]}
                      </span>
                    </div>
                    <div className="rp-overview-open-inline">
                      <span className="rp-overview-open-text">Open Now</span>
                      <span className="rp-overview-time-text">
                        {formatTimeLabel(restaurantInfo.openTime, 'AM') || '9:00 AM'} - {formatTimeLabel(restaurantInfo.closeTime, 'PM') || '10:00 PM'}
                      </span>
                    </div>
                  </div>
                  <button type="button" className="rp-overview-action-btn" onClick={() => window.open(`tel:${restaurantInfo.callNumber || ''}`)}>
                    <Phone size={16} /> Call
                  </button>
                  <button type="button" className="rp-overview-action-btn" onClick={() => window.open(restaurantInfo.directionLink || 'https://maps.google.com')}>
                    <Navigation size={16} /> Directions
                  </button>
                  <button
                    type="button"
                    className="rp-overview-redeem-btn"
                    onClick={handleRedeem}
                  >
                    Redeem Now
                  </button>
                </div>
              </div>

              {overviewReviews.length > 0 && (
                <div className="rp-overview-reviews-list">
                  {overviewReviews.map((review) => (
                    <article key={review.id} className="rp-overview-review-card">
                      <div className="rp-overview-review-head">
                        <div className="rp-overview-review-user">
                          <div className="rp-overview-review-avatar" aria-hidden="true">
                            <User size={20} />
                          </div>
                          <div>
                            <h4>{review.name}</h4>
                            {review.location && <p>{review.location}</p>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`rp-overview-review-like ${localLikes[review.id || review._id] ? 'is-liked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeReview(review.id || review._id, review.partnerId);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleLikeReview(review.id || review._id, review.partnerId);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            handleLikeReview(review.id || review._id, review.partnerId);
                          }}
                          aria-label="Like review"
                          aria-pressed={Boolean(localLikes[review.id || review._id])}
                        >
                          <ThumbsUp size={16} />
                          <span>{getLikeCount(review)}</span>
                        </button>
                      </div>

                      <div className="rp-overview-review-stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={14}
                            className="rp-overview-review-star"
                            fill={n <= Math.round(review.rating || 0) ? 'currentColor' : 'none'}
                            stroke="currentColor"
                          />
                        ))}
                      </div>

                      <h5>{review.title}</h5>
                      <p className="rp-overview-review-meta">{review.meta}</p>
                      <p className="rp-overview-review-text">{review.text}</p>

                      {review.photos.filter(Boolean).length > 0 && (
                        <div className="rp-overview-review-photos">
                          {review.photos
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((src, idx) => (
                              <img key={`${review.id}-ph-${idx}`} src={src} alt={`Review ${idx + 1}`} />
                            ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'MENU' && (
            <div className="rp-menu-wrap">
              {menuData.length > 0 && (
                <>
                  <div className="rp-food-filter-row">
                    {foodFilters.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={`rp-food-pill ${foodFilter === filter ? 'active' : ''}`}
                        onClick={() => setFoodFilter(filter)}
                      >
                        {hasMenuSections ? filter : filter === 'all' ? 'All' : filter === 'veg' ? 'Veg' : 'Non-Veg'}
                      </button>
                    ))}
                  </div>
                  {(hasMenuSections && foodFilter ? menuData.filter((section) => section.category === foodFilter) : menuData).map((section, idx) => (
                    <div key={idx} className="rp-menu-section">
                      <h2 className="rp-cat-header">{section.category}</h2>
                      <div className="rp-menu-grid">
                        {(hasMenuSections ? section.items : section.items.filter((item) => foodFilter === 'all' || item.type === foodFilter || item.type === 'all'))
                          .map((item, i) => (
                            <div key={i} className="rp-menu-card">
                              {item.img && (
                                <div className="rp-menu-img-box">
                                  <img src={item.img} alt={item.name} />
                                  <div className="rp-item-discount">10% OFF</div>
                                </div>
                              )}
                              <div className="rp-menu-details">
                                <div className="rp-item-info">
                                  <h3>
                                    {item.name}
                                    {!hasMenuSections && (() => {
                                      const type = String(item.type || '').toLowerCase();
                                      if (!type) return null;
                                      if (type.includes('both')) {
                                        return (
                                          <span className="rp-food-badge both" aria-label="Veg and Non-Veg">
                                            <span className="food-dot veg-dot" />
                                            <span className="food-dot nonveg-dot" />
                                          </span>
                                        );
                                      }
                                      const isNonVeg = type.includes('non');
                                      return (
                                        <span className={`rp-food-badge ${isNonVeg ? 'nonveg' : 'veg'}`} aria-label={isNonVeg ? 'Non-Veg' : 'Veg'}>
                                          {isNonVeg ? 'Non-Veg' : 'Veg'}
                                        </span>
                                      );
                                    })()}
                                  </h3>
                                  <p>{item.desc}</p>
                                </div>
                                <div className="rp-item-price-action">
                                  <span className="rp-price">₹{item.price}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'REVIEWS' && (
            <div className="rp-reviews-section">
              <div className="rp-review-summary-card">
                <div className="rp-review-summary-head">
                  <h3>Reviews</h3>
                  <button type="button" className="rp-write-review-btn" onClick={() => { setReviewError(''); setIsReviewFormOpen(true); }}>
                    <Pencil size={16} /> Write a review
                  </button>
                </div>

                <div className="rp-review-summary-grid">
                  <div className="rp-review-score-col">
                    <div className="rp-review-score-num">{Number(displayRating || 0).toFixed(1)}</div>
                    <div className="rp-review-score-label">{ratingLabel}</div>
                    <div className="rp-review-score-dots">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={16}
                          className="rp-review-summary-star"
                          fill={n <= Math.round(Number(displayRating || 0)) ? '#7c3aed' : 'none'}
                          stroke="#7c3aed"
                        />
                      ))}
                      <span className="rp-review-total-count">({reviewCount})</span>
                    </div>
                  </div>

                  <div className="rp-review-bars-col">
                    {ratingBars.map((item) => (
                      <div key={item.label} className="rp-review-bar-row">
                        <span>{item.label}</span>
                        <div className="rp-review-track">
                          <div
                            className="rp-review-fill"
                            style={{ width: `${reviewCount ? Math.max(8, Math.min(100, (item.value / reviewCount) * 100)) : 0}%` }}
                          />
                        </div>
                        <b>{item.value}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {isReviewFormOpen && <div className="rp-review-form-card" ref={reviewFormRef}>
                <div className="rp-review-group">
                  <h3>How would you rate your experience?</h3>
                  <div className="rp-star-rating">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`rp-star-rate-btn ${userRating >= val ? 'active' : ''}`}
                        onClick={() => setUserRating(val)}
                        aria-label={`Rate ${val}`}
                      >
                        <Star size={28} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rp-review-group">
                  <h3>When did you go?</h3>
                  <select className="rp-visit-select" value={visitMonth} onChange={(e) => setVisitMonth(e.target.value)}>
                    {recentMonths.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="rp-review-group">
                  <h3>Who did you go with?</h3>
                  <div className="rp-companion-pills">
                    {companionOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`rp-companion-pill ${visitWith === item ? 'active' : ''}`}
                        onClick={() => setVisitWith(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rp-review-group">
                  <div className="rp-write-review-head">
                    <h3>Write your review</h3>
                  </div>
                  <textarea
                    className="rp-review-textarea"
                    placeholder="Share your experience..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value.slice(0, 125))}
                  />
                  <p className="rp-char-count">{reviewText.length}/125 min characters</p>
                </div>

                <div className="rp-review-group">
                  <h3>Title your review</h3>
                  <input
                    className="rp-review-title-input"
                    type="text"
                    placeholder="Give us the gist of your experience"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value.slice(0, 50))}
                  />
                  <p className="rp-char-count">{reviewTitle.length}/50 max characters</p>
                </div>

                <div className="rp-review-group">
                  <h3>Add some photos</h3>
                  <p className="rp-optional-label">Optional</p>
                  <button type="button" className="rp-review-upload-box" onClick={() => reviewPhotoInputRef.current?.click()}>
                    <Camera size={16} />
                    <strong>Click to add photos</strong>
                    <span>or drag and drop</span>
                  </button>
                  <input
                    ref={reviewPhotoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      setReviewPhotos(files);
                      const previews = files.map((file) => URL.createObjectURL(file));
                      setReviewPhotoPreviews(previews);
                      e.target.value = '';
                    }}
                  />
                  {reviewPhotoPreviews.length > 0 && (
                    <div className="rp-review-photo-preview">
                      {reviewPhotoPreviews.map((src, idx) => (
                        <img key={`${src}-${idx}`} src={src} alt={`Review upload ${idx + 1}`} />
                      ))}
                    </div>
                  )}
                </div>

                <label className="rp-review-consent">
                  <input type="checkbox" checked={reviewAgree} onChange={(e) => setReviewAgree(e.target.checked)} />
                  <span>
                    I certify that this review is based on my own experience and is my genuine opinion of this restaurant, and that I have no personal or business relationship with this establishment, and have not been offered any incentive or payment originating from the establishment to write this review. I understand that Tripadvisor has a zero-tolerance policy on fake reviews.
                  </span>
                </label>

                {reviewError && <div className="rp-review-error">{reviewError}</div>}
                <button type="button" className="rp-review-continue-btn" disabled={isSavingReview} onClick={handleSubmitReview}>
                  {isSavingReview ? 'Posting...' : 'Post Review'}
                </button>
              </div>}

              {reviewCards.length > 0 && (
                <div className="rp-overview-reviews-list">
                  {reviewCards.map((review) => (
                    <article key={review.id} className="rp-overview-review-card">
                      <div className="rp-overview-review-head">
                        <div className="rp-overview-review-user">
                          <div className="rp-overview-review-avatar" aria-hidden="true">
                            <User size={20} />
                          </div>
                          <div>
                            <h4>{review.name}</h4>
                            {review.location && <p>{review.location}</p>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`rp-overview-review-like ${localLikes[review.id || review._id] ? 'is-liked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeReview(review.id || review._id, review.partnerId);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleLikeReview(review.id || review._id, review.partnerId);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            handleLikeReview(review.id || review._id, review.partnerId);
                          }}
                          aria-label="Like review"
                          aria-pressed={Boolean(localLikes[review.id || review._id])}
                        >
                          <ThumbsUp size={16} />
                          <span>{getLikeCount(review)}</span>
                        </button>
                      </div>

                      <div className="rp-overview-review-stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={14}
                            className="rp-overview-review-star"
                            fill={n <= Math.round(review.rating || 0) ? 'currentColor' : 'none'}
                            stroke="currentColor"
                          />
                        ))}
                      </div>

                      <h5>{review.title}</h5>
                      <p className="rp-overview-review-meta">{review.meta}</p>
                      <p className="rp-overview-review-text">{review.text}</p>

                      {review.photos.filter(Boolean).length > 0 && (
                        <div className="rp-overview-review-photos">
                          {review.photos
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((src, idx) => (
                              <img key={`${review.id}-ph-${idx}`} src={src} alt={`Review ${idx + 1}`} />
                            ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'PHOTOS' && (
            <div className="rp-photos-wrap">
              <div className="rp-photo-actions">
                <button type="button" className="rp-upload-card" disabled={isUploadingMedia} onClick={() => photoInputRef.current?.click()}>
                  <div className="rp-up-icon-box"><Camera size={24} /></div>
                  <span>Add Photo</span>
                </button>
                <button type="button" className="rp-upload-card" disabled={isUploadingMedia} onClick={() => videoInputRef.current?.click()}>
                  <div className="rp-up-icon-box"><Video size={24} /></div>
                  <span>Add Video</span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    addFilesToGallery(e.target.files, 'image');
                    e.target.value = '';
                  }}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    addFilesToGallery(e.target.files, 'video');
                    e.target.value = '';
                  }}
                />
              </div>
              {galleryItems.length > 0 ? (
                <div className="rp-photo-gallery">
                  {galleryItems.map((item, index) => (
                    <div className="rp-gallery-item" key={`${item.src}-${index}`}>
                      {item.type === 'video' ? (
                        <video src={item.src} controls playsInline preload="metadata" />
                      ) : (
                        <img src={item.src} alt={`Photo ${index + 1}`} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rp-empty-state">No photos available.</div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default RestaurantPage;
