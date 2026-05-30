import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

// Import your custom UI components
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";

// Define the member interface for typescript
interface Member {
  id: string;
  name: string;
  isMuted: boolean;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  pfp_path: string;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAdmin, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;
  // ─── MOCK STATE (Replace with database fetch) ─────────────────────────────
  const [inviteRestricted, setInviteRestricted] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
        const token = localStorage.getItem('access_token'); 
        
        const safeGroupCode = currentRoom.Groupid || currentRoom.group_id || "";
        console.log("Group code fetched: ",safeGroupCode);
        console.log("Current grp: ",currentRoom); 
        
        if(currentRoom){
          const latest = !currentRoom.RoomCodeVisibility
          setInviteRestricted(latest);
        }
        if (!safeGroupCode) {
          setError("No active room found. Please join a room first.");
          setIsLoading(false);
          return;
        }

        if (!token) {
          setError("Authentication token missing. Please log in again.");
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${VITE_ROUTE_API_KEY}/groups/members/${safeGroupCode}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok) {
          setMembers(data.members);
        } else {
          setError(data.detail || "Failed to load members.");
        }
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred while fetching members.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [VITE_ROUTE_API_KEY]);

  

  // ─── AUTHENTICATION CHECK ─────────────────────────────────────────────────
  useEffect(() => {
    const data = localStorage.getItem("user");
    if (!data) {
      setIsLoading(false);
      return;
    }

    try {
      JSON.parse(data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        navigate("/");
        return;
      }
    }
  }, [isLoading, isLoggedIn, isAdmin, navigate]);


  // ─── CORE LOGIC PLACEHOLDERS ──────────────────────────────────────────────

  const handleToggleInviteRestriction = async () => {
    console.log("Setting invite restriction to:", !inviteRestricted);
    
    try{
      const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
        const token = localStorage.getItem('access_token'); 
        const safeGroupCode = currentRoom.Groupid || currentRoom.group_id || "";

      const response = await fetch(`${VITE_ROUTE_API_KEY}/groups/restrictInvite/${safeGroupCode}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok) {
          setInviteRestricted(data.Restrict);
          currentRoom.RoomCodeVisibility = inviteRestricted;

          localStorage.setItem('currentRoom',JSON.stringify(currentRoom));
          console.log("Toggle currentroom:",currentRoom);
          
        } else {
          setError(data.detail || "Failed to load members.");
        }
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred while fetching members.");
      } finally {
        setIsLoading(false);
      }
  };

  const handleMuteMember = (userId: string) => {
    console.log("Toggling mute for user:", userId);
    
    // Update local UI state
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, isMuted: !m.isMuted } : m))
    );
  };

  const handleKickMember = (userId: string) => {
    // TODO: Send API request to remove user from the group
    console.log("Kicking user:", userId);
    
    // Update local UI state
    setMembers((prev) => prev.filter((m) => m.id !== userId));
  };


  // ─── RENDER ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return <div className="p-5 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <PageMeta
        title="Admin Panel | Group Expense Tracker"
        description="Manage group users and admin settings for Group Expense Tracker."
      />
      <PageBreadcrumb pageTitle="Admin Panel" />

      {/* Main Wrapper */}
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[900px]">
          
          {/* Header */}
          <div className="mb-8 text-center">
            <h3 className="mb-2 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
              Admin Panel
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
              Manage users, roles, and group settings.
            </p>
          </div>

          {/* Section 1: Group Settings Card */}
          <div className="mb-10 rounded-xl border border-gray-200 p-6 dark:border-white/[0.05]">
            <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
              Group Settings
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Restrict Invites
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  When active, only admins can view the invite code.
                </p>
              </div>
              <button
                onClick={handleToggleInviteRestriction}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  inviteRestricted
                    ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-900"
                    : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-900"
                }`}
              >
                {inviteRestricted ? "Restricted" : "Open"}
              </button>
            </div>
          </div>

          {/* Section 2: Member Management Table */}
          <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
            Member Management
          </h4>
          
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                {/* Table Header */}
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      User
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Status
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                {/* Table Body */}
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {members.map((member,index) => (
                    <TableRow key={index}>
                      
                      {/* User Profile Cell */}
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center">
                            {member.pfp_path ? (
                              <img
                                width={40}
                                height={40}
                                src={member.pfp_path}
                                alt="User"
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <span className="text-gray-400 font-medium">
                                {member.first_name} {member.last_name}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {member.first_name} {member.last_name}
                            </span>
                            <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                              {member.role}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status Badge Cell */}
                      <TableCell className="px-4 py-3 text-start">
                        <Badge
                          size="sm"
                          color={member.isMuted ? "warning" : "success"}
                        >
                          {member.isMuted ? "Muted" : "Active"}
                        </Badge>
                      </TableCell>

                      {/* Actions Cell */}
                      <TableCell className="px-4 py-3 text-end">
                        {member.role == "admin" ? "-":(<div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleMuteMember(member.id)}
                            className="text-theme-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors">
                            {member.isMuted ? "Unmute" : "Mute"}
                          </button>                  
                          <button
                            onClick={() => handleKickMember(member.id)}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-theme-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                            Kick
                          </button>
                
                        </div>)}
                      </TableCell>

                    </TableRow>
                  ))}

                  {/* Empty State Fallback */}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell className="px-5 py-8 text-center text-gray-500 text-theme-sm">
                        No members found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}