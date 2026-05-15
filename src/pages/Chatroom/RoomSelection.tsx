//This page is loaded when user has logged in or registered.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

export default function RoomSelection() {

  const hasRoom = () => {
    try {
      const roomData = localStorage.getItem('currentRoom');
      return roomData !== null && roomData !== undefined;
    } catch (error) {
      return false;
    }
  };
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { user, setUser } = useAuth();
  const [createError, setCreateError] = useState('');  // ← Better than alert()
  const [joinError, setJoinError] = useState('');
  const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;
  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setCreateError('Please enter a room name');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {

      const data = localStorage.getItem('user');
      const parsed = data ? JSON.parse(data) : null;
      let uuid = parsed.id;
      const response = await fetch(`${VITE_ROUTE_API_KEY}/groups/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ roomname: roomName ,created_by_uuid:uuid})
      });
      if (response.ok) {
        const roomData = await response.json();
        localStorage.setItem('currentRoom', JSON.stringify(roomData));
        console.log("Room data: ",roomData);
        // the ... is a spread operator, which appends shallow object of existing user obj.
        // and ! mark in front, tells to treat the obj as not null even if its empty.
        //a user is an admin who creates a group.
        setUser({...user!,role:"admin"});
        navigate('chatroom/room');
      } else {
        setCreateError('Failed to create room');
      }
    } catch (error) {
      console.error(error);
      setCreateError('Error creating room'); 
    } finally {
      setIsCreating(false);
      setCreateError('');
    }
  };
//V7YOME4584
  const handleJoinRoom = async () => {
    const data = localStorage.getItem('user');
    const parsed = data ? JSON.parse(data) : null;
    let uuid = parsed.id;
    if (!joinCode.trim()) {
      setJoinError('Please enter a join code');
      return;
    }
    setIsJoining(true);
    try {
      const response = await fetch(`${VITE_ROUTE_API_KEY}/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ joincode: joinCode, joining_by_uuid: uuid})
      });
      if (response.ok) {
        const roomData = await response.json();
        localStorage.setItem('currentRoom', JSON.stringify(roomData));
        
        // the ... is a spread operator, which appends shallow object of existing user obj.
        // and ! mark in front, tells to treat the obj as not null even if its empty.
        //a user is an member who joins a group.
        setUser({...user!,role:'member'});
        navigate('/home');
      } else {
        setJoinError('Failed to join room');
      }
    } catch (error) {
      console.error(error);
      setJoinError('Error joining room');
    } finally {
      setIsJoining(false);
      setJoinError('');
    }
  };

  if(hasRoom()){
    navigate("/chatroom/room");
  } 
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
                {createError && (
                  <p className="text-sm text-red-500">{createError}</p>
                )}
                <Button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full"
                >
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
                {joinError && (
                  <p className="text-sm text-red-500">{joinError}</p>
                )}
                <Button
                  onClick={handleJoinRoom}
                  disabled={isJoining}
                  variant="outline"
                  className="w-full"
                >
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
