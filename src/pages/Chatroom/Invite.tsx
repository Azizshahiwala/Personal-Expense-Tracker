import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useState , useEffect} from "react";
const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;
export default function Invite() {

  const [RoomCode, setRoomCode] = useState(""); 
  const SetRoomCode = async () => {
  //send request to backend for capturing the file after temp view.

  try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${VITE_ROUTE_API_KEY}/groups/getroomcode`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load fetch data: ${response.status}`);
        }
        if(response.ok){
          const data = await response.json();
          console.log(data);
          setRoomCode(data.room_code);
        }
      } catch (err) {
        console.log(err);
      } finally {
        
      }  
return;
}

useEffect(() => {
        if (RoomCode) return;
        SetRoomCode();
      }, [RoomCode]);

  return (
    <div>
      <PageMeta
        title="Invite | Group Expense Tracker"
        description="Invite members to the group chatroom in Group Expense Tracker."
      />
      <PageBreadcrumb pageTitle="Invite" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Invite
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Send invitations and add members to the chatroom. Use the code: {RoomCode}.
          </p>
        </div>
      </div>
    </div>
  );
}
