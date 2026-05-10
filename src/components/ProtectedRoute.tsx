import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

//This creates an interface. one must use these only.
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requireRoom?: boolean;
}

//on export, we have 3 props. Children - The content to be rendered
//requiredRole - Role which is required.
//requireRoom - User must have an active room before access.
export default function ProtectedRoute({ children, requiredRole, requireRoom }: ProtectedRouteProps) {
  const { isLoggedIn, isAdmin } = useAuth();

  const hasRoom = () => {
    try {
      return Boolean(localStorage.getItem('currentRoom'));
    } catch {
      return false;
    }
  };

  if (!isLoggedIn) {
    return <Navigate to="/signin" replace />;
  }

  if (requireRoom && !hasRoom()) {
    return <Navigate to="/chatroom/room-selection" replace />;
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to='/unauthorized' replace />;
  }

  return <>{children}</>;
}