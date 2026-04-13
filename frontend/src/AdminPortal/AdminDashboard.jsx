import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const initialForm = {
    restaurantName: '',
    ownerName: '',
    resMobile: '',
    ownerMobile: '',
    businessCategory: 'Food & Dining',
    email: '',
    password: '',
    area: '',
    latitude: '',
    longitude: '',
    totalDiscount: '',
    customerDiscount: '',
    platformCommission: ''
};

const AdminDashboard = () => {
    const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY || '';
    const [view, setView] = useState('list');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [partnerCategoryFilter, setPartnerCategoryFilter] = useState('All Categories');
    const [partners, setPartners] = useState([]);
    const [loggedInUsers, setLoggedInUsers] = useState([]);
    const [userStatsById, setUserStatsById] = useState({});
    const [quickTab, setQuickTab] = useState('overview');
    const [partnerSearch, setPartnerSearch] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [nowTick, setNowTick] = useState(() => Date.now());
    const navigate = useNavigate();
    const [dashboardStats, setDashboardStats] = useState({
        loggedInUsers: 0,
        totalRevenue: 0,
        netRevenue: 0,
        totalTransactions: 0,
        todayActiveUsers: 0,
        todayActivePartners: 0,
        todayRevenue: 0,
        todayNetRevenue: 0,
        todayTransactions: 0
    });
    const [formData, setFormData] = useState(initialForm);
    const [resImageFile, setResImageFile] = useState(null);
    const [loadingList, setLoadingList] = useState(true);
    const [savingPartner, setSavingPartner] = useState(false);
    const [membershipPlans, setMembershipPlans] = useState([]);
    const [membershipLoading, setMembershipLoading] = useState(false);
    const [membershipSaving, setMembershipSaving] = useState(false);
    const [showMembershipForm, setShowMembershipForm] = useState(false);
    const [membershipForm, setMembershipForm] = useState({
        title: '',
        price: '',
        billingCycle: '',
        durationHours: 48,
        badge: '',
        ctaText: '',
        sortOrder: 0,
        isActive: true,
        featuresList: ['']
    });
    const [editingMembershipId, setEditingMembershipId] = useState(null);
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const mapMarkerRef = useRef(null);
    const [locationQuery, setLocationQuery] = useState('');
    const [locationError, setLocationError] = useState('');
    const [geocoding, setGeocoding] = useState(false);

    const fetchDashboard = async () => {
        try {
            setLoadingList(true);
            const [statsRes, partnersRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/admin/dashboard-stats`),
                axios.get(`${API_BASE_URL}/api/admin/partners`)
            ]);

            setDashboardStats({
                loggedInUsers: Number(statsRes?.data?.stats?.loggedInUsers || 0),
                totalRevenue: Number(statsRes?.data?.stats?.totalRevenue || 0),
                netRevenue: Number(statsRes?.data?.stats?.netRevenue || 0),
                totalTransactions: Number(statsRes?.data?.stats?.totalTransactions || 0),
                todayActiveUsers: Number(statsRes?.data?.stats?.todayActiveUsers || 0),
                todayActivePartners: Number(statsRes?.data?.stats?.todayActivePartners || 0),
                todayRevenue: Number(statsRes?.data?.stats?.todayRevenue || 0),
                todayNetRevenue: Number(statsRes?.data?.stats?.todayNetRevenue || 0),
                todayTransactions: Number(statsRes?.data?.stats?.todayTransactions || 0)
            });
            setLoggedInUsers(statsRes?.data?.users || []);
            setUserStatsById(statsRes?.data?.userStats || {});
            setPartners(Array.isArray(partnersRes?.data) ? partnersRes.data : []);
        } catch (error) {
            alert(error?.response?.data?.message || 'Error loading admin dashboard data');
        } finally {
            setLoadingList(false);
        }
    };

    const fetchMembershipPlans = async () => {
        try {
            setMembershipLoading(true);
            let list = [];
            try {
                const res = await axios.get(`${API_BASE_URL}/api/memberships/all`);
                list = Array.isArray(res?.data?.data) ? res.data.data : [];
            } catch (_allError) {
                const res = await axios.get(`${API_BASE_URL}/api/memberships`);
                list = Array.isArray(res?.data?.data) ? res.data.data : [];
            }
            setMembershipPlans(list);
        } catch (_error) {
            alert('Error loading membership plans');
        } finally {
            setMembershipLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    useEffect(() => {
        if (quickTab === 'memberships' || quickTab === 'members') {
            fetchMembershipPlans();
        }
    }, [quickTab]);

    useEffect(() => {
        const timer = setInterval(() => setNowTick(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (view !== 'add') return;
        const L = window?.L;
        if (!L || !mapContainerRef.current || mapInstanceRef.current) return;

        const defaultCenter = [17.9237, 73.8007];
        const map = L.map(mapContainerRef.current, {
            center: defaultCenter,
            zoom: 12,
            scrollWheelZoom: false
        });
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker(defaultCenter, { draggable: true }).addTo(map);
        mapMarkerRef.current = marker;

        const syncCoords = (latlng) => {
            setFormData((prev) => ({
                ...prev,
                latitude: latlng.lat.toFixed(6),
                longitude: latlng.lng.toFixed(6)
            }));
        };

        const setMapPoint = (lat, lng) => {
            const next = { lat, lng };
            if (mapMarkerRef.current) {
                mapMarkerRef.current.setLatLng(next);
            }
            map.setView(next, Math.max(map.getZoom(), 14), { animate: true });
            syncCoords(next);
        };

        marker.on('dragend', (event) => {
            const latlng = event?.target?.getLatLng ? event.target.getLatLng() : null;
            if (latlng) syncCoords(latlng);
        });

        map.on('click', (event) => {
            if (!event?.latlng) return;
            setMapPoint(event.latlng.lat, event.latlng.lng);
        });

        syncCoords({ lat: defaultCenter[0], lng: defaultCenter[1] });
        setTimeout(() => {
            map.invalidateSize();
        }, 0);
    }, [view]);

    useEffect(() => {
        if (view === 'add') return;
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            mapMarkerRef.current = null;
        }
    }, [view]);

    const parseLatLngFromQuery = (query) => {
        if (!query) return null;
        const trimmed = String(query).trim();
        const coordMatch = trimmed.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
        if (coordMatch) {
            const lat = Number(coordMatch[1]);
            const lng = Number(coordMatch[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        }

        const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
        if (atMatch) {
            const lat = Number(atMatch[1]);
            const lng = Number(atMatch[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        }

        const queryMatch = trimmed.match(/[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
        if (queryMatch) {
            const lat = Number(queryMatch[1]);
            const lng = Number(queryMatch[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        }

        return null;
    };

    const handleLocationSearch = async (event) => {
        if (event?.preventDefault) event.preventDefault();
        const query = String(locationQuery || '').trim();
        if (!query) return;
        setLocationError('');
        setGeocoding(true);
        try {
            let lat = null;
            let lng = null;
            const directCoords = parseLatLngFromQuery(query);
            if (directCoords) {
                lat = directCoords.lat;
                lng = directCoords.lng;
            } else if (GEOAPIFY_KEY) {
                const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&limit=1&format=json&apiKey=${GEOAPIFY_KEY}`;
                const response = await fetch(url);
                const data = await response.json();
                const hit = Array.isArray(data?.results) && data.results[0] ? data.results[0] : null;
                lat = Number(hit?.lat);
                lng = Number(hit?.lon);
            } else {
                const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
                const response = await fetch(url, {
                    headers: { 'Accept-Language': 'en' }
                });
                const data = await response.json();
                const hit = Array.isArray(data) && data[0] ? data[0] : null;
                lat = Number(hit?.lat);
                lng = Number(hit?.lon);
            }
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                setLocationError('Location not found. Try a more specific address.');
                return;
            }
            if (mapMarkerRef.current && mapInstanceRef.current) {
                mapMarkerRef.current.setLatLng({ lat, lng });
                mapInstanceRef.current.setView({ lat, lng }, Math.max(mapInstanceRef.current.getZoom(), 14), { animate: true });
            }
            setFormData((prev) => ({
                ...prev,
                latitude: lat.toFixed(6),
                longitude: lng.toFixed(6)
            }));
        } catch (_error) {
            setLocationError('Unable to search location right now.');
        } finally {
            setGeocoding(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    const handleViewChange = (nextView) => {
        setView(nextView);
        setMobileNavOpen(false);
    };

    const handleStatusChange = async (id, status) => {
        try {
            await axios.put(`${API_BASE_URL}/api/admin/update-status/${id}`, { status });
            await fetchDashboard();
        } catch (error) {
            alert(error?.response?.data?.message || 'Error updating partner status');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this partner?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/admin/delete-partner/${id}`);
            await fetchDashboard();
        } catch (error) {
            alert(error?.response?.data?.message || 'Error deleting partner');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const next = { ...prev, [name]: value };
            if (name === 'totalDiscount' || name === 'customerDiscount') {
                const total = Number(next.totalDiscount || 0);
                const customer = Number(next.customerDiscount || 0);
                const platform = Math.max(total - customer, 0);
                next.platformCommission = Number.isFinite(platform) ? platform : '';
            }
            return next;
        });
    };

    const handleAddPartner = async (e) => {
        e.preventDefault();
        try {
            setSavingPartner(true);
            const payload = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                payload.append(key, value);
            });
            if (resImageFile) payload.append('resImage', resImageFile);

            await axios.post(`${API_BASE_URL}/api/admin/add-partner`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setFormData(initialForm);
            setResImageFile(null);
            setView('list');
            await fetchDashboard();
        } catch (error) {
            const backendMessage = error?.response?.data?.message;
            const backendError = error?.response?.data?.error;
            alert(backendError ? `${backendMessage}: ${backendError}` : (backendMessage || 'Error adding partner'));
        } finally {
            setSavingPartner(false);
        }
    };

    const handleUserDelete = async (id) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/admin/delete-user/${id}`);
            await fetchDashboard();
        } catch (error) {
            alert(error?.response?.data?.message || 'Error deleting user');
        }
    };

    const handleMembershipChange = (e) => {
        const { name, value, type, checked } = e.target;
        setMembershipForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const resetMembershipForm = () => {
        setMembershipForm({
            title: '',
            price: '',
            billingCycle: '',
            durationHours: 48,
            badge: '',
            ctaText: '',
            sortOrder: 0,
            isActive: true,
            featuresList: ['']
        });
        setEditingMembershipId(null);
    };

    const handleMembershipSubmit = async (e) => {
        e.preventDefault();
        const title = String(membershipForm.title || '').trim();
        if (!title) {
            alert('Membership title is required');
            return;
        }

        const price = Number(membershipForm.price);
        if (!Number.isFinite(price) || price < 0) {
            alert('Valid price is required');
            return;
        }

        const payload = {
            title,
            price,
            billingCycle: String(membershipForm.billingCycle || '').trim(),
            durationHours: Number(membershipForm.durationHours) || 48,
            badge: String(membershipForm.badge || '').trim(),
            ctaText: String(membershipForm.ctaText || '').trim(),
            sortOrder: Number(membershipForm.sortOrder) || 0,
            isActive: Boolean(membershipForm.isActive),
            features: Array.isArray(membershipForm.featuresList)
                ? membershipForm.featuresList.map((line) => String(line || '').trim()).filter(Boolean)
                : []
        };

        try {
            setMembershipSaving(true);
            if (editingMembershipId) {
                await axios.put(`${API_BASE_URL}/api/memberships/${editingMembershipId}`, payload);
            } else {
                await axios.post(`${API_BASE_URL}/api/memberships`, payload);
            }
            await fetchMembershipPlans();
            resetMembershipForm();
            setShowMembershipForm(false);
        } catch (error) {
            alert(error?.response?.data?.message || 'Error saving membership plan');
        } finally {
            setMembershipSaving(false);
        }
    };

    const handleMembershipEdit = (plan) => {
        const planId = plan?._id || plan?.id || null;
        setEditingMembershipId(planId);
        setMembershipForm({
            title: plan?.title || '',
            price: plan?.price ?? '',
            billingCycle: plan?.billingCycle || '',
            durationHours: plan?.durationHours || 48,
            badge: plan?.badge || '',
            ctaText: plan?.ctaText || '',
            sortOrder: plan?.sortOrder || 0,
            isActive: plan?.isActive !== false,
            featuresList: Array.isArray(plan?.features) && plan.features.length ? plan.features : ['']
        });
        setQuickTab('memberships');
    };

    const handleMembershipDelete = async (id) => {
        if (!id) {
            alert('Membership id missing');
            return;
        }
        if (!window.confirm('Delete this membership plan?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/memberships/${id}`);
            await fetchMembershipPlans();
        } catch (error) {
            alert(error?.response?.data?.message || 'Error deleting membership plan');
        }
    };

    const handleMembershipToggle = async (plan) => {
        const planId = plan?._id || plan?.id;
        if (!planId) {
            alert('Membership id missing');
            return;
        }
        try {
            await axios.put(`${API_BASE_URL}/api/memberships/${planId}`, {
                isActive: !(plan?.isActive !== false)
            });
            await fetchMembershipPlans();
        } catch (_error) {
            alert('Error updating membership status');
        }
    };

    const addFeatureField = () => {
        setMembershipForm((prev) => ({
            ...prev,
            featuresList: [...(prev.featuresList || []), '']
        }));
    };

    const updateFeatureField = (idx, value) => {
        setMembershipForm((prev) => {
            const next = [...(prev.featuresList || [])];
            next[idx] = value;
            return { ...prev, featuresList: next };
        });
    };

    const removeFeatureField = (idx) => {
        setMembershipForm((prev) => {
            const next = [...(prev.featuresList || [])];
            next.splice(idx, 1);
            return { ...prev, featuresList: next.length ? next : [''] };
        });
    };


    const formattedUsers = useMemo(
        () =>
            loggedInUsers.map((user) => ({
                ...user,
                formattedLastLogin: user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-',
                formattedCreatedAt: user?.createdAt ? new Date(user.createdAt).toLocaleString() : '-'
            })),
        [loggedInUsers]
    );

    const partnerCategoryOptions = useMemo(() => {
        const unique = Array.from(
            new Set(
                partners
                    .map((partner) => String(partner?.businessCategory || '').trim())
                    .filter(Boolean)
            )
        );
        return ['All Categories', ...unique];
    }, [partners]);

    const membershipPriceByTitle = useMemo(() => {
        const map = new Map();
        membershipPlans.forEach((plan) => {
            const title = String(plan?.title || '').trim().toLowerCase();
            if (title) map.set(title, Number(plan?.price ?? 0));
        });
        return map;
    }, [membershipPlans]);

    const filteredPartners = useMemo(() => {
        if (partnerCategoryFilter === 'All Categories') return partners;
        return partners.filter(
            (partner) => String(partner?.businessCategory || '').trim() === partnerCategoryFilter
        );
    }, [partners, partnerCategoryFilter]);

    const searchedPartners = useMemo(() => {
        const query = partnerSearch.trim().toLowerCase();
        if (!query) return filteredPartners;
        return filteredPartners.filter((partner) => {
            const name = String(partner?.restaurantName || '').toLowerCase();
            const owner = String(partner?.ownerName || '').toLowerCase();
            const area = String(partner?.area || '').toLowerCase();
            return name.includes(query) || owner.includes(query) || area.includes(query);
        });
    }, [filteredPartners, partnerSearch]);

    const membersList = useMemo(() => {
        const query = memberSearch.trim().toLowerCase();
        const parseDate = (value) => {
            if (!value) return null;
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        };
        const parseObjectIdDate = (value) => {
            const raw = typeof value === 'string' ? value : '';
            if (raw.length < 8) return null;
            const ts = Number.parseInt(raw.slice(0, 8), 16);
            if (!Number.isFinite(ts)) return null;
            const parsed = new Date(ts * 1000);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        };
        const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);
        const formatDateTime = (date) =>
            date
                ? date.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
                : '-';

        return formattedUsers
            .map((user) => {
                const activatedAt = parseDate(user?.membershipActivatedAt);
                const createdAt = parseDate(user?.createdAt);
                const expiresAt = parseDate(user?.membershipExpiresAt);
                const fallbackIdDate = parseObjectIdDate(String(user?.id || user?._id || ''));

                const joinBase = createdAt || activatedAt || fallbackIdDate || null;
                const joinDate = formatDateTime(joinBase);

                const expiryDateValue = expiresAt || (joinBase ? addHours(joinBase, 48) : null);
                const expiryDate = formatDateTime(expiryDateValue);
                const lastSeenAt = parseDate(user?.lastSeen);
                const isActive = Boolean(user?.isOnline) && lastSeenAt
                    ? (Date.now() - lastSeenAt.getTime()) <= 60000
                    : Boolean(user?.isOnline);
                const remainingMs = expiryDateValue ? expiryDateValue.getTime() - nowTick : null;
                const remaining = remainingMs === null
                    ? '-'
                    : remainingMs <= 0
                        ? 'Expired'
                        : (() => {
                            const totalSeconds = Math.floor(remainingMs / 1000);
                            const hours = Math.floor(totalSeconds / 3600);
                            const minutes = Math.floor((totalSeconds % 3600) / 60);
                            const seconds = totalSeconds % 60;
                            return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
                        })();
                const plan = String(user?.membershipPlan || '').toLowerCase();
                const isFreePlan = !plan || plan.includes('free');
                const type = isFreePlan ? 'Free' : (plan.includes('family') ? 'Family' : 'Single');
                const typeKey = isFreePlan ? 'free' : (plan.includes('family') ? 'family' : 'single');
                const planAmount = isFreePlan ? 0 : (membershipPriceByTitle.get(plan) ?? null);
                const stat = userStatsById[String(user.id)] || {};
                return {
                    id: user.id,
                    name: user.name || '-',
                    mobile: user.mobile || user.mobileNumber || '-',
                    email: user.email || '-',
                    type,
                    typeKey,
                    planAmount,
                    joinDate,
                    expiryDate,
                    remaining,
                    status: isActive ? 'Active' : 'Inactive',
                    transactions: Number(user.transactions ?? stat.totalTransactions ?? 0),
                    totalSaved: Number(user.totalSaved ?? stat.totalSavings ?? 0)
                };
            })
            .filter((member) => {
                if (!query) return true;
                const name = String(member.name || '').toLowerCase();
                const mobile = String(member.mobile || '').toLowerCase();
                return name.includes(query) || mobile.includes(query);
            });
    }, [formattedUsers, memberSearch, userStatsById, nowTick, membershipPriceByTitle]);

    return (
        <div className="admin-dashboard">
            <header className="admin-topbar">
                <div className="admin-topbar-left">
                    <div className="admin-logo">
                        <span className="admin-logo-mark" aria-hidden="true">
                            <i className="fa-solid fa-grid-2"></i>
                        </span>
                        <div className="admin-logo-text">
                            <h1>Main Admin Panel</h1>
                            <p>Panchgani Tourist Membership</p>
                        </div>
                    </div>
                </div>
                <div className="admin-topbar-right">
                    <button
                        type="button"
                        className="admin-topbar-action"
                        onClick={() => handleViewChange(view === 'add' ? 'list' : 'add')}
                    >
                        <i className={`fa-solid ${view === 'add' ? 'fa-xmark' : 'fa-user-plus'}`}></i>
                        {view === 'add' ? 'Close Form' : 'Add New Partner'}
                    </button>
                    <button type="button" className="admin-topbar-icon-btn" aria-label="Notifications">
                        <i className="fa-regular fa-bell"></i>
                        <span className="admin-topbar-dot" aria-hidden="true"></span>
                    </button>
                    <button type="button" className="admin-topbar-icon-btn" aria-label="Settings">
                        <i className="fa-solid fa-gear"></i>
                    </button>
                    <button type="button" className="admin-topbar-icon-btn" aria-label="Logout" onClick={handleLogout}>
                        <i className="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </header>

            <div className="admin-body">
                <main className="content">
                    {view === 'list' ? (
                        <div className="partner-list-view">
                        <div className="admin-stats-row">
                            <div className="admin-stat-card">
                                <p>Logged In Users</p>
                                <h4>{dashboardStats.loggedInUsers}</h4>
                            </div>

                            <div className="admin-stat-card">
                                <p>Total Partners</p>
                                <h4>{partners.length}</h4>
                            </div>

                            <div className="admin-stat-card">
                                <p>Total Revenue</p>
                                <h4>Rs. {dashboardStats.totalRevenue}</h4>
                            </div>

                            <div className="admin-stat-card">
                                <p>Total Transactions</p>
                                <h4>{dashboardStats.totalTransactions}</h4>
                            </div>

                            <div className="admin-stat-card">
                                <p>Net Revenue</p>
                                <h4>Rs. {dashboardStats.netRevenue}</h4>
                            </div>
                        </div>

                        <div className="admin-today-row">
                            <div className="admin-today-card">
                                <p>Today&apos;s Active Users</p>
                                <h4>{dashboardStats.todayActiveUsers}</h4>
                            </div>
                            <div className="admin-today-card">
                                <p>Today&apos;s Active Partners</p>
                                <h4>{dashboardStats.todayActivePartners}</h4>
                            </div>
                            <div className="admin-today-card">
                                <p>Today&apos;s Revenue</p>
                                <h4>Rs. {dashboardStats.todayRevenue}</h4>
                            </div>
                            <div className="admin-today-card">
                                <p>Today&apos;s Net Revenue</p>
                                <h4>Rs. {dashboardStats.todayNetRevenue}</h4>
                            </div>
                            <div className="admin-today-card">
                                <p>Today&apos;s Transactions</p>
                                <h4>{dashboardStats.todayTransactions}</h4>
                            </div>
                        </div>

                        <div className="admin-quick-nav">
                            <button
                                type="button"
                                className={`admin-quick-pill ${quickTab === 'overview' ? 'active' : ''}`}
                                onClick={() => setQuickTab('overview')}
                            >
                                <i className="fa-regular fa-chart-bar"></i>
                                Overview
                            </button>
                            <button
                                type="button"
                                className={`admin-quick-pill ${quickTab === 'partners' ? 'active' : ''}`}
                                onClick={() => setQuickTab('partners')}
                            >
                                <i className="fa-solid fa-building"></i>
                                Partners
                            </button>
                            <button
                                type="button"
                                className={`admin-quick-pill ${quickTab === 'members' ? 'active' : ''}`}
                                onClick={() => setQuickTab('members')}
                            >
                                <i className="fa-regular fa-user"></i>
                                Members
                            </button>
                        </div>

                        {quickTab === 'memberships' ? (
                            <div className="members-card">
                                <div className="members-card-header">
                                    <div>
                                        <h3>Membership Plans</h3>
                                    </div>
                                    <div className="members-toolbar">
                                        <button type="button" className="members-export-btn" onClick={resetMembershipForm}>
                                            <i className="fa-solid fa-rotate-left"></i>
                                            Reset Form
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-plan-grid" style={{ marginTop: '18px' }}>
                                    {membershipPlans.length > 0 ? (
                                        membershipPlans.map((plan, index) => {
                                            const planId = plan?._id || plan?.id || `${index}`;
                                            const title = String(plan?.title || '').trim() || 'Untitled Plan';
                                            const price = Number(plan?.price || 0);
                                            const billingCycle = String(plan?.billingCycle || '').trim();
                                            const badgeText = String(plan?.badge || '').trim();
                                            const durationHours = Number(plan?.durationHours || 0) || 48;
                                            const sortOrder = plan?.sortOrder ?? 0;
                                            const isActive = plan?.isActive !== false;
                                            const features = Array.isArray(plan?.features) ? plan.features : [];
                                            const isFamily = title.toLowerCase().includes('family');
                                            const toneClass = isFamily ? 'tone-green' : 'tone-blue';
                                            const isEditing = editingMembershipId === planId;
                                            const days = Number.isFinite(durationHours) ? durationHours / 24 : 0;
                                            const durationLabel = Number.isFinite(days) && Number.isInteger(days) && days > 0
                                                ? `${days} Day${days === 1 ? '' : 's'} (${durationHours} Hours)`
                                                : `${durationHours} Hours`;
                                            return (
                                                <div key={planId} className={`admin-plan-shell ${toneClass}`}>
                                                    <div className={`admin-plan-card ${toneClass} ${isActive ? '' : 'is-inactive'}`}>
                                                        <div className={`admin-plan-badge ${badgeText ? '' : 'is-hidden'}`}>{badgeText || 'Popular'}</div>
                                                        <div className={`admin-plan-visual ${toneClass}`}>
                                                            <i className={`fa-solid ${isFamily ? 'fa-users' : 'fa-user'}`}></i>
                                                        </div>
                                                        {isEditing ? (
                                                            <form className="admin-plan-edit-form" onSubmit={handleMembershipSubmit}>
                                                                <div className="admin-plan-edit-grid">
                                                                    <label>Title</label>
                                                                    <input name="title" value={membershipForm.title} onChange={handleMembershipChange} required />
                                                                    <label>Price</label>
                                                                    <input name="price" type="number" min="0" step="0.01" value={membershipForm.price} onChange={handleMembershipChange} required />
                                                                    <label>Billing</label>
                                                                    <input name="billingCycle" value={membershipForm.billingCycle} onChange={handleMembershipChange} />
                                                                    <label>Hours</label>
                                                                    <input name="durationHours" type="number" min="1" value={membershipForm.durationHours} onChange={handleMembershipChange} />
                                                                    <label>Badge</label>
                                                                    <input name="badge" value={membershipForm.badge} onChange={handleMembershipChange} />
                                                                    <label>CTA</label>
                                                                    <input name="ctaText" value={membershipForm.ctaText} onChange={handleMembershipChange} />
                                                                    <label>Sort</label>
                                                                    <input name="sortOrder" type="number" step="1" value={membershipForm.sortOrder} onChange={handleMembershipChange} />
                                                                    <label className="edit-toggle-label">Active</label>
                                                                    <label className="toggle-switch">
                                                                        <input name="isActive" type="checkbox" checked={membershipForm.isActive} onChange={handleMembershipChange} />
                                                                        <span className="toggle-slider"></span>
                                                                    </label>
                                                                    <div className="full-width feature-field-group">
                                                                        <div className="feature-field-header">
                                                                            <label>Features</label>
                                                                            <button type="button" className="feature-add-btn" onClick={addFeatureField}>
                                                                                <i className="fa-solid fa-plus"></i>
                                                                                Add
                                                                            </button>
                                                                        </div>
                                                                        <div className="feature-field-list">
                                                                            {(membershipForm.featuresList || ['']).map((feature, idx) => (
                                                                                <div key={`edit-feature-${idx}`} className="feature-field-row">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={feature}
                                                                                        onChange={(e) => updateFeatureField(idx, e.target.value)}
                                                                                        placeholder="Feature detail"
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        className="feature-remove-btn"
                                                                                        onClick={() => removeFeatureField(idx)}
                                                                                        aria-label="Remove feature"
                                                                                    >
                                                                                        <i className="fa-solid fa-xmark"></i>
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="admin-plan-edit-actions">
                                                                    <button type="submit" className="save-btn" disabled={membershipSaving}>
                                                                        {membershipSaving ? 'Saving...' : 'Update Plan'}
                                                                    </button>
                                                                    <button type="button" className="members-delete-btn admin-plan-cancel" onClick={resetMembershipForm}>
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        ) : (
                                                            <>
                                                                <h4>{title}</h4>
                                                                <div className="admin-plan-price">
                                                                    ₹{price}
                                                                    <span>{billingCycle ? `/${billingCycle}` : ''}</span>
                                                                </div>
                                                                <ul className="admin-plan-features">
                                                                    {features.length > 0 ? (
                                                                        features.map((feature, idx) => (
                                                                            <li key={`${planId}-${idx}`}>{feature}</li>
                                                                        ))
                                                                    ) : (
                                                                        <li>No feature list added yet</li>
                                                                    )}
                                                                    <li>Valid for {durationLabel}</li>
                                                                    <li>Sort order: {sortOrder}</li>
                                                                    <li>Status: {isActive ? 'Active' : 'Inactive'}</li>
                                                                </ul>
                                                            </>
                                                        )}
                                                    </div>
                                                    {!isEditing && (
                                                        <div className="admin-plan-actions admin-plan-actions-outside">
                                                            <button type="button" className="members-delete-btn" onClick={() => handleMembershipEdit({ ...plan, _id: planId })}>
                                                                Edit
                                                            </button>
                                                            <button type="button" className="members-delete-btn" onClick={() => handleMembershipToggle({ ...plan, _id: planId })}>
                                                                {isActive ? 'Disable' : 'Enable'}
                                                            </button>
                                                            <button type="button" className="members-delete-btn" onClick={() => handleMembershipDelete(planId)}>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="admin-plan-empty">
                                            {membershipLoading ? 'Loading...' : 'No membership plans found.'}
                                        </div>
                                    )}
                                    <div className="admin-plan-shell admin-plan-add">
                                        <div className="admin-plan-card admin-plan-add-card">
                                            <div className="admin-plan-visual tone-blue">
                                                <i className="fa-solid fa-plus"></i>
                                            </div>
                                            {showMembershipForm && !editingMembershipId ? (
                                                <form className="admin-plan-edit-form" onSubmit={handleMembershipSubmit}>
                                                    <div className="admin-plan-edit-grid">
                                                        <label>Title</label>
                                                        <input name="title" value={membershipForm.title} onChange={handleMembershipChange} required />
                                                        <label>Price</label>
                                                        <input name="price" type="number" min="0" step="0.01" value={membershipForm.price} onChange={handleMembershipChange} required />
                                                        <label>Billing</label>
                                                        <input name="billingCycle" value={membershipForm.billingCycle} onChange={handleMembershipChange} />
                                                        <label>Hours</label>
                                                        <input name="durationHours" type="number" min="1" value={membershipForm.durationHours} onChange={handleMembershipChange} />
                                                        <label>Badge</label>
                                                        <input name="badge" value={membershipForm.badge} onChange={handleMembershipChange} />
                                                        <label>CTA</label>
                                                        <input name="ctaText" value={membershipForm.ctaText} onChange={handleMembershipChange} />
                                                        <label>Sort</label>
                                                        <input name="sortOrder" type="number" step="1" value={membershipForm.sortOrder} onChange={handleMembershipChange} />
                                                        <label className="edit-toggle-label">Active</label>
                                                        <label className="toggle-switch">
                                                            <input name="isActive" type="checkbox" checked={membershipForm.isActive} onChange={handleMembershipChange} />
                                                            <span className="toggle-slider"></span>
                                                        </label>
                                                        <div className="full-width feature-field-group">
                                                            <div className="feature-field-header">
                                                                <label>Features</label>
                                                                <button type="button" className="feature-add-btn" onClick={addFeatureField}>
                                                                    <i className="fa-solid fa-plus"></i>
                                                                    Add
                                                                </button>
                                                            </div>
                                                            <div className="feature-field-list">
                                                                {(membershipForm.featuresList || ['']).map((feature, idx) => (
                                                                    <div key={`add-feature-${idx}`} className="feature-field-row">
                                                                        <input
                                                                            type="text"
                                                                            value={feature}
                                                                            onChange={(e) => updateFeatureField(idx, e.target.value)}
                                                                            placeholder="Feature detail"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            className="feature-remove-btn"
                                                                            onClick={() => removeFeatureField(idx)}
                                                                            aria-label="Remove feature"
                                                                        >
                                                                            <i className="fa-solid fa-xmark"></i>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="admin-plan-edit-actions">
                                                        <button type="submit" className="save-btn" disabled={membershipSaving}>
                                                            {membershipSaving ? 'Saving...' : 'Add Plan'}
                                                        </button>
                                                        <button type="button" className="members-delete-btn admin-plan-cancel" onClick={() => setShowMembershipForm(false)}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <>
                                                    <h4>Add Plan</h4>
                                                    <p className="admin-plan-add-text">Create a new membership plan.</p>
                                                    <button
                                                        type="button"
                                                        className="members-add-btn"
                                                        onClick={() => {
                                                            resetMembershipForm();
                                                            setShowMembershipForm(true);
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-plus"></i>
                                                        Add Plan
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : quickTab === 'partners' ? (
                            <div className="partners-card">
                                <div className="partners-card-header">
                                    <h3>All Partners</h3>
                                    <div className="partners-toolbar">
                                        <div className="partners-search">
                                            <i className="fa-solid fa-magnifying-glass"></i>
                                            <input
                                                type="text"
                                                placeholder="Search partners..."
                                                value={partnerSearch}
                                                onChange={(e) => setPartnerSearch(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="partners-add-btn"
                                            onClick={() => handleViewChange('add')}
                                        >
                                            <i className="fa-solid fa-plus"></i>
                                            Add Partner
                                        </button>
                                    </div>
                                </div>

                                <div className="table-scroll">
                                    <table className="partners-table">
                                        <thead>
                                            <tr>
                                                <th>Partner</th>
                                                <th>Contact</th>
                                                <th>Category</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {searchedPartners.length > 0 ? (
                                                searchedPartners.map((partner) => (
                                                    <tr key={partner._id}>
                                                        <td>
                                                            <div className="partner-name">
                                                                <span>{partner.restaurantName || '-'}</span>
                                                            </div>
                                                        </td>
                                                        <td>{partner.email || '-'}</td>
                                                        <td>
                                                            <span className="category-pill">
                                                                {partner.businessCategory || '-'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`status-pill ${String(partner.status || '').toLowerCase()}`}>
                                                                {String(partner.status || 'Pending').toLowerCase()}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="partner-actions">
                                                                {partner.status !== 'Active' && (
                                                                    <button
                                                                        type="button"
                                                                        className="save-btn partner-action-btn"
                                                                        onClick={() => handleStatusChange(partner._id, 'Active')}
                                                                    >
                                                                        Activate
                                                                    </button>
                                                                )}
                                                                {partner.status !== 'Blocked' && (
                                                                    <button
                                                                        type="button"
                                                                        className="delete-btn partner-action-btn"
                                                                        onClick={() => handleStatusChange(partner._id, 'Blocked')}
                                                                    >
                                                                        Block
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="delete-btn partner-action-btn"
                                                                    onClick={() => handleDelete(partner._id)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="partner-next-btn"
                                                                aria-label="Next"
                                                                onClick={() => {
                                                                    const payload = { partnerId: partner._id, partner };
                                                                    localStorage.setItem('adminSelectedPartner', JSON.stringify(partner));
                                                                    navigate('/admin/info', { state: payload });
                                                                }}
                                                            >
                                                                <i className="fa-solid fa-arrow-right"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6">{loadingList ? 'Loading...' : 'No partners available.'}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : quickTab === 'members' ? (
                            <div className="members-card">
                                <div className="members-card-header">
                                    <div>
                                        <h3>All Members</h3>
                                    </div>
                                    <div className="members-toolbar">
                                        <div className="members-search">
                                            <i className="fa-solid fa-magnifying-glass"></i>
                                            <input
                                                type="text"
                                                placeholder="Search members..."
                                                value={memberSearch}
                                                onChange={(e) => setMemberSearch(e.target.value)}
                                            />
                                        </div>
                                        <button type="button" className="members-export-btn">
                                            <i className="fa-solid fa-download"></i>
                                            Export
                                        </button>
                                    </div>
                                </div>

                                <div className="table-scroll">
                                    <table className="members-table">
                                        <thead>
                                            <tr>
                                                <th>Member</th>
                                                <th>Join Date</th>
                                                <th>Transactions</th>
                                                <th>Total Saved</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {membersList.length > 0 ? (
                                                membersList.map((member) => (
                                                    <tr key={member.id}>
                                                        <td>
                                                            <div className="member-name">
                                                                <span>{member.name}</span>
                                                                <small>{member.mobile}</small>
                                                                <small>{member.email || '-'}</small>
                                                            </div>
                                                        </td>
                                                        <td>{member.joinDate}</td>
                                                        <td>{member.transactions}</td>
                                                        <td className="member-saved">₹{member.totalSaved}</td>
                                                        <td>
                                                            <span className={`member-status ${member.status.toLowerCase()}`}>{member.status}</span>
                                                        </td>
                                                        <td>
                                                            <div className="member-actions">
                                                                <button
                                                                    type="button"
                                                                    className="members-delete-btn"
                                                                    onClick={() => handleUserDelete(member.id)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="9">{loadingList ? 'Loading...' : 'No members found.'}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3>Logged In Users List</h3>
                                <div className="table-scroll">
                                    <table className="users-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Mobile</th>
                                                <th>Email</th>
                                                <th>Registered</th>
                                                <th>Last Login</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formattedUsers.length > 0 ? (
                                                formattedUsers.map((user) => (
                                                    <tr key={user.id}>
                                                        <td>{user.name || '-'}</td>
                                                        <td>{user.mobile || '-'}</td>
                                                        <td>{user.email || '-'}</td>
                                                        <td>{user.formattedCreatedAt}</td>
                                                        <td>{user.formattedLastLogin}</td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="delete-btn"
                                                                onClick={() => handleUserDelete(user.id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6">{loadingList ? 'Loading...' : 'No logged-in users found.'}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="admin-partner-header">
                                    <h3>All Registered Partners</h3>
                                    <select
                                        value={partnerCategoryFilter}
                                        onChange={(e) => setPartnerCategoryFilter(e.target.value)}
                                        aria-label="Filter partners by category"
                                    >
                                        {partnerCategoryOptions.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="table-scroll">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Restaurant</th>
                                                <th>Owner</th>
                                                <th>Area</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPartners.length > 0 ? (
                                                filteredPartners.map((partner) => (
                                                    <tr key={partner._id}>
                                                        <td>{partner.restaurantName || '-'}</td>
                                                        <td>{partner.ownerName || '-'}</td>
                                                        <td>{partner.area || '-'}</td>
                                                        <td>
                                                            <span className={`status-badge ${partner.status}`}>{partner.status}</span>
                                                        </td>
                                                        <td>
                                                            <div className="partner-actions">
                                                                {partner.status !== 'Active' && (
                                                                    <button
                                                                        type="button"
                                                                        className="save-btn partner-action-btn"
                                                                        onClick={() => handleStatusChange(partner._id, 'Active')}
                                                                    >
                                                                        Activate
                                                                    </button>
                                                                )}
                                                                {partner.status !== 'Blocked' && (
                                                                    <button
                                                                        type="button"
                                                                        className="delete-btn partner-action-btn"
                                                                        onClick={() => handleStatusChange(partner._id, 'Blocked')}
                                                                    >
                                                                        Block
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="delete-btn partner-action-btn"
                                                                    onClick={() => handleDelete(partner._id)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5">{loadingList ? 'Loading...' : 'No partners available for selected category.'}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                        <div className="add-partner-view">
                        <div className="add-partner-header">
                            <h3>Register New Partner</h3>
                            <button
                                type="button"
                                className="add-partner-close"
                                onClick={() => handleViewChange('list')}
                                aria-label="Close add partner form"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <form className="professional-form" onSubmit={handleAddPartner}>
                            <div className="form-grid">
                                <div className="form-field">
                                    <label>Restaurant Name</label>
                                    <input name="restaurantName" placeholder="Restaurant Name" value={formData.restaurantName} onChange={handleInputChange} required />
                                </div>
                                <div className="form-field">
                                    <label>Owner Name</label>
                                    <input name="ownerName" placeholder="Owner Name" value={formData.ownerName} onChange={handleInputChange} required />
                                </div>
                                <div className="form-field">
                                    <label>Restaurant Mobile</label>
                                    <input name="resMobile" placeholder="Restaurant Mobile" value={formData.resMobile} onChange={handleInputChange} required />
                                </div>
                                <div className="form-field">
                                    <label>Owner Mobile</label>
                                    <input name="ownerMobile" placeholder="Owner Mobile" value={formData.ownerMobile} onChange={handleInputChange} required />
                                </div>

                                <div className="form-field">
                                    <label>Business Category</label>
                                    <select name="businessCategory" value={formData.businessCategory} onChange={handleInputChange} required>
                                        <option>Food & Dining</option>
                                        <option>Activities & Adventure</option>
                                        <option>Local Stores & Gift House</option>
                                        <option>Stay & Hotels</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Restaurant Image</label>
                                    <input type="file" onChange={(e) => setResImageFile(e.target.files?.[0] || null)} />
                                </div>
                                <div className="form-field">
                                    <label>Email ID</label>
                                    <input name="email" type="email" placeholder="Email ID" value={formData.email} onChange={handleInputChange} required />
                                </div>
                                <div className="form-field">
                                    <label>Password</label>
                                    <input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleInputChange} required />
                                </div>
                                <div className="form-field">
                                    <label>Area</label>
                                    <input name="area" placeholder="Area" value={formData.area} onChange={handleInputChange} required />
                                </div>
                                <div className="form-field">
                                    <label>Latitude</label>
                                    <input name="latitude" type="number" step="0.000001" placeholder="Latitude (e.g. 17.9237)" value={formData.latitude} onChange={handleInputChange} required />
                                </div>
                                <div className="form-field">
                                    <label>Longitude</label>
                                    <input name="longitude" type="number" step="0.000001" placeholder="Longitude (e.g. 73.8007)" value={formData.longitude} onChange={handleInputChange} required />
                                </div>
                                <div className="form-field form-field--full">
                                    <label>Pick Location (Click to drop pin)</label>
                                    <div className="admin-location-search">
                                        <input
                                            type="text"
                                            placeholder="Search location (e.g. Hotel Ravine, Panchgani)"
                                            value={locationQuery}
                                            onChange={(e) => setLocationQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleLocationSearch(e);
                                            }}
                                        />
                                        <button type="button" disabled={geocoding} onClick={handleLocationSearch}>
                                            {geocoding ? 'Searching...' : 'Search'}
                                        </button>
                                    </div>
                                    {locationError && <div className="admin-location-error">{locationError}</div>}
                                    <div className="admin-map-wrap">
                                        <div ref={mapContainerRef} className="admin-map"></div>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label>Total Discount (%)</label>
                                    <input name="totalDiscount" type="number" min="0" step="0.01" placeholder="Total Discount (%)" value={formData.totalDiscount} onChange={handleInputChange} />
                                </div>
                                <div className="form-field">
                                    <label>Discounts Given (%)</label>
                                    <input name="customerDiscount" type="number" min="0" step="0.01" placeholder="Customer Discount (%)" value={formData.customerDiscount} onChange={handleInputChange} />
                                </div>
                                <div className="form-field">
                                    <label>Partner Commission</label>
                                    <input name="platformCommission" type="number" min="0" step="0.01" placeholder="Partner Commission" value={formData.platformCommission} readOnly />
                                </div>
                            </div>

                            <button type="submit" className="save-btn" disabled={savingPartner}>
                                {savingPartner ? 'Adding...' : 'Add Partner'}
                            </button>
                        </form>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;









