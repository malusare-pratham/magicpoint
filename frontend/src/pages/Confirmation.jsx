import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Confirmation.css';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

const Confirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const payload = location?.state || {};

  useEffect(() => {
    const handleBrowserBack = () => {
      navigate('/DashboardPage', { replace: true });
    };

    window.addEventListener('popstate', handleBrowserBack);
    return () => {
      window.removeEventListener('popstate', handleBrowserBack);
    };
  }, [navigate]);

  const [transactionData] = React.useState(() => ({
    amountSaved: Number(payload.amountSaved) || 500,
    partner: String(payload.partner || 'The Grand Hotel Panchgani'),
    originalAmount: Number(payload.originalAmount) || 5000,
    discount: Number(payload.discount) || 500,
    finalAmount: Number(payload.finalAmount) || 4500,
    discountPercent: Number(payload.discountPercent) || 10,
    transactionId: String(payload.transactionId || `TXN${Math.floor(10000000 + Math.random() * 90000000)}`),
    dateTime: String(payload.dateTime || new Date().toLocaleString()),
    lifetimeSavings: Number(payload.lifetimeSavings) || (Number(payload.discount) || 500)
  }));

  return (
    <div className="conf-page-container conf-scope">
      <div className="conf-top-nav">
        <div className="brand-logo">
          <span className="logo-magic">Trip</span>
          <span className="logo-point">spot</span>
        </div>
        <button className="home-btn" onClick={() => navigate('/DashboardPage', { replace: true })}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </button>
      </div>

      <div className="conf-card">
        <div className="success-header">
          <div className="check-animated-circle">
            <svg viewBox="0 0 52 52" className="checkmark">
              <circle cx="26" cy="26" r="25" fill="none" className="checkmark__circle"/>
              <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" className="checkmark__check"/>
            </svg>
          </div>
          <h1 className="success-title">Discount Applied!</h1>
          <p className="success-subtitle">Your savings have been confirmed</p>
        </div>

        <div className="savings-highlight-box">
          <div className="saving-label">You Saved</div>
          <div className="saving-value">{formatCurrency(transactionData.amountSaved)}</div>
          <div className="saving-tag">{transactionData.discountPercent}% Instant Discount</div>
        </div>

        <div className="conf-summary-section">
          <div className="summary-item">
            <span className="s-label">Partner</span>
            <span className="s-value">{transactionData.partner}</span>
          </div>
          <div className="summary-item">
            <span className="s-label">Original Amount</span>
            <span className="s-value">{formatCurrency(transactionData.originalAmount)}</span>
          </div>
          <div className="summary-item discount-text">
            <span className="s-label">Discount ({transactionData.discountPercent}%)</span>
            <span className="s-value">- {formatCurrency(transactionData.discount)}</span>
          </div>
          <div className="summary-item total-payable">
            <span className="s-label">Final Payable Amount</span>
            <span className="s-value">{formatCurrency(transactionData.finalAmount)}</span>
          </div>
        </div>

        <div className="transaction-meta">
          <div className="meta-row">
            <span>Transaction ID</span>
            <strong>{transactionData.transactionId}</strong>
          </div>
          <div className="meta-row">
            <span>Date & Time</span>
            <strong>{transactionData.dateTime}</strong>
          </div>
          <div className="status-badge">
            <div className="dot"></div> Confirmed
          </div>
        </div>

        <div className="conf-action-grid">
          <button className="action-btn secondary" onClick={() => navigate('/transaction-history')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View History
          </button>
          <button className="action-btn primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
        </div>

        <div className="next-steps-card">
          <h4>What's Next?</h4>
          <ul>
            <li>Show this confirmation to the partner</li>
            <li>Pay final amount at the counter</li>
            <li>Transaction saved in history</li>
          </ul>
        </div>

        <div className="lifetime-savings-footer">
          <div className="footer-content">
            <p>Your Lifetime Savings</p>
            <h3>{formatCurrency(transactionData.lifetimeSavings)}</h3>
          </div>
          <div className="footer-icon">🎉</div>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
