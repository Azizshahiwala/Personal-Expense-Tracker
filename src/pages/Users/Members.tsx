import { useState, useEffect } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Avatar from "../../components/ui/avatar/Avatar";
import Button from "../../components/ui/button/Button";
import { useAuth } from "../../context/AuthContext";
import Badge from "../../components/ui/badge/Badge";
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

export default function Members() {

  const {isAdmin} = useAuth();
  const hasRoom = () => {
      try {
        const roomData = localStorage.getItem('currentRoom');
        return Boolean(roomData !== null && roomData !== undefined);
      } catch (error) {
        return false;
      }
    };
  
  const IsMuted = () => {
    
    try {
      if (hasRoom() && !isAdmin) {
        const room = JSON.parse(localStorage.getItem('currentRoom') || '{}');
        return Boolean(room.CanChat);
      }
      return Boolean(true);
    } catch {
      return false;
    }
  }
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
            Browse the group member list.
          </p>
        </div>

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
                        {member.can_chat === false? (
                          <Badge size="sm" color="warning">Muted</Badge>
                        ) : (
                          <Badge size="sm" color="success">Active</Badge>
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

    </div>
  );
}
