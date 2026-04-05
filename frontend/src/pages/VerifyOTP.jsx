import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './VerifyOTP.css';
import Navbar from '../components/Navbar/Navbar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [billAmountInput, setBillAmountInput] = useState('');
  const billAmountRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  const billData = location?.state || {};
  const partnerName = String(billData?.partnerName || 'Partner Restaurant');
  const partnerId = String(billData?.partnerId || '');
  const discountPercent = Number(billData?.discountPercent) || 10;

  useEffect(() => {
    if (billData?.billAmount && !billAmountInput) {
      setBillAmountInput(String(billData.billAmount));
    }
  }, [billData?.billAmount, billAmountInput]);

  useEffect(() => {
    billAmountRef.current?.focus();
  }, []);

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth <= 500);
    };
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  const billAmount = Number(billAmountInput) || 0;
  const discountAmount = billAmount > 0 ? (billAmount * discountPercent) / 100 : 0;
  const finalAmount = billAmount - discountAmount;

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/DashboardPage');
  };

  const handleVerify = () => {
    if (!billAmount || billAmount <= 0) {
      alert('Please enter bill amount first.');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Please login first.');
      navigate('/login');
      return;
    }

    if (!partnerId) {
      alert('Partner is missing. Please go back and try again.');
      return;
    }

    setIsSubmittingApproval(true);
    setApprovalRequest({
      billId: '',
      status: 'Pending',
      message: 'Approval request is being sent to partner...'
    });

    const formData = new FormData();
    formData.append('partnerId', String(partnerId));
    formData.append('billAmount', String(billAmount));
    formData.append('discountAmount', String(discountAmount));
    formData.append('approvalMode', 'partnerApproval');

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    };

    const submitApprovalRequest = async () => {
      try {
        return await axios.post(`${API_BASE_URL}/api/auth/bills/request`, formData, {
          headers: authHeaders
        });
      } catch (error) {
        if (error?.response?.status === 404) {
          return axios.post(`${API_BASE_URL}/api/auth/bills`, formData, {
            headers: authHeaders
          });
        }
        throw error;
      }
    };

    submitApprovalRequest().then((res) => {
      const txn = res?.data?.transaction || {};
      const txnStatus = String(txn.status || 'Pending');

      if (txnStatus === 'Verified') {
        navigate('/confirmation', {
          replace: true,
          state: {
            billId: txn.id || '',
            amountSaved: Number(txn.discount || discountAmount),
            partner: String(txn.partner || partnerName),
            originalAmount: Number(txn.originalAmount || billAmount),
            discount: Number(txn.discount || discountAmount),
            finalAmount: Number(txn.finalAmount || finalAmount),
            discountPercent: Number(txn.discountPercent || discountPercent),
            transactionId: String(txn.transactionId || `TXN${Math.floor(10000000 + Math.random() * 90000000)}`),
            dateTime: String(txn.dateTime || new Date().toLocaleString()),
            lifetimeSavings: Number(txn.discount || discountAmount)
          }
        });
        return;
      }

      setApprovalRequest({
        billId: txn.id || '',
        status: txnStatus,
        message: 'Approval request sent. Waiting for partner confirmation...'
      });
    }).catch((error) => {
      if (error?.response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        navigate('/login', {
          state: {
            redirectTo: '/verify-otp',
            redirectState: {
              partnerId,
              partnerName,
              discountPercent,
              billAmount: billAmountInput
            }
          }
        });
        return;
      }
      setApprovalRequest({
        billId: '',
        status: 'Rejected',
        message: error?.response?.data?.message || 'Could not send approval request'
      });
    }).finally(() => {
      setIsSubmittingApproval(false);
    });
  };

  useEffect(() => {
    if (!approvalRequest?.billId || approvalRequest?.status !== 'Pending') return undefined;

    const token = localStorage.getItem('authToken');
    if (!token) return undefined;

    const poll = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/bills/${approvalRequest.billId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const txn = res?.data?.transaction;
        if (!txn) return;

        if (txn.status === 'Verified') {
          navigate('/confirmation', {
            replace: true,
            state: {
              billId: txn.id || '',
              amountSaved: Number(txn.discount || discountAmount),
              partner: String(txn.partner || partnerName),
              originalAmount: Number(txn.originalAmount || billAmount),
              discount: Number(txn.discount || discountAmount),
              finalAmount: Number(txn.finalAmount || finalAmount),
              discountPercent: Number(txn.discountPercent || discountPercent),
              transactionId: String(txn.transactionId || `TXN${Math.floor(10000000 + Math.random() * 90000000)}`),
              dateTime: String(txn.dateTime || new Date().toLocaleString()),
              lifetimeSavings: Number(txn.discount || discountAmount)
            }
          });
          return;
        }

        if (txn.status === 'Rejected') {
          setApprovalRequest((prev) => ({
            ...(prev || {}),
            status: 'Rejected',
            message: 'Partner rejected this request. Please try again.'
          }));
        }
      } catch (error) {
        if (error?.response?.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          navigate('/login', {
            state: {
              redirectTo: '/verify-otp',
              redirectState: {
                partnerId,
                partnerName,
                discountPercent,
                billAmount: billAmountInput
              }
            }
          });
        }
      }
    };

    const intervalId = setInterval(poll, 3000);
    poll();
    return () => clearInterval(intervalId);
  }, [approvalRequest?.billId, approvalRequest?.status, billAmount, discountAmount, discountPercent, finalAmount, navigate, partnerName]);


  const isAuthenticated = Boolean(localStorage.getItem('authToken'));

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/');
  };

  return (
    <div className="otp-page-container otp-scope">
      {isMobile && (
        <div className="otp-mobile-navbar">
          <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        </div>
      )}
      <div className="otp-top-nav">
        <div className="brand-logo otp-brand-top">
          <span className="logo-tripspotgo">TripspotGo</span>
        </div>
        <button className="otp-back-btn" onClick={handleBack}>
          <span>Back</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>

      <div className="otp-card">
        <div className="brand-logo otp-brand-inside">
          <span className="logo-tripspotgo">TripspotGo</span>
        </div>
        <div className="otp-header">
          <div className="shield-icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 className="main-otp-heading">Redeem Now</h1>
          <p className="sub-otp-text">Instant Savings • Instant Approval</p>
        </div>

        <div className="otp-amount-group">
          <label className="otp-amount-label">Bill Amount</label>
          <div className="otp-amount-wrapper">
            <span className="otp-currency-symbol">₹</span>
            <input
              type="number"
              placeholder="Enter bill amount"
              className="otp-amount-input"
              min="1"
              ref={billAmountRef}
              value={billAmountInput}
              onChange={(e) => setBillAmountInput(e.target.value)}
            />
          </div>
        </div>

        <div className="bill-summary-card">
          <div className="summary-row">
            <span className="label">Partner</span>
            <span className="value">{partnerName}</span>
          </div>
          <div className="summary-row">
            <span className="label">Bill Amount</span>
            <span className="value">{formatCurrency(billAmount)}</span>
          </div>
          <div className="summary-row discount-row">
            <span className="label text-green">Your Discount ({discountPercent}%)</span>
            <span className="value text-green">- {formatCurrency(discountAmount)}</span>
          </div>
          <div className="summary-row">
            <span className="label">Final Payable Amount</span>
            <span className="value">{formatCurrency(finalAmount)}</span>
          </div>
        </div>

        <div className="otp-input-section">
          <button className="verify-btn" onClick={handleVerify} disabled={isSubmittingApproval || approvalRequest?.status === 'Pending'}>
            {isSubmittingApproval ? 'Submitting...' : approvalRequest?.status === 'Pending' ? 'Waiting for Partner Approval' : 'Verify & Redeem Discount'}
          </button>
        </div>

        {approvalRequest ? (
          <div className={`partner-approval-note ${approvalRequest.status === 'Rejected' ? 'rejected' : ''}`}>
            <h4>Partner Approval Status</h4>
            <p>{approvalRequest.message}</p>
          </div>
        ) : null}

        <div className="savings-banner">
          <div className="check-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="saving-text">You're about to save</p>
          <h2 className="saved-amount">{formatCurrency(discountAmount)}</h2>
          <p className="final-total">Final amount: {formatCurrency(finalAmount)}</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
