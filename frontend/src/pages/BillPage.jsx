import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './BillPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const fallbackPartners = [
  { id: 'fallback-hotel', name: 'Luxury Stay Hotel', discount: 10 },
  { id: 'fallback-restaurant', name: 'The Grand Restaurant', discount: 10 }
];

const BillPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [partners, setPartners] = useState(fallbackPartners);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedPartnerName, setSelectedPartnerName] = useState('');
  const [selectedDiscountPercent, setSelectedDiscountPercent] = useState(
    Number.isFinite(Number(location?.state?.discountPercent))
      ? Number(location.state.discountPercent)
      : 10
  );
  const [billFile, setBillFile] = useState(null);
  const [billAmount, setBillAmount] = useState('');
  const billFileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/partners`);
        const list = Array.isArray(res?.data) ? res.data : [];
        const activeOpen = list
          .filter((p) => String(p?.status || '').trim() === 'Active')
          .filter((p) => String(p?.businessStatus || 'OPEN').toUpperCase() === 'OPEN')
          .map((p) => ({
            id: p?._id,
            name: p?.restaurantName || 'Partner Restaurant',
            discount: Number.isFinite(Number(p?.customerDiscount)) ? Number(p.customerDiscount) : 10
          }));

        const nextPartners = activeOpen.length ? activeOpen : fallbackPartners;
        setPartners(nextPartners);

        const prefilledId = String(location?.state?.partnerId || '').trim();
        const prefilledName = String(location?.state?.partnerName || '').trim();
        if (prefilledId || prefilledName) {
            const matched = prefilledId ? nextPartners.find((p) => String(p.id) === prefilledId) : null;
            const locationDiscount = Number(location?.state?.discountPercent);
            setSelectedPartnerId(matched?.id || prefilledId || '');
            setSelectedPartnerName(prefilledName || matched?.name || '');
            setSelectedDiscountPercent(
              Number.isFinite(locationDiscount)
                ? locationDiscount
                : (matched?.discount ?? 10)
            );
        } else if (nextPartners.length) {
            setSelectedPartnerId(String(nextPartners[0].id || ''));
            setSelectedPartnerName(String(nextPartners[0].name || 'Partner Restaurant'));
            setSelectedDiscountPercent(Number(nextPartners[0].discount) || 10);
        }
      } catch (_error) {
        setPartners(fallbackPartners);
        const prefilledName = String(location?.state?.partnerName || '').trim();
        const prefilledId = String(location?.state?.partnerId || '').trim();
        const locationDiscount = Number(location?.state?.discountPercent);
        if (prefilledName || prefilledId) {
          setSelectedPartnerName(prefilledName);
          setSelectedPartnerId(prefilledId);
          setSelectedDiscountPercent(Number.isFinite(locationDiscount) ? locationDiscount : 10);
        } else if (fallbackPartners.length) {
          setSelectedPartnerId(String(fallbackPartners[0].id || ''));
          setSelectedPartnerName(String(fallbackPartners[0].name || 'Partner Restaurant'));
          setSelectedDiscountPercent(Number(fallbackPartners[0].discount) || 10);
        }
      }
    };

    fetchPartners();
  }, [location?.state?.partnerId, location?.state?.partnerName, location?.state?.discountPercent]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const handleGenerateOTP = async (e) => {
    e.preventDefault();
    if (!billAmount || Number(billAmount) <= 0) {
      alert('Please enter bill amount first.');
      return;
    }
    if (!billFile) {
      alert('Please upload bill image first.');
      return;
    }
    if (!selectedPartnerId) {
      alert('Partner is missing. Please go back and try again.');
      return;
    }

    const numericBillAmount = Number(billAmount) || 0;
    const discountPercent = Number(selectedDiscountPercent) || 10;
    const discountAmount = (numericBillAmount * discountPercent) / 100;
    const otpPayload = {
      transactionId: `TXN${Math.floor(10000000 + Math.random() * 90000000)}`,
      partnerId: selectedPartnerId,
      partnerName: selectedPartnerName || 'Partner Restaurant',
      billAmount: numericBillAmount,
      discountPercent,
      discountAmount,
      finalAmount: numericBillAmount - discountAmount,
      dateTime: new Date().toISOString(),
      lifetimeSavings: discountAmount,
      billFile,
      billId: ''
    };

    navigate('/verify-otp', { state: otpPayload, replace: true });
  };

  const handleFileSelect = (e) => {
    setBillFile(e.target.files?.[0] || null);
  };

  const handleUploadAreaClick = () => {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (!isMobile) {
      billFileInputRef.current?.click();
      return;
    }
    cameraInputRef.current?.click();
  };

  return (
    <div className="bill-page-container bill-scope">
      {/* --- Top Navigation: Logo Left & Back Button Right --- */}
      <div className="bill-top-nav">
        <div className="brand-logo">
          <span className="logo-magic">Trip</span>
          <span className="logo-point">spot</span>
        </div>

        <button className="bill-back-btn" onClick={handleBack}>
          <span>Back</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>

      {/* --- Main Bill Card --- */}
      <div className="bill-card">
        <div className="bill-header">
          <div className="upload-icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h1 className="main-bill-heading">Upload Your Bill</h1>
          <p className="sub-bill-text">Get {selectedDiscountPercent}% discount verified instantly</p>
        </div>

        <div className="instructions-box">
          <div className="info-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Important Instructions</span>
          </div>
          <ul>
            <li>Upload a clear photo of your original bill</li>
            <li>Ensure bill amount and partner name are visible</li>
            <li>Bill must be from today's date</li>
            <li>You'll receive an OTP for verification</li>
          </ul>
        </div>

        <form className="bill-form" onSubmit={handleGenerateOTP}>
          <div className="input-group">
            <label>Partner</label>
            <input className="bill-input bill-partner-name" value={selectedPartnerName || 'Partner Restaurant'} readOnly />
          </div>

          <div className="input-group">
            <label>Bill Amount</label>
            <div className="amount-input-wrapper">
              <span className="currency-symbol">₹</span>
              <input
                type="number"
                placeholder="Enter total bill amount"
                className="bill-input p-left"
                required
                min="1"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
              />
            </div>
          </div>

          <div
            className={`upload-area ${billFile ? 'uploaded' : ''}`}
            onClick={handleUploadAreaClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleUploadAreaClick();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <input
              ref={cameraInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
            />
            <input
              ref={billFileInputRef}
              type="file"
              id="file-upload"
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileSelect}
            />
            <div className={`upload-label ${billFile ? 'uploaded' : ''}`}>
              {billFile ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="m8 12 2.5 2.5L16 9"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
              <h3>{billFile ? 'Bill image uploaded' : 'Click to upload bill image'}</h3>
              <p>{billFile ? (billFile.name || 'Uploaded successfully') : 'JPG, PNG up to 10MB'}</p>
            </div>
          </div>

          <button type="submit" className="generate-btn">
            Generate OTP
          </button>
        </form>

        <div className="feature-grid">
          <div className="feature-item">
            <span className="f-title text-green">{selectedDiscountPercent}%</span>
            <span className="f-sub">Discount</span>
          </div>
          <div className="feature-item">
            <span className="f-title text-blue">Instant</span>
            <span className="f-sub">Verification</span>
          </div>
          <div className="feature-item">
            <span className="f-title text-orange">Secure</span>
            <span className="f-sub">OTP</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillPage;

