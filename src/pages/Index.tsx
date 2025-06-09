
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LandingPage from '@/components/LandingPage';
import Navbar from '@/components/Navbar';
import StudentDashboard from '@/components/StudentDashboard';
import AdminDashboard from '@/components/AdminDashboard';

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user) {
      // If user is logged in and on root path, redirect to dashboard
      if (location.pathname === '/') {
        navigate('/dashboard');
      }
      
      // If user tries to access admin but is not admin, redirect to dashboard
      if (location.pathname === '/admin' && userRole !== 'admin') {
        navigate('/dashboard');
      }
    }
  }, [user, userRole, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if user is not logged in
  if (!user) {
    return <LandingPage />;
  }

  // Show appropriate dashboard based on user role and current path
  const showAdminDashboard = location.pathname === '/admin' && userRole === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Navbar />
      {showAdminDashboard ? <AdminDashboard /> : <StudentDashboard />}
    </div>
  );
};

export default Index;
