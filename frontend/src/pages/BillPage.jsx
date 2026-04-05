import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BillPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    navigate('/verify-otp', { replace: true, state: location?.state });
  }, [navigate, location?.state]);

  return null;
};

export default BillPage;
