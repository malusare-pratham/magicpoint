import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';
import AdminSeoEditor from './AdminSeoEditor';

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
    totalDiscount: '',
    customerDiscount: '',
    platformCommission: ''
};

const AdminDashboard = () => {
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

    useEffect(() => {
        fetchDashboard();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setNowTick(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

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


    const formattedUsers = useMemo(
        () =>
            loggedInUsers.map((user) => ({
                ...user,
                formattedLastLogin: user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'
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
                const isActive = Boolean(expiryDateValue) && expiryDateValue >= new Date();
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
                const plan = String(user?.membershipPlan || 'single').toLowerCase();
                const type = plan.includes('family') ? 'Family' : 'Single';
                const typeKey = plan.includes('family') ? 'family' : 'single';
                const stat = userStatsById[String(user.id)] || {};
                return {
                    id: user.id,
                    name: user.name || '-',
                    mobile: user.mobile || user.mobileNumber || '-',
                    email: user.email || '-',
                    type,
                    typeKey,
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
    }, [formattedUsers, memberSearch, userStatsById, nowTick]);

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
                            <button
                                type="button"
                                className={`admin-quick-pill ${quickTab === 'seo' ? 'active' : ''}`}
                                onClick={() => setQuickTab('seo')}
                            >
                                <i className="fa-solid fa-globe"></i>
                                Manage SEO
                            </button>
                        </div>

                        {quickTab === 'seo' ? (
                            <AdminSeoEditor />
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
                                                <th>Email</th>
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
                                                <th>Email</th>
                                                <th>Type</th>
                                                <th>Join Date</th>
                                                <th>Expiry</th>
                                                <th>Remaining</th>
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
                                                            </div>
                                                        </td>
                                                        <td>{member.email || '-'}</td>
                                                        <td>
                                                            <span className={`member-type-text ${member.typeKey}`}>{member.type}</span>
                                                        </td>
                                                        <td>{member.joinDate}</td>
                                                        <td>{member.expiryDate}</td>
                                                        <td>{member.remaining}</td>
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
                                                    <td colSpan="10">{loadingList ? 'Loading...' : 'No members found.'}</td>
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
                                                <th>Plan</th>
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
                                                        <td>{user.membershipPlan || '-'}</td>
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
