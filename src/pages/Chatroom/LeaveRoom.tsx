import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";

export default function LeaveRoom() {
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeaveRoom = async () => {
    setIsLeaving(true);
    try {
      // TODO: Call API to leave room
      const response = await fetch('/api/groups/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Clear room data from localStorage
        localStorage.removeItem('currentRoom');
        // Navigate to room selection
        navigate('/chatroom/room-selection');
      } else {
        alert('Failed to leave room');
      }
    } catch (error) {
      console.error(error);
      alert('Error leaving room');
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div>
      <PageMeta
        title="Leave Room | Group Expense Tracker"
        description="Leave an active chatroom and manage your chatroom exits."
      />
      <PageBreadcrumb pageTitle="Leave Room" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Leave Room
          </h3>

          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Are you sure you want to leave the current room? This action cannot be undone.
          </p>

          <div className="space-y-4">
            <Button
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              variant="outline"
              className="w-full"
            >
              {isLeaving ? 'Leaving...' : 'Leave Room'}
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
