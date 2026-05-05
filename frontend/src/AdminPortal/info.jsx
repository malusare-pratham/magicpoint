import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LuPenLine, 
  LuRefreshCw, 
  LuLogOut, 
  LuSearch, 
  LuTrendingUp, 
  LuUsers, 
  LuFile
} from "react-icons/lu";
import './info.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const resolvePartnerId = (payload) => {
  const id = String(payload?.id || payload?._id || '').trim();
  if (id) return id;
  return String(localStorage.getItem('selectedPartnerId') || '').trim();
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
const Info = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [stats, setStats] = useState({ revenue: 0, discounts: 0, customers: 0, totalTransactions: 0, avgBill: 0 });
  const [statsChange, setStatsChange] = useState({ revenuePercent: 0, revenueLabel: 'from yesterday' });
  const [statsRange, setStatsRange] = useState({ mode: 'day', preset: 'last30', month: new Date().toISOString().slice(0, 7), from: '', to: '' });
  const [statsLoading, setStatsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const partnerId = useMemo(() => {
    const fromState = String(location?.state?.partnerId || '').trim();
    if (fromState) return fromState;
    return resolvePartnerId(partnerInfo);
  }, [location?.state?.partnerId, partnerInfo]);

  const fetchTransactions = async (id) => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/partner-transactions/${id}`);
      setTransactions(Array.isArray(res?.data?.transactions) ? res.data.transactions : []);
    } catch (_error) {
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toYyyyMmDdLocal = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const resolveSelectedRange = () => {
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    if (statsRange.mode === 'month') {
      const [yearStr, monthStr] = String(statsRange.month || '').split('-');
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return { from: toYyyyMmDdLocal(todayLocal), to: toYyyyMmDdLocal(todayLocal), label: 'vs previous period' };
      }
      const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
      const end = new Date(year, monthIndex + 1, 0, 0, 0, 0, 0);
      return { from: toYyyyMmDdLocal(start), to: toYyyyMmDdLocal(end), label: 'vs previous month' };
    }

    if (statsRange.mode === 'custom') {
      const from = String(statsRange.from || '').trim();
      const to = String(statsRange.to || '').trim();
      if (from && to) {
        const normalizedFrom = from <= to ? from : to;
        const normalizedTo = from <= to ? to : from;
        return { from: normalizedFrom, to: normalizedTo, label: 'vs previous period' };
      }
      return { from: toYyyyMmDdLocal(todayLocal), to: toYyyyMmDdLocal(todayLocal), label: 'vs previous period' };
    }

    const preset = String(statsRange.preset || 'today');
    if (preset === 'yesterday') {
      const start = new Date(todayLocal);
      start.setDate(start.getDate() - 1);
      return { from: toYyyyMmDdLocal(start), to: toYyyyMmDdLocal(start), label: 'from day before' };
    }
    if (preset === 'last7') {
      const start = new Date(todayLocal);
      start.setDate(start.getDate() - 6);
      return { from: toYyyyMmDdLocal(start), to: toYyyyMmDdLocal(todayLocal), label: 'vs previous 7 days' };
    }
    if (preset === 'last30') {
      const start = new Date(todayLocal);
      start.setDate(start.getDate() - 29);
      return { from: toYyyyMmDdLocal(start), to: toYyyyMmDdLocal(todayLocal), label: 'vs previous 30 days' };
    }
    return { from: toYyyyMmDdLocal(todayLocal), to: toYyyyMmDdLocal(todayLocal), label: 'from yesterday' };
  };

  const fetchDashboardStats = async (id) => {
    if (!id) return;
    const { from, to, label } = resolveSelectedRange();
    setStatsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/partner-dashboard-stats/${id}`, {
        params: { from, to }
      });
      const current = res?.data?.current || {};
      const changes = res?.data?.changes || {};
      setStats({
        revenue: Number(current.revenue) || 0,
        discounts: Number(current.discounts) || 0,
        customers: Number(current.customers) || 0,
        totalTransactions: Number(current.totalTransactions) || 0,
        avgBill: Number(current.avgBill) || 0
      });
      setStatsChange({
        revenuePercent: Number(changes.revenuePercent) || 0,
        revenueLabel: label
      });
    } catch (_error) {
      setStats({ revenue: 0, discounts: 0, customers: 0, totalTransactions: 0, avgBill: 0 });
      setStatsChange({ revenuePercent: 0, revenueLabel: label });
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    const fromState = String(location?.state?.partnerId || '').trim();
    if (fromState) {
      localStorage.setItem('selectedPartnerId', fromState);
    }
    if (location?.state?.partner) {
      localStorage.setItem('adminSelectedPartner', JSON.stringify(location.state.partner));
      setPartnerInfo(location.state.partner);
      return;
    }

    try {
      const adminSaved = localStorage.getItem('adminSelectedPartner');
      if (adminSaved) {
        const parsed = JSON.parse(adminSaved);
        if (parsed) {
          setPartnerInfo(parsed);
          return;
        }
      }
    } catch (_error) {
      // ignore parse error
    }

    try {
      const saved = localStorage.getItem('partnerInfo');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPartnerInfo(parsed || null);
        return;
      }
    } catch (_error) {
      // ignore parse error
    }
    setPartnerInfo((prev) => prev || null);
  }, [location?.state?.partnerId, location?.state?.partner]);

  useEffect(() => {
    const loadPartnerMeta = async (id) => {
      if (!id) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/partners`);
        const list = Array.isArray(res?.data) ? res.data : [];
        const matched = list.find((p) => String(p?._id || '') === String(id));
        if (matched) {
          setPartnerInfo((prev) => ({ ...prev, ...matched }));
        }
      } catch (_error) {
        // ignore
      }
    };
    if (partnerId) {
      loadPartnerMeta(partnerId);
    }
  }, [partnerId]);

  useEffect(() => {
    if (partnerId) {
      fetchTransactions(partnerId);
      fetchDashboardStats(partnerId);
    }
  }, [partnerId]);

  useEffect(() => {
    if (!partnerId) return;
    fetchDashboardStats(partnerId);
  }, [partnerId, statsRange.mode, statsRange.preset, statsRange.month, statsRange.from, statsRange.to]);

  const revenueChange = Number(statsChange.revenuePercent) || 0;
  const revenueChangePrefix = revenueChange > 0 ? '+' : '';
  const discountPercent = stats.revenue > 0 ? ((stats.discounts / stats.revenue) * 100) : 0;
  const partnerCommissionPercent = Number(partnerInfo?.platformCommission || 15);
  const partnerCommission = stats.revenue * (partnerCommissionPercent / 100);
  const filteredTransactions = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((tx) => {
      const id = String(tx?._id || '').toLowerCase();
      const user = String(tx?.userName || '').toLowerCase();
      const amount = String(tx?.billAmount ?? '').toLowerCase();
      return id.includes(query) || user.includes(query) || amount.includes(query);
    });
  }, [transactions, searchQuery]);
  const statsCards = [
    { title: "Total Revenue", value: formatCurrency(stats.revenue), sub: `${revenueChangePrefix}${revenueChange.toFixed(1)}% ${statsChange.revenueLabel}`, icon: <LuTrendingUp />, color: "green" },
    { title: "Discounts Given", value: formatCurrency(stats.discounts), sub: `${discountPercent.toFixed(1)}% of revenue`, icon: "$", color: "yellow" },
    { title: "Customers", value: String(stats.customers || 0), sub: "Unique customers", icon: <LuUsers />, color: "blue" },
    { title: "Total transactions", value: String(stats.totalTransactions || 0), sub: "In selected range", icon: <LuFile />, color: "blue" },
    { title: "Avg. Bill", value: formatCurrency(stats.avgBill), sub: "Per transaction", icon: <LuFile />, color: "purple" },
    { title: "Partner Commission", value: formatCurrency(partnerCommission), sub: `${partnerCommissionPercent}% of revenue`, icon: <LuFile />, color: "purple" },
  ];

  return (
    <div className="dashboard-container">
      <div className="info-topbar">
        <button type="button" className="info-back-btn" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left"></i>
          Back
        </button>
      </div>

      {/* Top Profile Card */}
      <div className="profile-card">
        <div className="profile-content">
          <div className="title-section">
            <div className="icon-badge">
              <LuFile className="check-icon" />
            </div>
            <h1>{partnerInfo?.name || partnerInfo?.restaurantName || 'Partner'}</h1>
          </div>
          <div className="status-badges">
            <span className="badge partner">{partnerInfo?.businessCategory || 'Food & Dining'}</span>
          </div>
        </div>
        <div className="action-buttons">
          {/* actions removed as requested */}
        </div>
      </div>

      <div className="dashboard-filters">
        <div className="dashboard-filters-left">
          <select
            className="dashboard-filter-select"
            value={statsRange.mode}
            onChange={(e) => setStatsRange((prev) => ({ ...prev, mode: e.target.value }))}
            aria-label="Stats filter type"
          >
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="custom">Custom range</option>
          </select>

          {statsRange.mode === 'day' ? (
            <select
              className="dashboard-filter-select"
              value={statsRange.preset}
              onChange={(e) => setStatsRange((prev) => ({ ...prev, preset: e.target.value }))}
              aria-label="Day preset"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
            </select>
          ) : null}

          {statsRange.mode === 'month' ? (
            <input
              className="dashboard-filter-input"
              type="month"
              value={statsRange.month}
              onChange={(e) => setStatsRange((prev) => ({ ...prev, month: e.target.value }))}
              aria-label="Select month"
            />
          ) : null}

          {statsRange.mode === 'custom' ? (
            <div className="dashboard-filter-range">
              <input
                className="dashboard-filter-input"
                type="date"
                value={statsRange.from}
                onChange={(e) => setStatsRange((prev) => ({ ...prev, from: e.target.value }))}
                aria-label="From date"
              />
              <span className="dashboard-filter-sep">to</span>
              <input
                className="dashboard-filter-input"
                type="date"
                value={statsRange.to}
                onChange={(e) => setStatsRange((prev) => ({ ...prev, to: e.target.value }))}
                aria-label="To date"
              />
            </div>
          ) : null}
        </div>

        <div className="dashboard-filters-right">
          {statsLoading ? <span className="dashboard-filter-loading">Updating...</span> : null}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-header">
              <span className="stat-title">{stat.title}</span>
              <span className={`stat-icon-box ${stat.color}`}>{stat.icon}</span>
            </div>
            <h2 className="stat-value">{stat.value}</h2>
            <p className="stat-subtext">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Transactions Section */}
      <div className="transactions-card">
        <div className="trans-header">
          <div className="trans-title-wrapper">
            <h2>Recent Transactions</h2>
            <div className="title-underline"></div>
          </div>
          <div className="search-box">
            <LuSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search transactions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="empty-state">
            <p>Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <p>No matching transactions found.</p>
          </div>
        ) : (
          <div className="transactions-list">
            {filteredTransactions.map((tx) => {
              const bill = Number(tx.billAmount) || 0;
              const discount = Number(tx.discountAmount) || 0;
              const finalPay = Math.max(bill - discount, 0);
              const name = tx.userName || 'Customer';
              const initials = name.trim().slice(0, 1).toUpperCase();
              const status = String(tx.status || 'Verified');
              const txId = String(tx._id || '').slice(-10) || '-';
              return (
                <div key={tx._id} className="transaction-card">
                  <div className="tx-left">
                    <div className="tx-avatar">{initials}</div>
                    <div className="tx-meta">
                      <h4>{name}</h4>
                      <p>{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '-'}</p>
                    </div>
                  </div>

                  <div className="tx-status">
                    <span className={`tx-pill ${status.toLowerCase()}`}>{status}</span>
                  </div>

                  <div className="tx-amounts">
                    <div className="tx-col">
                      <span>Original</span>
                      <strong>{formatCurrency(bill)}</strong>
                    </div>
                    <div className="tx-col">
                      <span>Discount</span>
                      <strong className="tx-discount">-{formatCurrency(discount)}</strong>
                    </div>
                    <div className="tx-col">
                      <span>Final Pay</span>
                      <strong className="tx-final">{formatCurrency(finalPay)}</strong>
                    </div>
                    <div className="tx-col">
                      <span>Transaction</span>
                      <strong>{txId}</strong>
                    </div>
                  </div>

                  <div className="tx-action">
                    <button type="button" className="tx-bill-btn">Bill</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Info;


