import { Navigate } from 'react-router-dom';
import { useSession } from './SessionContext.jsx';

export default function RequireRole({ roles, children }) {
  const { user, loading } = useSession();

  if (loading) return null;
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return children;
}
