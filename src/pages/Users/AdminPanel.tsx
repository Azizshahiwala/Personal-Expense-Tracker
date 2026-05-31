import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";

interface Member {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  pfp_path: string;
  CanChat: boolean;
}

interface ConfirmDialog {
  message: string;
  onConfirm: () => Promise<void>;
}
interface CurrentRoom {
  Groupid?: string;
  group_id?: string;
  can_see_invite_code?: boolean;
  [key: string]: any;
}

export function getCurrentRoom(): CurrentRoom {
  try {
    const roomData = localStorage.getItem("currentRoom");
    return roomData ? JSON.parse(roomData) : {};
  } catch (error) {
    console.error("Failed to parse currentRoom:", error);
    return {};
  }
}

export function getGroupId(): string {
  const room = getCurrentRoom();
  return (room.Groupid || room.group_id || "") as string;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAdmin, isLoggedIn } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null);

  const [inviteRestricted, setInviteRestricted] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const data = localStorage.getItem("user");
    if (!data) {
      setIsLoading(false);
      return;
    }
    try {
      JSON.parse(data);
    } catch {
      console.error("Bad localStorage data");
    }
  }, []);

  useEffect(() => {
    if (!isLoading && (!isLoggedIn || !isAdmin)) {
      navigate("/");
    }
  }, [isLoading, isLoggedIn, isAdmin, navigate]);

  // ── Fetch members + settings ────────────────────────────────────────────
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const currentRoom = JSON.parse(localStorage.getItem("currentRoom") || "{}");
      const token = localStorage.getItem("access_token");
      const safeGroupCode = currentRoom.Groupid || currentRoom.group_id || "";

      if (!safeGroupCode || !token) {
        setError("Missing group or authentication. Please join a group first.");
        setIsLoading(false);
        return;
      }

      const res = await fetch(`${VITE_ROUTE_API_KEY}/groups/members/${safeGroupCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        setError("Failed to load members");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setInviteRestricted(!currentRoom.RoomCodeVisibility);
      const membersWithDefaults = (data.members || []).map((m: any) => ({
      ...m,
      CanChat: m.CanChat !== undefined ? m.CanChat : true
    }));

      setMembers(membersWithDefaults);
      
    } catch (err) {
      console.error(err);
      setError("Error loading admin panel");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Show feedback toast ─────────────────────────────────────────────────
  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  // ── Toggle invite restriction ───────────────────────────────────────────
  const handleToggleInviteRestriction = async () => {
    
    try {
      const currentRoom = JSON.parse(localStorage.getItem("currentRoom") || "{}");
      const token = localStorage.getItem("access_token");
      const safeGroupCode = currentRoom.Groupid || currentRoom.group_id || "";

      const res = await fetch(
        `${VITE_ROUTE_API_KEY}/groups/restrictInvite/${safeGroupCode}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setInviteRestricted(data.Restrict=== false);
        currentRoom.RoomCodeVisibility = data.RoomCodeVisibility;
        console.log(currentRoom);
        
        localStorage.setItem("currentRoom", JSON.stringify(currentRoom));
        showFeedback("Invite restriction updated");
      } else {
        setError("Failed to update restriction");
      }
    } catch (err) {
      console.error(err);
      setError("Error updating restriction");
    }
  };

  // ── Mute member ────────────────────────────────────────────────────────
  const handleToggleMute = (member: Member) => {
  const isMuted = !member.CanChat;  // true if currently muted
  const actionText = isMuted ? "Unmute" : "Mute";
  const fullName = `${member.first_name} ${member.last_name}`;

  console.log("PART 1: ");
  console.log("isMuted: "+isMuted);
  console.log("actionText: "+actionText);
  console.log("FullName: "+fullName);
  
  setConfirm({
    message: `${actionText} ${fullName}?`,
    onConfirm: async () => {
      setActionLoading(member.user_id);
      try {
        let currentRoom: { Groupid?: string; group_id?: string } = {};
        try {
          const roomData = localStorage.getItem("currentRoom");
          if (roomData) {
            currentRoom = JSON.parse(roomData);
            console.log("Inside onConfirm -> if(). "+JSON.stringify(currentRoom));
          }
        } catch (parseError) {
          console.error("Invalid JSON in localStorage:", parseError);
          setError("Invalid group data. Please rejoin the group.");
          setActionLoading(null);
          setConfirm(null);
          return;
        }

        const token = localStorage.getItem("access_token");
        const safeGroupCode = currentRoom.Groupid || currentRoom.group_id || "";

        if (!safeGroupCode) {
          setError("Group ID not found. Please rejoin the group.");
          setActionLoading(null);
          setConfirm(null);
          return;
        }

        const userId = String(member.user_id);

        const newChatState = !isMuted;  // toggle
        const url = `${VITE_ROUTE_API_KEY}/groups/mute/${safeGroupCode}/${userId}?can_chat=${newChatState}`;
        console.log("PART 2");
        console.log("Selected User id"+userId);
        console.log("New chat state for this user (Muted): "+newChatState);
        const res = await fetch(url, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok) {
          // Update with backend response
          console.log("Backend response:", data);
          setMembers((prev) =>
            
            prev.map((m) =>
              m.user_id === member.user_id ? { ...m, CanChat: data.CanChat } : m
            )
          );
          console.log("This member perms: "+members[0].CanChat);
          showFeedback(`${fullName} was ${actionText.toLowerCase()}d`);
        } else {
          setError(data.detail || `Failed to ${actionText.toLowerCase()} member`);
        }
      } catch (err) {
        console.error(err);
        setError(`Error ${actionText.toLowerCase()}ing member`);
      } finally {
        setActionLoading(null);
        setConfirm(null);
      }
    }
  });
};
  // ── Kick member ────────────────────────────────────────────────────────
  const handleKickMember = (member: Member) => {
    const fullName = `${member.first_name} ${member.last_name}`;

    setConfirm({
      message: `Remove ${fullName} from the group? They can rejoin after 24 hours.`,
      onConfirm: async () => {
        setActionLoading(member.user_id);
        try {
          const currentRoom = JSON.parse(localStorage.getItem("currentRoom") || "{}");
          const token = localStorage.getItem("access_token");
          const safeGroupCode = currentRoom.Groupid || currentRoom.group_id || "";

          const res = await fetch(
            `${VITE_ROUTE_API_KEY}/groups/kick/${safeGroupCode}/${member.user_id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          if (res.ok) {
            setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
            showFeedback(`${fullName} was removed`);
          } else {
            setError("Failed to remove member");
          }
        } catch (err) {
          console.error(err);
          setError("Error removing member");
        } finally {
          setActionLoading(null);
          setConfirm(null);
        }
      }
    });
  };

  if (isLoading) return <div className="p-5 text-gray-500">Loading…</div>;

  return (
    <>
      <PageMeta title="Admin Panel | Group Expense Tracker" description="Manage group." />
      <PageBreadcrumb pageTitle="Admin Panel" />

      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10">
          <h3 className="mb-2 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Admin Panel
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Manage members and group permissions.
          </p>
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
            {feedback}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Group Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
            Group Settings
          </h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Restrict Invites
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Only admins can see the invite code.
              </p>
            </div>
            <button
              onClick={handleToggleInviteRestriction}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                inviteRestricted
                  ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-400"
                  : "border border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-500/10 dark:text-green-400"
              }`}
            >
              {inviteRestricted ? "Restricted" : "Open"}
            </button>
          </div>
        </div>

        {/* Member Management */}
        <div>
          <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
            Member Management
          </h4>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      Member
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      Status
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-end font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {members.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell className="px-5 py-4 text-start sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                            {member.pfp_path ? (
                              <img src={member.pfp_path} alt="User" className="h-full w-full object-cover" />
                            ) : (
                              <span className="font-medium text-gray-400">
                                {member.first_name[0]}{member.last_name[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {member.first_name} {member.last_name}
                            </span>
                            <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                              {member.role === "admin" ? "Admin" : "Member"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-start">
                        <Badge size="sm" color={member.CanChat ? "success" : "warning"}>
                          {member.CanChat ? "Active" : "Muted"}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-end">
                        {member.role === "admin" ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleMute(member)}
                              disabled={actionLoading === member.user_id}
                              className="text-theme-sm font-medium text-gray-500 transition-colors hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-white"
                            >
                              {actionLoading === member.user_id ? "..." : member.CanChat ? "Mute" : "Unmute"}
                            </button>
                            <button
                              onClick={() => handleKickMember(member)}
                              disabled={actionLoading === member.user_id}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-theme-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            >
                              {actionLoading === member.user_id ? "..." : "Kick"}
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

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

      {/* Confirm Dialog */}
      {confirm && (
        <div style={dialogStyles.overlay}>
          <div style={dialogStyles.box}>
            <p style={dialogStyles.message}>{confirm.message}</p>
            <div style={dialogStyles.btnRow}>
              <button onClick={() => setConfirm(null)} style={dialogStyles.cancelBtn}>
                Cancel
              </button>
              <button onClick={confirm.onConfirm} style={dialogStyles.confirmBtn}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const dialogStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(3px)"
  },
  box: {
    background: "white",
    borderRadius: "12px",
    padding: "24px",
    maxWidth: "360px",
    width: "90%",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
  },
  message: {
    fontSize: "14px",
    color: "#333",
    marginBottom: "20px",
    lineHeight: "1.5",
    textAlign: "center"
  },
  btnRow: { display: "flex", gap: "10px" },
  cancelBtn: {
    flex: 1,
    padding: "10px",
    background: "transparent",
    color: "#666",
    border: "1.5px solid #ddd",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer"
  },
  confirmBtn: {
    flex: 1,
    padding: "10px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: 600
  }
};