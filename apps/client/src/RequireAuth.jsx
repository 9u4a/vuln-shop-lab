import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from './SessionContext.jsx';

export default function RequireAuth({ children }) {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
