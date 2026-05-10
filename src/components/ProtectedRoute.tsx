import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

//This creates an interface. one must use these only.
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; 
}

//on export, we have 2 props. Children - The content to be rendered
//requiredRole - Role which is required.
//It checks if user is logged in using requiredRole. if not, it redirects to error 404.
export default function ProtectedRoute({ children , requiredRole}: ProtectedRouteProps) {
const {isLoggedIn, isAdmin} = useAuth();

if (!isLoggedIn) {
  return <Navigate to="/signin" replace />;
}
if (requiredRole === 'admin' && !isAdmin){
    return <Navigate to='/unauthorized' replace />;
}
return <>{children}</>;
}