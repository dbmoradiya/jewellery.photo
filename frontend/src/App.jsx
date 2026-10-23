import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Studio from './pages/Studio.jsx';
import Photos from './pages/Photos.jsx';
import Account from './pages/Account.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminTypes from './pages/admin/Types.jsx';
import AdminStyles from './pages/admin/Styles.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import AdminGenerations from './pages/admin/Generations.jsx';
import AdminSettings from './pages/admin/Settings.jsx';

function Spinner() { return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><div className="spinner" /></div>; }

function RequireAuth({ children, admin }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/studio" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/studio" element={<RequireAuth><Studio /></RequireAuth>} />
      <Route path="/photos" element={<RequireAuth><Photos /></RequireAuth>} />
      <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminDashboard />} />
        <Route path="types" element={<AdminTypes />} />
        <Route path="styles" element={<AdminStyles />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="generations" element={<AdminGenerations />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
