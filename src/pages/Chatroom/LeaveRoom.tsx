import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;

export default function LeaveRoom() {
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);
  const [errorMsg, seterrorMsg] = useState("");
  const handleLeaveRoom = async () => {
    setIsLeaving(true);
    seterrorMsg("");
    try {

      const roomdata = localStorage.getItem('currentRoom');
      const processed = roomdata ? JSON.parse(roomdata) : null;

      const data = localStorage.getItem('user');
      const userdata = data ? JSON.parse(data) : null;
    
      console.log("Processed: ",JSON.stringify(processed));
      // TODO: Call API to leave room
      const response = await fetch(`${VITE_ROUTE_API_KEY}/groups/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({group_id: processed.Groupid , target_uuid:userdata.id, role: processed.role})
      });

      if (response.ok) {
        const jsonstr = await response.json();

        if(jsonstr.adminError){
         seterrorMsg(jsonstr.adminError); 
         return;
        }
        localStorage.removeItem('currentRoom');
    
        navigate('/chatroom/room-selection');
      } else {
        seterrorMsg('Failed to leave room');
      }
    } catch (error) {
      console.error(error);
      seterrorMsg('Error leaving room');
    } finally {
      setIsLeaving(false);
      seterrorMsg("");
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
              {isLeaving ? ( errorMsg ? errorMsg : 'Leaving...') : 'Leave Room'}
            </Button>

            <Button
              onClick={() => navigate('/home')}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
            {errorMsg ? <p className="space-y-4">{errorMsg}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
