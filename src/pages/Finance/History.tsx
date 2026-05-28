import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;

// ─── Types ─────────────────────────────────────────────────────────────────────

type SplitMode = "contributed" | "solo";

interface Contributor {
  userId: string;
  name: string;
  amount: number;
}

interface HistoryEntry {
  id: string;               // expense_id — shared UUID across all contributor rows
  itemName: string;
  total: number;            // amtspent from ChatMessages — full purchase total
  unit: string;
  splitMode: SplitMode;     // "contributed" = multiple people | "solo" = one person
  contributors: Contributor[];
  paidBy: string;           // name of the person who created the purchase
  timestamp: string;
  isDeleted: boolean;       // true if amtrecovered is set on the chat message
  amtRecovered: number;     // amount recovered after deletion
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(raw: string) {
  const date = new Date(raw);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${timeStr}`;
  return `${date.toLocaleDateString([], { day: "2-digit", month: "short" })}, ${timeStr}`;
}

// Groups flat backend rows by expense_id into one HistoryEntry per purchase
function groupRowsByExpense(rows: any[]): HistoryEntry[] {
  const expenseMap = new Map<string, any[]>();

  rows.forEach((row) => {
    if (!expenseMap.has(row.expense_id)) expenseMap.set(row.expense_id, []);
    expenseMap.get(row.expense_id)!.push(row);
  });

  const entries: HistoryEntry[] = [];

  expenseMap.forEach((rowsForExpense, expenseId) => {
    const firstRow = rowsForExpense[0];
    console.log(firstRow);
    entries.push({
      id:           expenseId,
      itemName:     firstRow.item_name     || "—",
      total:        firstRow.amtspent      ?? 0,
      unit:         firstRow.unit          || "pcs",
      splitMode:    firstRow.is_solo       ? "solo" : "contributed",  // is_solo=False → contributed
      paidBy:       firstRow.sender_name   || "Unknown",
      timestamp:    firstRow.timestamp,
      isDeleted:    !!firstRow.amtrecovered,
      amtRecovered: firstRow.amtrecovered  ?? 0,
      contributors: rowsForExpense.map((row) => ({
        userId: row.user_id,
        name:   row.sender_name,
        amount: row.individual_amt,
      })),
    });
  });

  return entries;
}

// ─── Summary Bar ───────────────────────────────────────────────────────────────

function SummaryBar({ entries }: { entries: HistoryEntry[] }) {
  const activeEntries  = entries.filter((e) => !e.isDeleted);
  const groupTotal     = activeEntries.reduce((sum, e) => sum + e.total, 0);
  const sharedCount    = activeEntries.filter((e) => e.splitMode === "contributed").length;
  const soloCount      = activeEntries.filter((e) => e.splitMode === "solo").length;

  return (
    <div style={pageStyles.summaryCard}>
      <div style={pageStyles.summaryItem}>
        <span style={pageStyles.summaryLabel}>Group Total</span>
        <span style={pageStyles.summaryVal}>
          ₹{groupTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div style={pageStyles.summaryDivider} />
      <div style={pageStyles.summaryItem}>
        <span style={pageStyles.summaryLabel}>Shared</span>
        <span style={{ ...pageStyles.summaryVal, color: "#D4E8B0" }}>{sharedCount}</span>
      </div>
      <div style={pageStyles.summaryDivider} />
      <div style={pageStyles.summaryItem}>
        <span style={pageStyles.summaryLabel}>Solo</span>
        <span style={{ ...pageStyles.summaryVal, color: "#D4E8B0" }}>{soloCount}</span>
      </div>
    </div>
  );
}

// ─── History Card ──────────────────────────────────────────────────────────────

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const isContributed = entry.splitMode === "contributed" && entry.contributors.length > 1;

  return (
    <div style={{ ...cardStyles.card, ...(entry.isDeleted ? cardStyles.deletedCard : {}) }}>

      {/* Top row: timestamp + badges */}
      <div style={cardStyles.dateRow}>
        <span style={cardStyles.dateText}>{formatDateTime(entry.timestamp)}</span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={isContributed ? cardStyles.sharedBadge : cardStyles.soloBadge}>
            {isContributed ? "Shared" : "Solo"}
          </span>
          {entry.isDeleted && <span style={cardStyles.deletedBadge}>Deleted</span>}
        </div>
      </div>

      {/* Item name + unit */}
      <div style={cardStyles.metaRow}>
        <span style={cardStyles.metaLabel}>Item</span>
        <span style={cardStyles.metaValue}>
          {entry.itemName}
          <span style={cardStyles.unitChip}>{entry.unit}</span>
        </span>
      </div>

      {entry.isDeleted && (
        <div style={cardStyles.metaRow}>
          <span style={cardStyles.metaLabel}>Recovered</span>
          <span style={cardStyles.recoveredAmt}>₹{entry.amtRecovered.toFixed(2)}</span>
        </div>
      )}

      {/* Contributed purchase: show all contributors */}
      {isContributed ? (
        <>
          <div style={cardStyles.metaRow}>
            <span style={cardStyles.metaLabel}>Paid by</span>
            <span style={cardStyles.metaValue}>{entry.paidBy}</span>
          </div>

          <div style={cardStyles.divider} />
          <div style={cardStyles.sectionLabel}>Contributors</div>

          {entry.contributors.map((contributor) => (
            <div key={contributor.userId} style={cardStyles.splitRow}>
              <span style={cardStyles.splitName}>{contributor.name}</span>
              <span style={cardStyles.splitAmt}>₹{contributor.amount.toFixed(2)}</span>
            </div>
          ))}

          <div style={cardStyles.totalRow}>
            <span style={cardStyles.totalLabel}>Total spent</span>
            <span style={cardStyles.totalAmt}>₹{entry.total.toFixed(2)}</span>
          </div>
        </>
      ) : (
        /* Solo purchase*/
        <div style={cardStyles.soloRow}>
          <span style={cardStyles.metaLabel}>
            {entry.contributors[0]?.name ?? "Someone"} spent
          </span>
          <span style={cardStyles.soloAmt}>₹{entry.total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main History Page ─────────────────────────────────────────────────────────

type FilterType = "all" | "contributed" | "solo";

export default function History() {
  const [entries,  setEntries]  = useState<HistoryEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState<FilterType>("all");

  const userData = JSON.parse(localStorage.getItem("currentRoom") || "{}");
  const groupId  = userData.group_id || userData.Groupid;
  const token    = localStorage.getItem("access_token");

  const fetchHistory = async () => {
    
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${VITE_ROUTE_API_KEY}/finance/groupHistory/${groupId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        setError("Failed to load history.");
        setEntries([]);
        return;
      }

      const data = await res.json();
      
      const groupedEntries = groupRowsByExpense(data.history || []);

      groupedEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEntries(groupedEntries);

    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [groupId]);

  // Filter tabs: "all" shows everything, others filter by splitMode
  const filteredEntries = entries.filter((entry) =>
    filter === "all" || entry.splitMode === filter
  );

  return (
    <>
      <PageMeta title="Group History" description="All group expense history" />
      <PageBreadcrumb pageTitle="Group History" />

      <div style={pageStyles.container}>

        {/* Summary bar */}
        <SummaryBar entries={entries} />

        {/* Filter tabs + refresh button */}
        <div style={pageStyles.filterRow}>
          <div style={pageStyles.tabGroup}>
            {(["all", "contributed", "solo"] as FilterType[]).map((tabValue) => (
              <button
                key={tabValue}
                onClick={() => setFilter(tabValue)}
                style={{ ...pageStyles.tab, ...(filter === tabValue ? pageStyles.tabActive : {}) }}
              >
                {tabValue === "all" ? "All" : tabValue === "contributed" ? "Shared" : "Solo"}
              </button>
            ))}
          </div>
          <button onClick={fetchHistory} style={pageStyles.refreshBtn} title="Refresh">↻</button>
        </div>

        {/* Info note */}
        <p style={pageStyles.note}>
          All expenses added or removed by group members are recorded here.
        </p>

        {/* History list header */}
        <div style={pageStyles.historyHeader}>
          <span style={pageStyles.historyTitle}>Group history</span>
          <span style={pageStyles.historySub}>latest to oldest</span>
        </div>

        {/* Cards / states */}
        <div style={pageStyles.historyList}>

          {loading && (
            <div style={pageStyles.stateBox}>
              <span style={pageStyles.loadingDot} />
              <span style={pageStyles.stateText}>Loading history…</span>
            </div>
          )}

          {!loading && error && (
            <div style={{ ...pageStyles.stateBox, color: "#C0392B" }}>
              <span style={pageStyles.stateText}>{error}</span>
              <button onClick={fetchHistory} style={pageStyles.retryBtn}>Retry</button>
            </div>
          )}

          {!loading && !error && filteredEntries.length === 0 && (
            <div style={pageStyles.stateBox}>
              <span style={pageStyles.stateText}>No expenses found.</span>
            </div>
          )}

          {!loading && !error && filteredEntries.map((entry) => (
            <HistoryCard key={entry.id} entry={entry} />
          ))}

        </div>
      </div>
    </>
  );
}

// ─── Page Styles ───────────────────────────────────────────────────────────────
const pageStyles: Record<string, React.CSSProperties> = {
  container:      { display: "flex", flexDirection: "column", gap: "16px", maxWidth: "680px", margin: "0 auto", fontFamily: "'Georgia', 'Times New Roman', serif" },
  summaryCard:    { display: "flex", alignItems: "center", background: "linear-gradient(135deg, #2D5A27 0%, #3B7030 100%)", borderRadius: "16px", padding: "20px 28px", boxShadow: "0 4px 20px rgba(45, 90, 39, 0.22)" },
  summaryItem:    { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  summaryLabel:   { fontSize: "11px", color: "#8FC87A", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "system-ui" },
  summaryVal:     { fontSize: "20px", fontWeight: 700, color: "#D4E8B0", fontFamily: "'Courier New', monospace" },
  summaryDivider: { width: "1px", height: "40px", background: "rgba(212,232,176,0.2)", margin: "0 8px" },
  filterRow:      { display: "flex", alignItems: "center", justifyContent: "space-between" },
  tabGroup:       { display: "flex", gap: "6px" },
  tab:            { padding: "7px 16px", borderRadius: "20px", border: "1.5px solid #C8BFA0", background: "transparent", color: "#6B7A5A", fontSize: "12px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 500, transition: "all 0.15s" },
  tabActive:      { background: "#2D5A27", color: "#D4E8B0", border: "1.5px solid #2D5A27" },
  refreshBtn:     { width: "34px", height: "34px", borderRadius: "50%", border: "1.5px solid #C8BFA0", background: "transparent", color: "#6B7A5A", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  note:           { fontSize: "12px", color: "#8A7E65", background: "#F7F4ED", border: "1px solid #D4C9A8", borderRadius: "8px", padding: "10px 14px", margin: "0", fontFamily: "system-ui, sans-serif", lineHeight: "1.5" },
  historyHeader:  { display: "flex", alignItems: "baseline", gap: "10px", marginTop: "4px" },
  historyTitle:   { fontSize: "16px", fontWeight: 700, color: "#2C2B1E" },
  historySub:     { fontSize: "11px", color: "#8A7E65", fontFamily: "system-ui", fontStyle: "italic" },
  historyList:    { display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "24px" },
  stateBox:       { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", padding: "40px", background: "#F7F4ED", border: "1px solid #D4C9A8", borderRadius: "14px" },
  stateText:      { fontSize: "14px", color: "#8A7E65", fontFamily: "system-ui", fontStyle: "italic" },
  loadingDot:     { width: "10px", height: "10px", borderRadius: "50%", background: "#2D5A27", display: "inline-block", animation: "pulse 1s infinite" },
  retryBtn:       { padding: "7px 18px", background: "#2D5A27", color: "#D4E8B0", border: "none", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 600 },
};

// ─── Card Styles ───────────────────────────────────────────────────────────────
const cardStyles: Record<string, React.CSSProperties> = {
  card:          { background: "#FFFFFF", border: "1px solid #D4C9A8", borderRadius: "14px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "8px", boxShadow: "0 1px 6px rgba(45,60,30,0.06)" },
  deletedCard:   { opacity: 0.45, background: "#F5F2EC", textDecoration: "line-through" },
  dateRow:       { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" },
  dateText:      { fontSize: "11px", color: "#9E9580", fontFamily: "'Courier New', monospace", letterSpacing: "0.03em" },
  sharedBadge:   { fontSize: "10px", background: "#E8F5E9", color: "#2D5A27", border: "1px solid #A5D6A7", borderRadius: "20px", padding: "2px 8px", fontFamily: "system-ui", fontWeight: 600 },
  soloBadge:     { fontSize: "10px", background: "#F7F4ED", color: "#6B7A5A", border: "1px solid #C8BFA0", borderRadius: "20px", padding: "2px 8px", fontFamily: "system-ui", fontWeight: 600 },
  deletedBadge:  { fontSize: "10px", background: "#FDECEA", color: "#C0392B", border: "1px solid #E57373", borderRadius: "20px", padding: "2px 8px", fontFamily: "system-ui", fontWeight: 600 },
  metaRow:       { display: "flex", gap: "8px", alignItems: "center" },
  metaLabel:     { fontSize: "12px", color: "#8A7E65", fontFamily: "system-ui", minWidth: "60px" },
  metaValue:     { fontSize: "14px", color: "#2C2B1E", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" },
  sectionLabel:  { fontSize: "11px", color: "#8A7E65", fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" },
  unitChip:      { fontSize: "10px", color: "#6B7A5A", background: "#F0EDE3", border: "1px solid #D4C9A8", borderRadius: "4px", padding: "1px 6px", fontFamily: "system-ui" },
  recoveredAmt:  { fontSize: "14px", color: "#5C8A3A", fontWeight: 700, fontFamily: "'Courier New', monospace" },
  divider:       { height: "1px", background: "#EDE8DC", margin: "4px 0" },
  splitRow:      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" },
  splitName:     { fontSize: "13px", color: "#4A5E3A", fontFamily: "system-ui" },
  splitAmt:      { fontSize: "13px", color: "#2C2B1E", fontFamily: "'Courier New', monospace", fontWeight: 600 },
  totalRow:      { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1.5px solid #D4C9A8", paddingTop: "8px", marginTop: "4px" },
  totalLabel:    { fontSize: "12px", fontWeight: 700, color: "#5C4A1E", fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: "0.04em" },
  totalAmt:      { fontSize: "16px", fontWeight: 700, color: "#2D5A27", fontFamily: "'Courier New', monospace" },
  soloRow:       { display: "flex", justifyContent: "space-between", alignItems: "center" },
  soloAmt:       { fontSize: "16px", fontWeight: 700, color: "#2D5A27", fontFamily: "'Courier New', monospace" },
};