import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import { AuthProvider } from "./context/AuthContext";
import Dissolve from "./pages/Chatroom/Dissolve";
import LeaveRoom from "./pages/Chatroom/LeaveRoom";
import Logout from "./pages/Logout";
import Room from "./pages/Chatroom/Room";
import Invite from "./pages/Chatroom/Invite";
import Members from "./pages/Users/Members";
import AdminPanel from "./pages/Users/AdminPanel";
import FinanceHistory from "./pages/Finance/History";
import ExportReport from "./pages/Finance/ExportReport";
import ExpensesSettlements from "./pages/Finance/ExpensesSettlements";
import ProtectedRoute from "./components/ProtectedRoute";
import RoomSelection from "./pages/Chatroom/RoomSelection";

export default function App() {
  return (
    <>
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>

            <Route path="/home" element={<Home />} />

            {/* Users */}
            <Route path="/users/members" element={<Members />} />
            <Route path="/users/adminpanel" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />

            {/* Chatroom */}
            <Route path="/chatroom/room" element={<Room/>} />
            <Route path="/chatroom/invite" element={<Invite/>} />
            <Route path='/chatroom/dissolvegroup' element={<ProtectedRoute requiredRole="admin"><Dissolve /></ProtectedRoute>} />
            <Route path='/chatroom/room-selection' element={<RoomSelection/>}/>

            {/* Finance */}
            <Route path="/finance/expensesandsettlements" element={<ExpensesSettlements />} />
            <Route path="/finance/report" element={<ExportReport />} />
            <Route path="/finance/history" element={<FinanceHistory />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path='/chatroom/leaveroom' element={<ProtectedRoute requireRoom><LeaveRoom/></ProtectedRoute>} />
          </Route>

          {/* Public Auth Routes */}
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="/login" element={<Navigate to="/signin" replace />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path='/logout' element={<Logout />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      </AuthProvider>
    </>
  );
}
