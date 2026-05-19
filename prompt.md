import { useState, useEffect, useRef } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  timestamp: string;
}
const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
const activeUserId = currentUser.id || "Me";

// ─── Avatar initials helper ───────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Avatar color from name (nature palette) ─────────────────────────────────
const AVATAR_COLORS = [
  { bg: "#2D5A27", text: "#D4E8B0" },
  { bg: "#3B6E52", text: "#C8E6D4" },
  { bg: "#5C4A1E", text: "#E8D5A0" },
  { bg: "#2B4A6F", text: "#B8D4E8" },
  { bg: "#6B4226", text: "#E8CBAA" },
  { bg: "#4A5E3A", text: "#D0E0BC" },
];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Room() {
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false); 
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;
  const socketRef = useRef<WebSocket | null>(null);

  const getHistory = async () =>{

      const currentRoom = JSON.parse(localStorage.getItem("currentRoom") || "{}");
      const roomCode = currentRoom?.group_id || currentRoom?.Groupid || "—";
      
      const response = await fetch(`${VITE_ROUTE_API_KEY}/chat/history/${roomCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if(response.ok){
        const current = JSON.parse(localStorage.getItem("user") || "{}");
        const User = current?.id || "";
        const data = await response.json();
        //Now we format list of json items using map function.
        const formatted = data.history.map((msg:any,index:any)=>({
          id: msg.id ? msg.id.toString() : index.toString(), 
          sender_id: msg.Sender_id || "unknown",
          sender_name: (User == msg.Sender_id) ? "You" : msg.Username,
          message: msg.Message,
          timestamp: new Date(msg.Timestamp).toLocaleTimeString([], { 
          hour: "2-digit", 
          minute: "2-digit" 
        })
        
        }));  
        setMessages(formatted);
        console.log("Data fetched: "+JSON.stringify(formatted));
      }
  }
  
  useEffect(() => {
    //Get history first.
    getHistory();

    const currentRoom = JSON.parse(localStorage.getItem("currentRoom") || "{}");
    const roomCode = currentRoom?.group_id || currentRoom?.Groupid || "";
    const token = localStorage.getItem('access_token');

    if (!roomCode || !token) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    //i will remove https to wss. that means its "web socket secure". If it localhost, its "ws -> web socket"
    const rawDomain = VITE_ROUTE_API_KEY.replace(/^https?:\/\//, '');
    const wsUrl = `${protocol}//${rawDomain}/chat/ws/${roomCode}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    
    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const current = JSON.parse(localStorage.getItem("user") || "{}");
      
      const incomingMessage: Message = {
        id: data.id.toString(),
        sender_id: data.Sender_id,
        sender_name: data.Sender_id === (current.user_id || current.id) ? "You" : data.Username,
        message: data.Message || data.message,
        timestamp: new Date(data.Timestamp || data.timestamp).toLocaleTimeString([], { 
          hour: "2-digit", 
          minute: "2-digit" 
        })
      };
      setMessages((prevMessages) => {
        return [...prevMessages, incomingMessage];
      });
    };

    ws.onclose = (event) => {
      console.log("WS CLOSED:", event.code, event.reason);
      setIsConnected(false);
    };

    ws.onerror = (error) =>{
      console.log("WS ERROR:", error);
    }
    
    return () => {
      if (socketRef.current) {
        ws.close();
        socketRef.current = null;
      }};
  }, []); 
  
  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  
  const sendMessage = () => {
    const text = inputText.trim();

    if (text === "") return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(text);
      setInputText("");
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentRoom = JSON.parse(localStorage.getItem("currentRoom") || "{}");
  const roomCode = currentRoom?.group_id || currentRoom?.Groupid || "—";
  const roomName = currentRoom?.room_name || currentRoom?.Groupname || "Room";
  
  return (
    <>
      <PageMeta title="Room | Group Expense Tracker" description="Group chatroom." />
      <PageBreadcrumb pageTitle="Chatroom" />

      {/* ── Outer wrapper ───────────────────────────────────────────────────── */}
      <div style={styles.wrapper}>

        {/* ── Room header ─────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.leafIcon}>🌿</div>
            <div>
              <div style={styles.headerTitle}>{roomName}</div>
              <div style={styles.headerSub}>Code: {roomCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ ...styles.dot, background: isConnected ? "#6BAE5E" : "#C0A882" }} />
            <span style={styles.connStatus}>{isConnected ? "Connected" : "Offline"}</span>
          </div>
        </div>

        {/* ── Messages area ────────────────────────────────────────────────── */}
        <div style={styles.msgArea}>

          {/* Date divider */}
          <div style={styles.dateDivider}>
            <div style={styles.dateLine} />
            <span style={styles.dateText}>Today</span>
            <div style={styles.dateLine} />
          </div>

          {messages.map((msg, idx) => {
            const isMine = msg.sender_id === activeUserId;
            const prevMsg = messages[idx - 1];
            const sameSender = prevMsg && prevMsg.sender_id === msg.sender_id;
            const color = getAvatarColor(msg.sender_name);

            return (
              <div
                key={msg.id}
                style={{
                  ...styles.msgRow,
                  justifyContent: isMine ? "flex-end" : "flex-start",
                  marginTop: sameSender ? "4px" : "14px",
                }}
              >
                {/* Avatar — left side only, first in group */}
                {!isMine && (
                  <div style={{ width: "32px", flexShrink: 0, alignSelf: "flex-end", marginBottom: "2px" }}>
                    {!sameSender && (
                      <div style={{ ...styles.avatar, background: color.bg, color: color.text }}>
                        {getInitials(msg.sender_name)}
                      </div>
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                  {/* Sender name — only for others, first in group */}
                  {!isMine && !sameSender && (
                    <span style={styles.senderName}>{msg.sender_name}</span>
                  )}

                  <div style={{
                    ...styles.bubble,
                    ...(isMine ? styles.bubbleMine : styles.bubbleOther),
                    borderRadius: isMine
                      ? (sameSender ? "18px 4px 18px 18px" : "18px 4px 18px 18px")
                      : (sameSender ? "4px 18px 18px 18px" : "4px 18px 18px 18px"),
                  }}>
                    {msg.message}
                  </div>

                  <span style={styles.timestamp}>{msg.timestamp}</span>
                </div>

                {/* Right spacer for other messages */}
                {!isMine && <div style={{ width: "8px" }} />}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar ────────────────────────────────────────────────────── */}
        <div style={styles.inputBar}>
          <div style={styles.inputWrap}>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              style={styles.input}
            />
            <button
              onClick={sendMessage}
              disabled={!inputText.trim()}
              style={{
                ...styles.sendBtn,
                opacity: inputText.trim() ? 1 : 0.45,
                cursor: inputText.trim() ? "pointer" : "not-allowed",
              }}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div style={styles.inputHint}>Press Enter to send</div>
        </div>

      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 180px)",
    minHeight: "500px",
    borderRadius: "20px",
    overflow: "hidden",
    border: "1px solid #D4C9A8",
    background: "linear-gradient(160deg, #F7F4ED 0%, #EFF0E8 100%)",
    boxShadow: "0 4px 24px rgba(45, 60, 30, 0.08)",
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    background: "#2D5A27",
    borderBottom: "1px solid #3B7030",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  leafIcon: {
    fontSize: "22px",
    lineHeight: 1,
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#D4E8B0",
    letterSpacing: "0.02em",
  },
  headerSub: {
    fontSize: "11px",
    color: "#8FC87A",
    marginTop: "2px",
    fontFamily: "'Courier New', monospace",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  connStatus: {
    fontSize: "12px",
    color: "#8FC87A",
    fontFamily: "system-ui, sans-serif",
  },
  msgArea: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 20px 12px",
    display: "flex",
    flexDirection: "column",
    scrollbarWidth: "thin",
    scrollbarColor: "#C8BFA0 transparent",
  },
  dateDivider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "8px 0 20px",
  },
  dateLine: {
    flex: 1,
    height: "1px",
    background: "#C8BFA0",
    opacity: 0.5,
  },
  dateText: {
    fontSize: "11px",
    color: "#8A7E65",
    fontFamily: "system-ui, sans-serif",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  msgRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 700,
    fontFamily: "system-ui, sans-serif",
    flexShrink: 0,
    border: "1.5px solid rgba(255,255,255,0.3)",
  },
  senderName: {
    fontSize: "11px",
    color: "#6B7A5A",
    marginBottom: "3px",
    marginLeft: "2px",
    fontFamily: "system-ui, sans-serif",
    fontWeight: 600,
  },
  bubble: {
    padding: "10px 14px",
    fontSize: "14.5px",
    lineHeight: "1.55",
    wordBreak: "break-word",
    position: "relative",
  },
  bubbleMine: {
    background: "#2D5A27",
    color: "#D8ECC0",
    boxShadow: "0 2px 8px rgba(45,90,39,0.18)",
  },
  bubbleOther: {
    background: "#FFFFFF",
    color: "#2C2B1E",
    border: "1px solid #E0D9C5",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  timestamp: {
    fontSize: "10px",
    color: "#9E9580",
    marginTop: "3px",
    fontFamily: "system-ui, sans-serif",
  },
  inputBar: {
    padding: "12px 20px 16px",
    background: "#F0EDE3",
    borderTop: "1px solid #D4C9A8",
    flexShrink: 0,
  },
  inputWrap: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    background: "#FFFFFF",
    border: "1.5px solid #C8BFA0",
    borderRadius: "24px",
    padding: "6px 8px 6px 18px",
    transition: "border-color 0.2s",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "14px",
    color: "#2C2B1E",
    fontFamily: "'Georgia', serif",
    lineHeight: "1.5",
    padding: "4px 0",
  },
  sendBtn: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "none",
    background: "#2D5A27",
    color: "#D4E8B0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.15s, transform 0.1s",
  },
  inputHint: {
    fontSize: "11px",
    color: "#B0A88A",
    marginTop: "6px",
    textAlign: "center" as const,
    fontFamily: "system-ui, sans-serif",
  },
};