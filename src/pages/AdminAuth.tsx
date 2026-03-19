import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect /admin to /auth - super admin uses the same login page
export default function AdminAuth() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/auth', { replace: true }); }, [navigate]);
  return null;
}
