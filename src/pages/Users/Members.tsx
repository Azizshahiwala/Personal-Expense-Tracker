import { useState, useEffect } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Avatar from "../../components/ui/avatar/Avatar";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import { useAuth } from "../../context/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface Member {
  user_id?: string;  // ← add this for API calls
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  pfp_path: string;
  can_chat?: boolean;  // ← tracks if muted
}

interface ConfirmDialog {
  message: string;
  action: () => Promise<void>;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);  // tracks which member action is loading
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const { isAdmin } = useAuth();
  const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
        const token = localStorage.getItem('access_token');
        const safeGroupCode = currentRoom.Groupid || currentRoom.group_id || "";

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

        const response = await fetch(
          `${VITE_ROUTE_API_KEY}/groups/members/${safeGroupCode}`,
          { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }
        );

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

  // ── Show brief feedback toast ──────────────────────────────────────────
  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  // ── Mute/Unmute member ────────────────────────────────────────────────
  const handleToggleMute = (member: Member) => {
    const newMuteState = !member.can_chat;
    const action = newMuteState ? "Unmute" : "Mute";
    const fullName = `${member.first_name} ${member.last_name}`;

    setConfirm({
      message: `${action} ${fullName}? ${newMuteState ? 'They will be able to chat.' : 'They will not be able to send messages.'}`,
      action: async () => {
        setActionLoading(member.user_id || '');
        try {
          const token = localStorage.getItem('access_token');
          const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
          const safeGroupCode = currentRoom.Groupid || currentRoom.group_id || "";

          const response = await fetch(
            `${VITE_ROUTE_API_KEY}/groups/mute/${safeGroupCode}/${member.user_id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ can_chat: newMuteState })
            }
          );

          if (response.ok) {
            // Update local state
            setMembers((prev) =>
              prev.map((m) =>
                m.user_id === member.user_id ? { ...m, can_chat: newMuteState } : m
              )
            );
            showFeedback(`${fullName} was ${action.toLowerCase()}d.`);
          } else {
            setError(`Failed to ${action.toLowerCase()} member.`);
          }
        } catch (err) {
          console.error(err);
          setError(`Error ${action.toLowerCase()}ing member.`);
        } finally {
          setActionLoading(null);
          setConfirm(null);
        }
      }
    });
  };

  // ── Kick member ───────────────────────────────────────────────────────
  const handleKickMember = (member: Member) => {
    const fullName = `${member.first_name} ${member.last_name}`;

    setConfirm({
      message: `Remove ${fullName} from the group? They will be only able to rejoin after 24 hours.`,
      action: async () => {
        setActionLoading(member.user_id || '');
        try {
          const token = localStorage.getItem('access_token');
          const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
          const safeGroupCode = currentRoom.Groupid || currentRoom.group_id || "";

          const response = await fetch(
            `${VITE_ROUTE_API_KEY}/groups/kick/${safeGroupCode}/${member.user_id}`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          if (response.ok) {
            // Remove from local state
            setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
            showFeedback(`${fullName} was removed from the group.`);
          } else {
            setError('Failed to remove member.');
          }
        } catch (err) {
          console.error(err);
          setError('Error removing member.');
        } finally {
          setActionLoading(null);
          setConfirm(null);
        }
      }
    });
  };

  return (
    <div>
      <PageMeta
        title="Members | Group Expense Tracker"
        description="View and manage group members in Group Expense Tracker."
      />
      <PageBreadcrumb pageTitle="Members" />

      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10">
          <h3 className="mb-2 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Group Members
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Browse the group member list and manage user access.
          </p>
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400 text-sm text-center">
            {feedback}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && !error && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-10">
            Loading members...
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && members.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Member
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Email
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Role
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                      Status
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {members.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <Avatar src={member.pfp_path} size="small" />
                          <div>
                            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {member.first_name} {member.last_name}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {member.email}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={member.role === "admin" ? "success" : "light"}
                        >
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-center">
                        {member.can_chat === false ? (
                          <Badge size="sm" color="warning">Muted</Badge>
                        ) : (
                          <Badge size="sm" color="success">Active</Badge>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-center">
                        {member.role === 'admin' ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggleMute(member)}
                              disabled={actionLoading === member.user_id}
                              className="text-theme-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === member.user_id ? "..." : (member.can_chat === false ? "Unmute" : "Mute")}
                            </button>
                            <button
                              onClick={() => handleKickMember(member)}
                              disabled={actionLoading === member.user_id}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-theme-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === member.user_id ? "..." : "Kick"}
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && members.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-10">
            No members found in this group.
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <div style={dialogStyles.overlay}>
          <div style={dialogStyles.box}>
            <p style={dialogStyles.message}>{confirm.message}</p>
            <div style={dialogStyles.btnRow}>
              <button onClick={() => setConfirm(null)} style={dialogStyles.cancelBtn}>
                Cancel
              </button>
              <button onClick={confirm.action} style={dialogStyles.confirmBtn}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
  },
  box: {
    background: "white",
    borderRadius: "12px",
    padding: "24px",
    maxWidth: "360px",
    width: "90%",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  },
  message: {
    fontSize: "14px",
    color: "#333",
    marginBottom: "20px",
    lineHeight: "1.5",
    textAlign: "center",
  },
  btnRow: {
    display: "flex",
    gap: "10px",
  },
  cancelBtn: {
    flex: 1,
    padding: "10px",
    background: "transparent",
    color: "#666",
    border: "1.5px solid #ddd",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
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
  },
};