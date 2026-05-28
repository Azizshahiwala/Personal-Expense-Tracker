import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";

export default function Dissolve() {
  const navigate = useNavigate();
  const { isAdmin, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isDissolving, setIsDissolving] = useState(false);
  const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;

  useEffect(() => {
    const data = localStorage.getItem('user');
    if (!data) {
      setIsLoading(false);
      return;
    }

    try {
      JSON.parse(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        navigate('/');
        return;
      }
    }
  }, [isLoading, isLoggedIn, isAdmin, navigate]);

  const handleDissolveRoom = async () => {
    setIsDissolving(true);
    try {
      const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      console.log("Current user: ",currentUser);
      console.log("Current room: ",currentRoom);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${VITE_ROUTE_API_KEY}/groups/dissolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          groupcode: currentRoom.Groupid, 
          target_uuid: currentUser.id 
        })
      });

      if (response.ok) {
        localStorage.removeItem('currentRoom');
        navigate('/chatroom/room-selection');
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to dissolve chatroom');
      }
    } catch (error) {
      console.error(error);
      alert('Error dissolving chatroom');
    } finally {
      setIsDissolving(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <PageMeta
        title="Dissolve Chatroom | Group Expense Tracker"
        description="Dissolve or close the current chatroom in Group Expense Tracker."
      />
      <PageBreadcrumb pageTitle="Dissolve" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-error-500 text-theme-xl dark:text-error-400 sm:text-2xl">
            Dissolve Chatroom
          </h3>

          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Are you completely sure you want to dissolve this chatroom? All members will be removed and this action is permanent.
          </p>

          <div className="space-y-4">
            <Button
              onClick={handleDissolveRoom}
              disabled={isDissolving}
              className="w-full bg-error-500 hover:bg-error-600 text-white border-transparent"
            >
              {isDissolving ? 'Dissolving...' : 'Yes, Dissolve Chatroom'}
            </Button>

            <Button
              onClick={() => navigate('/home')}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}