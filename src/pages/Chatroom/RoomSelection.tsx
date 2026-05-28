//This page is loaded when user has logged in or registered.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

export default function RoomSelection() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }
    setIsCreating(true);
    try {
      // TODO: Call API to create room
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: roomName })
      });
      if (response.ok) {
        const roomData = await response.json();
        // Store room information in localStorage
        const roomAttribute = [roomData.group_id,
          roomData.room_code,
          roomData.role,
          roomData.Groupname,
          roomData.RoomCodeVisibility
        ];
        localStorage.setItem('currentRoom', JSON.stringify(roomAttribute));
        // Navigate to dashboard after room selection
        navigate('/home');
      } else {
        alert('Failed to create room');
      }
    } catch (error) {
      console.error(error);
      alert('Error creating room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      alert('Please enter a join code');
      return;
    }
    setIsJoining(true);
    try {
      // TODO: Call API to join room
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code: joinCode })
      });
      if (response.ok) {
        const roomData = await response.json();
        // Store room information in localStorage
        localStorage.setItem('currentRoom', JSON.stringify(roomData));
        // Navigate to dashboard after room selection
        navigate('/home');
      } else {
        alert('Failed to join room');
      }
    } catch (error) {
      console.error(error);
      alert('Error joining room');
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
