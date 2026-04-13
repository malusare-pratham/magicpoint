import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, Wallet, Zap,
  CheckCircle, Utensils, Hotel, Store, Bike, Filter, IndianRupee
} from 'lucide-react';
import './TransactionPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const formatInr = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(Number(value) || 0);

const Money = ({ value, className = '', negative = false }) => (
  <span className={`money-value ${className}`}>
    {negative ? '- ' : ''}
    <IndianRupee size={14} />
    {formatInr(value)}
  </span>
);

const TransactionPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalSavings: 0, totalTransactions: 0, avgSavings: 0 });

  const categories = [
    { name: 'All', icon: <Filter size={14} /> },
    { name: 'Food & Dining', icon: <Utensils size={14} /> },
    { name: 'Activities', icon: <Bike size={14} /> },
    { name: 'Stores', icon: <Store size={14} /> },
    { name: 'Hotels & Villas', icon: <Hotel size={14} /> }
  ];

  const normalizeCategory = (raw) => {
    const value = String(raw || '').trim();
    if (value === 'Activities & Adventure') return 'Activities';
    if (value === 'Local Stores & Gift House') return 'Stores';
    if (value === 'Stay & Hotels') return 'Hotels & Villas';
    return 'Food & Dining';
  };

  const getCategoryIcon = (raw) => {
    const normalized = normalizeCategory(raw);
    switch (normalized) {
      case 'Activities':
        return <Bike size={18} />;
      case 'Stores':
        return <Store size={18} />;
      case 'Hotels & Villas':
        return <Hotel size={18} />;
      case 'Food & Dining':
      default:
        return <Utensils size={18} />;
    }
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const res = await axios.get(`${API_BASE_URL}/api/auth/transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const tx = Array.isArray(res?.data?.transactions) ? res.data.transactions : [];
        const st = res?.data?.stats || {};

        setTransactions(tx);
        setStats({
          totalSavings: Number(st.totalSavings || 0),
          totalTransactions: Number(st.totalTransactions || 0),
          avgSavings: Number(st.avgSavings || 0)
        });
      } catch (_error) {
        setTransactions([]);
        setStats({ totalSavings: 0, totalTransactions: 0, avgSavings: 0 });
      }
    };

    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    if (activeTab === 'All') return transactions;
    return transactions.filter((tx) => normalizeCategory(tx?.category) === activeTab);
  }, [activeTab, transactions]);

  return (
    <div className="tx-premium-root">
      <div className="tx-wrapper">
        <header className="tx-header-compact">
          <button className="back-circle" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div className="header-text">
            <h1>History</h1>
            <p>Smart Savings Summary</p>
          </div>
        </header>

        <div className="tx-stats-grid">
          <div className="stat-card-mini s-mint">
            <TrendingUp size={16} className="stat-icon" />
            <h3><Money value={stats.totalSavings} /></h3>
            <label>Total Savings</label>
          </div>
          <div className="stat-card-mini s-navy">
            <Wallet size={16} className="stat-icon" />
            <h3>{stats.totalTransactions}</h3>
            <label>Transactions</label>
          </div>
          <div className="stat-card-mini s-blue">
            <Zap size={16} className="stat-icon" />
            <h3><Money value={stats.avgSavings} /></h3>
            <label>Avg Savings</label>
          </div>
        </div>

        <div className="tx-filter-scroll">
          {categories.map((cat, i) => (
            <button
              key={i}
              className={`filter-pill ${activeTab === cat.name ? 'active' : ''}`}
              onClick={() => setActiveTab(cat.name)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        <main className="tx-list-area">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((item) => (
              <div key={item.id || item.transactionId} className="tx-row-card">
                <div className="row-top">
                  <div className="brand-box">
                    <div className="brand-img">{getCategoryIcon(item.category)}</div>
                    <div>
                      <h4>{item.partner || 'Partner Restaurant'}</h4>
                      <span className="sub-type">{normalizeCategory(item.category)} • {new Date(item.dateTime).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="status-tag">
                    <CheckCircle size={12} /> {item.status || 'Verified'}
                  </div>
                </div>

                <div className="row-bottom-info">
                  <div className="price-item">
                    <label>Original</label>
                    <Money value={item.originalAmount} />
                  </div>
                  <div className="price-item">
                    <label>Discount</label>
                    <Money value={item.discount} className="c-green" negative />
                  </div>
                  <div className="price-item">
                    <label>Final Pay</label>
                    <Money value={item.finalAmount} className="c-navy" />
                  </div>
                  
                </div>
              </div>
            ))
          ) : (
            <div className="tx-row-card">
              <div className="row-top">
                <div className="brand-box">
                  <div className="brand-img">{getCategoryIcon(activeTab)}</div>
                  <div>
                    <h4>No transactions yet</h4>
                    <span className="sub-type">Upload a bill to see history</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TransactionPage;
