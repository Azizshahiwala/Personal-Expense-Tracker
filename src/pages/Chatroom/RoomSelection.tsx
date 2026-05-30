import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

export default function RoomSelection() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  
  const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;

  useEffect(() => {
    if (!isLoggedIn) {
      // User logged out → clear room data
      localStorage.removeItem('currentRoom');
      return;
    }

    const roomData = localStorage.getItem('currentRoom');
    if (roomData) {
      try {
        JSON.parse(roomData);
        console.log(roomData);  
        navigate('/chatroom/room');  
      } catch {
        localStorage.removeItem('currentRoom');
        console.log(roomData);
      }
    }
    else{
      console.log(roomData);
    }
  }, [isLoggedIn, navigate]);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setCreateError('Please enter a room name');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      const response = await fetch(`${VITE_ROUTE_API_KEY}/groups/create`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ roomname: roomName, created_by_uuid: user?.id })
      });
      
      if (response.ok) {
        const roomData = await response.json();
        localStorage.setItem('currentRoom', JSON.stringify(roomData));
        console.log(roomData);
        navigate('/chatroom/room');
      } else {
        setCreateError('Failed to create room');
      }
    } catch (error) {
      console.error(error);
      setCreateError('Error creating room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a join code');
      return;
    }
    setIsJoining(true);
    setJoinError('');
    try {
      const response = await fetch(`${VITE_ROUTE_API_KEY}/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ joincode: joinCode, joining_by_uuid: user?.id })
      });
      
      if (response.ok) {
        const roomData = await response.json();
        localStorage.setItem('currentRoom', JSON.stringify(roomData));
        console.log(roomData);
        navigate('/chatroom/room');
      } else {
        setJoinError('Failed to join room');
      }
    } catch (error) {
      console.error(error);
      setJoinError('Error joining room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div>
      <PageMeta
        title="Select Room | Group Expense Tracker"
        description="Create a room or join an existing one to start tracking expenses."
      />
      <PageBreadcrumb pageTitle="Select Room" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Select Room
          </h3>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Create a new room to start tracking expenses with your group, or join an existing room using a join code.
          </p>

          <div className="space-y-6">
            {/* Create Room Section */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
              <h4 className="mb-4 font-medium text-gray-800 dark:text-white/90">Create a New Room</h4>
              <div className="space-y-4">
                <div>
                  <Label>Room Name</Label>
                  <Input
                    type="text"
                    placeholder="Enter room name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
                {createError && <p className="text-sm text-red-500">{createError}</p>}
                <Button onClick={handleCreateRoom} disabled={isCreating} className="w-full">
                  {isCreating ? 'Creating...' : 'Create Room'}
                </Button>
              </div>
            </div>

            {/* Join Room Section */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
              <h4 className="mb-4 font-medium text-gray-800 dark:text-white/90">Join an Existing Room</h4>
              <div className="space-y-4">
                <div>
                  <Label>Join Code</Label>
                  <Input
                    type="text"
                    placeholder="Enter join code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                </div>
                {joinError && <p className="text-sm text-red-500">{joinError}</p>}
                <Button onClick={handleJoinRoom} disabled={isJoining} variant="outline" className="w-full">
                  {isJoining ? 'Joining...' : 'Join Room'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}