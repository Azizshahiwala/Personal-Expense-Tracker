import { useState, useEffect, useRef } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { FcInfo,FcEngineering } from "react-icons/fc";
import { CiShoppingCart } from "react-icons/ci";
type MessageType = "user" | "purchase" | "notification" | "system";

interface Message {
  id: string;
  type: MessageType; 
  sender_id: string;
  sender_name: string;
  message: string;
  timestamp: string;
  amtsent?: number;
  metadata?: Record<string, any>; // for purchase/notification extras
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

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

// ─── Message type renderers ───────────────────────────────────────────────────
function renderUserMessage(msg: Message, isMine: boolean, color: any) {
  const prevMsg = null; // handled in parent
  return (
    <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
      {!isMine && (
        <span style={styles.senderName}>{msg.sender_name}</span>
      )}
      <div style={{
        ...styles.bubble,
        ...(isMine ? styles.bubbleMine : styles.bubbleOther),
        borderRadius: isMine ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
      }}>
        {msg.message}
      </div>
      <span style={styles.timestamp}>{msg.timestamp}</span>
    </div>
  );
}

function renderPurchaseMessage(msg: Message) {
  return (
    <div style={{ maxWidth: "72%", ...styles.purchaseCard }}>
      <div style={styles.purchaseHeader}>
        <span style={styles.purchaseIcon}><CiShoppingCart/></span>
        <span style={styles.purchaseTitle}>Purchase</span>
      </div>
      <div style={styles.purchaseContent}>
        <p style={styles.purchaseDesc}>{msg.message}</p>
        {msg.metadata?.amount && (
          <div style={styles.purchaseAmount}>₹{msg.metadata.amount}</div>
        )}
        {msg.metadata?.paidBy && (
          <div style={styles.purchaseMeta}>Paid by: {msg.metadata.paidBy}</div>
        )}
      </div>
      <span style={styles.timestamp}>{msg.timestamp}</span>
    </div>
  );
}

function renderNotificationMessage(msg: Message) {
  return (
    <div style={{ maxWidth: "72%", ...styles.notificationCard }}>
      <div style={styles.notificationHeader}>
        <span style={styles.notificationIcon}><FcInfo/></span>
        <span style={styles.notificationTitle}>Notification</span>
      </div>
      <p style={styles.notificationContent}>{msg.message}</p>
      <span style={styles.timestamp}>{msg.timestamp}</span>
    </div>
  );
}

function renderSystemMessage(msg: Message) {
  return (
    <div style={{ maxWidth: "72%", ...styles.systemCard }}>
      <div style={styles.systemHeader}>
        <span style={styles.systemIcon}><FcEngineering/></span>
        <span style={styles.systemTitle}>System</span>
      </div>
      <p style={styles.systemContent}>{msg.message}</p>
      <span style={styles.timestamp}>{msg.timestamp}</span>
    </div>
  );
}

export default function Room() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setroomCode] = useState("");
  const [roomName, setroomName] = useState("");

  const activeUserIdRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;

  const getHistory = async (roomCodeVal: string, userIdVal: string) => {
    const response = await fetch(`${VITE_ROUTE_API_KEY}/chat/history/${roomCodeVal}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const formatted = data.history.map((msg: any, index: any) => {
        const senderId = msg.Senderid || msg.sender_id || "unknown";
        return {
          id: msg.id ? msg.id.toString() : index.toString(),
          type: (msg.Msgtype || "user") as MessageType, 
          sender_id: senderId,
          sender_name: senderId === userIdVal ? "You" : msg.Username,
          message: msg.message || msg.Message || "",
          amtspent: msg.Amtspent || undefined,
          timestamp: new Date(msg.Timestamp || msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      });
      setMessages(formatted);
    } else {
      setMessages([]);
    }
  };

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const currentRoom = JSON.parse(localStorage.getItem("currentRoom") || "{}");

    const roomCodeVal = currentRoom?.group_id || currentRoom?.Groupid || "";
    const userIdVal = currentUser.user_id || currentUser.id || "";
    const token = localStorage.getItem("access_token");

    activeUserIdRef.current = userIdVal;

    setroomCode(roomCodeVal);
    setroomName(currentRoom?.room_name || currentRoom?.Groupname || "Room");

    getHistory(roomCodeVal, userIdVal);

    if (!roomCodeVal || !token) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const rawDomain = VITE_ROUTE_API_KEY.replace(/^https?:\/\//, "");
    const wsUrl = `${protocol}//${rawDomain}/chat/ws/${roomCodeVal}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const incomingMessage: Message = {
        id: data.id?.toString() || Date.now().toString(),
        type: (data.Msgtype || "user") as MessageType,
        sender_id: data.sender_id,
        sender_name: data.sender_id === activeUserIdRef.current ? "You" : data.Username,
        message: data.message,
        amtsent: data.Amtsent || undefined,
        timestamp: new Date(data.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, incomingMessage]);
    };

    ws.onclose = (event) => {
      console.log("WS CLOSED:", event.code, event.reason);
      setIsConnected(false);
    };

    ws.onerror = (error) => console.log("WS ERROR:", error);

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, []);

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

  // ─── Test button to add different message types (for demo) ───────────────────
  const addTestMessage = (type: MessageType) => {
    const testMsg: Message = {
      id: Date.now().toString(),
      type,
      sender_id: "system",
      sender_name: "System",
      message: `This is a ${type} message example`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      metadata: type === "purchase" ? { amount: 500, paidBy: "John" } : undefined,
    };
    setMessages((prev) => [...prev, testMsg]);
  };

  return (
    <>
      <PageMeta title="Room | Group Expense Tracker" description="Group chatroom." />
      <PageBreadcrumb pageTitle="Chatroom" />

      <div style={styles.wrapper}>

        {/* Header */}
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

        {/* Messages */}
        <div style={styles.msgArea}>
          <div style={styles.dateDivider}>
            <div style={styles.dateLine} />
            <span style={styles.dateText}>Today</span>
            <div style={styles.dateLine} />
          </div>

          {messages.map((msg, idx) => {
            const isMine = msg.sender_id === activeUserIdRef.current;
            const isUserMsg = msg.type === "user";
            const prevMsg = messages[idx - 1];
            const sameSender = prevMsg && prevMsg.sender_id === msg.sender_id && isUserMsg;
            const color = getAvatarColor(msg.sender_name);

            // ─── User messages: left for others, left for "You" (not right) ───────
            if (isUserMsg) {
              return (
                <div
                  key={msg.id}
                  style={{
                    ...styles.msgRow,
                    justifyContent: "flex-start", // ← always left
                    marginTop: sameSender ? "4px" : "14px",
                  }}
                >
                  {/* Avatar — left side only, first in group */}
                  <div style={{ width: "32px", flexShrink: 0, alignSelf: "flex-end", marginBottom: "2px" }}>
                    {!sameSender && (
                      <div style={{ ...styles.avatar, background: color.bg, color: color.text }}>
                        {getInitials(msg.sender_name)}
                      </div>
                    )}
                  </div>

                  {renderUserMessage(msg, false, color)}
                  <div style={{ width: "8px" }} />
                </div>
              );
            }

            // ─── System messages: always right ──────────────────────────────────
            return (
              <div
                key={msg.id}
                style={{
                  ...styles.msgRow,
                  justifyContent: "flex-end", // ← always right
                  marginTop: "14px",
                }}
              >
                {msg.type === "purchase" && renderPurchaseMessage(msg)}
                {msg.type === "notification" && renderNotificationMessage(msg)}
                {msg.type === "system" && renderSystemMessage(msg)}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
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
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div style={styles.inputHint}>Press Enter to send</div>

          {/* Demo buttons — remove later */}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center" }}>
            <button onClick={() => addTestMessage("purchase")} style={styles.demoBtn}>+ Purchase</button>
            <button onClick={() => addTestMessage("notification")} style={styles.demoBtn}>+ Notification</button>
            <button onClick={() => addTestMessage("system")} style={styles.demoBtn}>+ System</button>
          </div>
        </div>

      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex", flexDirection: "column", height: "calc(100vh - 180px)",
    minHeight: "500px", borderRadius: "20px", overflow: "hidden",
    border: "1px solid #D4C9A8", background: "linear-gradient(160deg, #F7F4ED 0%, #EFF0E8 100%)",
    boxShadow: "0 4px 24px rgba(45, 60, 30, 0.08)", fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 24px", background: "#2D5A27", borderBottom: "1px solid #3B7030", flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  leafIcon: { fontSize: "22px", lineHeight: 1 },
  headerTitle: { fontSize: "16px", fontWeight: 600, color: "#D4E8B0", letterSpacing: "0.02em" },
  headerSub: { fontSize: "11px", color: "#8FC87A", marginTop: "2px", fontFamily: "'Courier New', monospace" },
  dot: { width: "8px", height: "8px", borderRadius: "50%" },
  connStatus: { fontSize: "12px", color: "#8FC87A", fontFamily: "system-ui, sans-serif" },
  msgArea: {
    flex: 1, overflowY: "auto", padding: "20px 20px 12px",
    display: "flex", flexDirection: "column",
    scrollbarWidth: "thin", scrollbarColor: "#C8BFA0 transparent",
  },
  dateDivider: { display: "flex", alignItems: "center", gap: "10px", margin: "8px 0 20px" },
  dateLine: { flex: 1, height: "1px", background: "#C8BFA0", opacity: 0.5 },
  dateText: {
    fontSize: "11px", color: "#8A7E65", fontFamily: "system-ui, sans-serif",
    letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap",
  },
  msgRow: { display: "flex", alignItems: "flex-end", gap: "8px" },
  avatar: {
    width: "32px", height: "32px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: 700, fontFamily: "system-ui, sans-serif",
    flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.3)",
  },
  senderName: {
    fontSize: "11px", color: "#6B7A5A", marginBottom: "3px",
    marginLeft: "2px", fontFamily: "system-ui, sans-serif", fontWeight: 600,
  },
  bubble: { padding: "10px 14px", fontSize: "14.5px", lineHeight: "1.55", wordBreak: "break-word", position: "relative" },
  bubbleMine: { background: "#2D5A27", color: "#D8ECC0", boxShadow: "0 2px 8px rgba(45,90,39,0.18)" },
  bubbleOther: { background: "#FFFFFF", color: "#2C2B1E", border: "1px solid #E0D9C5", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  timestamp: { fontSize: "10px", color: "#9E9580", marginTop: "3px", fontFamily: "system-ui, sans-serif" },

  // ─── Purchase message styles ───────────────────────────────────────────────────
  purchaseCard: {
    background: "linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%)",
    border: "1.5px solid #7CB342",
    borderRadius: "12px",
    padding: "12px 16px",
    boxShadow: "0 2px 8px rgba(124, 179, 66, 0.12)",
  },
  purchaseHeader: {
    display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px",
  },
  purchaseIcon: { fontSize: "16px" },
  purchaseTitle: { fontSize: "12px", fontWeight: 700, color: "#558B2F", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  purchaseContent: { marginBottom: "8px" },
  purchaseDesc: { fontSize: "14px", color: "#2C2B1E", margin: "0 0 8px 0", lineHeight: "1.5" },
  purchaseAmount: { fontSize: "16px", fontWeight: 700, color: "#7CB342", marginBottom: "4px" },
  purchaseMeta: { fontSize: "11px", color: "#558B2F", fontStyle: "italic" as const },

  // ─── Notification message styles ───────────────────────────────────────────────
  notificationCard: {
    background: "linear-gradient(135deg, #E3F2FD 0%, #F3E5F5 100%)",
    border: "1.5px solid #5E35B1",
    borderRadius: "12px",
    padding: "12px 16px",
    boxShadow: "0 2px 8px rgba(94, 53, 177, 0.12)",
  },
  notificationHeader: {
    display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px",
  },
  notificationIcon: { fontSize: "16px" },
  notificationTitle: { fontSize: "12px", fontWeight: 700, color: "#3F51B5", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  notificationContent: { fontSize: "14px", color: "#2C2B1E", margin: "0", lineHeight: "1.5" },

  // ─── System message styles ─────────────────────────────────────────────────────
  systemCard: {
    background: "linear-gradient(135deg, #FCE4EC 0%, #FFF9C4 100%)",
    border: "1.5px solid #F57F17",
    borderRadius: "12px",
    padding: "12px 16px",
    boxShadow: "0 2px 8px rgba(245, 127, 23, 0.12)",
  },
  systemHeader: {
    display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px",
  },
  systemIcon: { fontSize: "16px" },
  systemTitle: { fontSize: "12px", fontWeight: 700, color: "#E65100", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  systemContent: { fontSize: "14px", color: "#2C2B1E", margin: "0", lineHeight: "1.5" },

  inputBar: { padding: "12px 20px 16px", background: "#F0EDE3", borderTop: "1px solid #D4C9A8", flexShrink: 0 },
  inputWrap: {
    display: "flex", gap: "10px", alignItems: "center", background: "#FFFFFF",
    border: "1.5px solid #C8BFA0", borderRadius: "24px", padding: "6px 8px 6px 18px", transition: "border-color 0.2s",
  },
  input: {
    flex: 1, border: "none", outline: "none", background: "transparent",
    fontSize: "14px", color: "#2C2B1E", fontFamily: "'Georgia', serif", lineHeight: "1.5", padding: "4px 0",
  },
  sendBtn: {
    width: "38px", height: "38px", borderRadius: "50%", border: "none",
    background: "#2D5A27", color: "#D4E8B0", display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
    transition: "background 0.15s, transform 0.1s",
  },
  inputHint: { fontSize: "11px", color: "#B0A88A", marginTop: "6px", textAlign: "center" as const, fontFamily: "system-ui, sans-serif" },
  
  // ─── Demo button styles (remove after testing) ────────────────────────────────
  demoBtn: {
    fontSize: "11px", padding: "6px 12px", borderRadius: "6px", border: "1px solid #C8BFA0",
    background: "#F7F4ED", color: "#6B7A5A", cursor: "pointer", fontFamily: "system-ui, sans-serif",
    transition: "background 0.15s",
  },
};