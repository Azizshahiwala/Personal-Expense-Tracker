import { useState, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

// ─── Types ─────────────────────────────────────────────────────────────────────
type SplitMode = "contributed" | "solo";

interface Contributor {
  userId: string;
  name: string;
  amount: string;
}

interface ExpenseEntry {
  id: string;
  itemName: string;
  total: number;
  unit: string;
  splitMode: SplitMode;
  isSplit: boolean;
  contributors: Contributor[];
  paidBy: string;
  timestamp: Date;
  removed?: boolean;
}

const UNIT_OPTIONS = ["kg", "g", "L", "ml", "pcs", "pack", "dozen", "box", "other"];

const GROUP_MEMBERS = [
  { userId: "u2", name: "User A" },
  { userId: "u3", name: "User B" },
  { userId: "u4", name: "User C" },
  { userId: "u5", name: "User D" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDateTime(date: Date) {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${timeStr}`;
  return `${date.toLocaleDateString([], { day: "2-digit", month: "short" })}, ${timeStr}`;
}

// ─── Add Expense Modal ─────────────────────────────────────────────────────────
function AddExpenseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (e: ExpenseEntry) => void }) {
  const [splitMode, setSplitMode] = useState<SplitMode | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([
    { userId: "me", name: "You", amount: "" },
  ]);
  const [selectedMember, setSelectedMember] = useState("");
  const [itemName, setItemName] = useState("");
  const [total, setTotal] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [isSplit, setIsSplit] = useState<boolean | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const addContributor = () => {
    if (!selectedMember) return;
    const member = GROUP_MEMBERS.find((m) => m.userId === selectedMember);
    if (!member) return;
    if (contributors.find((c) => c.userId === member.userId)) return;
    setContributors([...contributors, { userId: member.userId, name: member.name, amount: "" }]);
    setSelectedMember("");
  };

  const removeContributor = (userId: string) => {
    if (userId === "me") return;
    setContributors(contributors.filter((c) => c.userId !== userId));
  };

  const updateAmount = (userId: string, value: string) => {
    setContributors(contributors.map((c) => (c.userId === userId ? { ...c, amount: value } : c)));
  };

  const handleSubmit = () => {
    if (!itemName || !total || splitMode === null) return;
    const entry: ExpenseEntry = {
      id: Date.now().toString(),
      itemName,
      total: parseFloat(total),
      unit,
      splitMode: splitMode!,
      isSplit: splitMode === "contributed" ? true : (isSplit ?? false),
      contributors: splitMode === "contributed" ? contributors : [],
      paidBy: "You",
      timestamp: new Date(),
    };
    onAdd(entry);
    onClose();
  };

  return (
    <div style={mStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={mStyles.modal}>
        {/* Header */}
        <div style={mStyles.mHeader}>
          <span style={mStyles.mTitle}>Add Expense</span>
          <button onClick={onClose} style={mStyles.closeBtn}>✕</button>
        </div>

        <div style={mStyles.mBody}>
          {/* Q1: Contributed by others? */}
          <div style={mStyles.questionBox}>
            <p style={mStyles.question}>Is this purchase contributed by others?</p>
            <div style={mStyles.radioRow}>
              <label style={mStyles.radioLabel}>
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === "contributed"}
                  onChange={() => setSplitMode("contributed")}
                  style={mStyles.radio}
                />
                <span>Yes</span>
              </label>
              <label style={mStyles.radioLabel}>
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === "solo"}
                  onChange={() => setSplitMode("solo")}
                  style={mStyles.radio}
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {/* ── If YES ── */}
          {splitMode === "contributed" && (
            <div style={mStyles.section}>
              {/* Add users dropdown */}
              <div style={mStyles.fieldRow}>
                <label style={mStyles.label}>Add users</label>
                <div style={mStyles.dropRow}>
                  <select
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    style={mStyles.select}
                  >
                    <option value="">Select member…</option>
                    {GROUP_MEMBERS.filter(
                      (m) => !contributors.find((c) => c.userId === m.userId)
                    ).map((m) => (
                      <option key={m.userId} value={m.userId}>{m.name}</option>
                    ))}
                  </select>
                  <button onClick={addContributor} style={mStyles.addBtn}>Add</button>
                </div>
              </div>

              {/* Contributors table */}
              <div style={mStyles.contribTable}>
                <div style={mStyles.contribHeaderRow}>
                  <span style={mStyles.contribColName}>Member</span>
                  <span style={mStyles.contribColAmt}>Amount (₹)</span>
                  <span style={mStyles.contribColDel}></span>
                </div>
                {contributors.map((c) => (
                  <div key={c.userId} style={mStyles.contribRow}>
                    <span style={mStyles.contribName}>
                      {c.name}
                      {c.userId === "me" && (
                        <span style={mStyles.defaultTag}>by default</span>
                      )}
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={c.amount}
                      onChange={(e) => updateAmount(c.userId, e.target.value)}
                      style={mStyles.amtInput}
                    />
                    {c.userId !== "me" && (
                      <button
                        onClick={() => removeContributor(c.userId)}
                        style={mStyles.removeContrib}
                      >×</button>
                    )}
                    {c.userId === "me" && <span style={{ width: "22px" }} />}
                  </div>
                ))}
              </div>

              {/* Item name + Unit */}
              <div style={mStyles.fieldRow}>
                <label style={mStyles.label}>Name of item purchased</label>
                <div style={mStyles.dropRow}>
                  <input
                    type="text"
                    placeholder="e.g. Groceries, Lunch…"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    style={{ ...mStyles.textInput, flex: 1 }}
                  />
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...mStyles.select, width: "80px" }}>
                    {UNIT_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Total */}
              <div style={mStyles.fieldRow}>
                <label style={mStyles.label}>Total (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  style={mStyles.textInput}
                />
              </div>

              {/* Upload */}
              <div style={mStyles.fieldRow}>
                <button onClick={() => fileRef.current?.click()} style={mStyles.uploadBtn}>
                  📎 {fileName || "Upload Receipt"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                />
              </div>
            </div>
          )}

          {/* ── If NO ── */}
          {splitMode === "solo" && (
            <div style={mStyles.section}>
              <div style={mStyles.fieldRow}>
                <label style={mStyles.label}>Name of item purchased</label>
                <input
                  type="text"
                  placeholder="e.g. Coffee, Fuel…"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  style={mStyles.textInput}
                />
              </div>

              <div style={mStyles.fieldRow}>
                <label style={mStyles.label}>Total (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  style={mStyles.textInput}
                />
              </div>

              <div style={mStyles.questionBox}>
                <p style={mStyles.question}>Is this expense supposed to be split?</p>
                <div style={mStyles.radioRow}>
                  <label style={mStyles.radioLabel}>
                    <input
                      type="radio"
                      name="isSplit"
                      checked={isSplit === true}
                      onChange={() => setIsSplit(true)}
                      style={mStyles.radio}
                    />
                    <span>Yes</span>
                  </label>
                  <label style={mStyles.radioLabel}>
                    <input
                      type="radio"
                      name="isSplit"
                      checked={isSplit === false}
                      onChange={() => setIsSplit(false)}
                      style={mStyles.radio}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div style={mStyles.fieldRow}>
                <button onClick={() => fileRef.current?.click()} style={mStyles.uploadBtn}>
                  📎 {fileName || "Upload Receipt"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {splitMode !== null && (
          <div style={mStyles.mFooter}>
            <button onClick={onClose} style={mStyles.cancelBtn}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!itemName || !total}
              style={{
                ...mStyles.submitBtn,
                opacity: !itemName || !total ? 0.45 : 1,
                cursor: !itemName || !total ? "not-allowed" : "pointer",
              }}
            >
              Add Expense
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Remove Expense Modal ──────────────────────────────────────────────────────
function RemoveExpenseModal({
  expenses,
  onClose,
  onRemove,
}: {
  expenses: ExpenseEntry[];
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  const active = expenses.filter((e) => !e.removed);

  return (
    <div style={mStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...mStyles.modal, maxWidth: "420px" }}>
        <div style={mStyles.mHeader}>
          <span style={mStyles.mTitle}>Remove Expense</span>
          <button onClick={onClose} style={mStyles.closeBtn}>✕</button>
        </div>
        <div style={{ ...mStyles.mBody, gap: "10px" }}>
          {active.length === 0 && (
            <p style={{ color: "#8A7E65", textAlign: "center", padding: "24px 0", fontFamily: "system-ui" }}>
              No expenses to remove.
            </p>
          )}
          {active.map((e) => (
            <div key={e.id} style={mStyles.removeItem}>
              <div>
                <div style={mStyles.removeItemName}>{e.itemName}</div>
                <div style={mStyles.removeItemMeta}>
                  ₹{e.total.toFixed(2)} · {formatDateTime(e.timestamp)}
                </div>
              </div>
              <button
                onClick={() => { onRemove(e.id); onClose(); }}
                style={mStyles.removeItemBtn}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Expense History Card ──────────────────────────────────────────────────────
function ExpenseCard({ entry }: { entry: ExpenseEntry }) {
  const isContrib = entry.splitMode === "contributed" && entry.contributors.length > 1;

  return (
    <div style={{
      ...cardStyles.card,
      ...(entry.removed ? cardStyles.removedCard : {}),
    }}>
      {/* Date header */}
      <div style={cardStyles.dateRow}>
        <span style={cardStyles.dateText}>{formatDateTime(entry.timestamp)}</span>
        {entry.removed && <span style={cardStyles.removedBadge}>Deleted</span>}
      </div>

      {isContrib ? (
        <>
          <div style={cardStyles.metaRow}>
            <span style={cardStyles.metaLabel}>Paid by</span>
            <span style={cardStyles.metaValue}>{entry.paidBy}</span>
          </div>
          <div style={cardStyles.metaRow}>
            <span style={cardStyles.metaLabel}>Item</span>
            <span style={cardStyles.metaValue}>{entry.itemName} ({entry.unit})</span>
          </div>
          <div style={cardStyles.divider} />
          <div style={cardStyles.metaLabel2}>Contributed by / Split to:</div>
          {entry.contributors.map((c) => (
            <div key={c.userId} style={cardStyles.splitRow}>
              <span style={cardStyles.splitName}>{c.name}</span>
              <span style={cardStyles.splitAmt}>
                {c.amount ? `₹${parseFloat(c.amount).toFixed(2)}` : "—"}
              </span>
            </div>
          ))}
          <div style={cardStyles.totalRow}>
            <span style={cardStyles.totalLabel}>Total spent</span>
            <span style={cardStyles.totalAmt}>₹{entry.total.toFixed(2)}</span>
          </div>
        </>
      ) : (
        <>
          <div style={cardStyles.metaRow}>
            <span style={cardStyles.metaLabel}>Item</span>
            <span style={cardStyles.metaValue}>{entry.itemName}</span>
          </div>
          <div style={cardStyles.soloRow}>
            <span style={cardStyles.metaLabel}>You spent</span>
            <span style={cardStyles.soloAmt}>₹{entry.total.toFixed(2)}</span>
          </div>
          {entry.isSplit && (
            <div style={cardStyles.splitNote}>⚡ Marked for group split</div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Expenses Page ────────────────────────────────────────────────────────
const MOCK_BUDGET = 5000;

export default function Expenses() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([
    {
      id: "demo1",
      itemName: "Lunch at Zomato",
      total: 290,
      unit: "pcs",
      splitMode: "contributed",
      isSplit: true,
      contributors: [
        { userId: "me", name: "You", amount: "100" },
        { userId: "u2", name: "User A", amount: "100" },
        { userId: "u3", name: "User B", amount: "90" },
      ],
      paidBy: "You",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "demo2",
      itemName: "Coffee",
      total: 120,
      unit: "pcs",
      splitMode: "solo",
      isSplit: false,
      contributors: [],
      paidBy: "You",
      timestamp: new Date(Date.now() - 7200000),
    },
  ]);

  const [showAdd, setShowAdd] = useState(false);
  const [showRemove, setShowRemove] = useState(false);

  const totalSpent = expenses
    .filter((e) => !e.removed)
    .reduce((sum, e) => sum + e.total, 0);

  const handleAdd = (entry: ExpenseEntry) => {
    setExpenses((prev) => [entry, ...prev]);
  };

  const handleRemove = (id: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, removed: true } : e))
    );
  };

  return (
    <>
      <PageMeta title="Expenses" description="Track and manage group expenses" />
      <PageBreadcrumb pageTitle="Manage Expenses" />

      <div style={pageStyles.container}>
        {/* ── Budget Header ── */}
        <div style={pageStyles.budgetCard}>
          <div style={pageStyles.budgetItem}>
            <span style={pageStyles.budgetLabel}>Your budget</span>
            <span style={pageStyles.budgetVal}>₹{MOCK_BUDGET.toLocaleString()}</span>
          </div>
          <div style={pageStyles.budgetDivider} />
          <div style={pageStyles.budgetItem}>
            <span style={pageStyles.budgetLabel}>You spent</span>
            <span style={{
              ...pageStyles.budgetVal,
              color: totalSpent > MOCK_BUDGET ? "#C0392B" : "#2D5A27",
            }}>
              ₹{totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={pageStyles.budgetDivider} />
          <div style={pageStyles.budgetItem}>
            <span style={pageStyles.budgetLabel}>Remaining</span>
            <span style={{
              ...pageStyles.budgetVal,
              color: MOCK_BUDGET - totalSpent < 0 ? "#C0392B" : "#5C8A3A",
            }}>
              ₹{(MOCK_BUDGET - totalSpent).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div style={pageStyles.actionRow}>
          <button onClick={() => setShowAdd(true)} style={pageStyles.addExpBtn}>
            <span style={pageStyles.btnIcon}>＋</span> Add Expense
          </button>
          <button onClick={() => setShowRemove(true)} style={pageStyles.removeExpBtn}>
            <span style={pageStyles.btnIcon}>－</span> Remove Expense
          </button>
        </div>

        {/* ── Note ── */}
        <p style={pageStyles.note}>
          📋 Note: Adding or removing an expense is recorded and notified to all group members.
        </p>

        {/* ── History ── */}
        <div style={pageStyles.historyHeader}>
          <span style={pageStyles.historyTitle}>Your history</span>
          <span style={pageStyles.historySub}>sorted latest to oldest</span>
        </div>

        <div style={pageStyles.historyList}>
          {expenses.length === 0 && (
            <div style={pageStyles.emptyState}>
              No expenses yet. Add your first one!
            </div>
          )}
          {expenses.map((e) => (
            <ExpenseCard key={e.id} entry={e} />
          ))}
        </div>
      </div>

      {showAdd && (
        <AddExpenseModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />
      )}
      {showRemove && (
        <RemoveExpenseModal
          expenses={expenses}
          onClose={() => setShowRemove(false)}
          onRemove={handleRemove}
        />
      )}
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const pageStyles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex", flexDirection: "column", gap: "16px",
    maxWidth: "680px", margin: "0 auto",
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  budgetCard: {
    display: "flex", alignItems: "center",
    background: "linear-gradient(135deg, #2D5A27 0%, #3B7030 100%)",
    borderRadius: "16px", padding: "20px 28px",
    boxShadow: "0 4px 20px rgba(45, 90, 39, 0.22)",
    gap: "0",
  },
  budgetItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  budgetLabel: { fontSize: "11px", color: "#8FC87A", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "system-ui" },
  budgetVal: { fontSize: "20px", fontWeight: 700, color: "#D4E8B0", fontFamily: "'Courier New', monospace" },
  budgetDivider: { width: "1px", height: "40px", background: "rgba(212,232,176,0.2)", margin: "0 8px" },

  actionRow: { display: "flex", gap: "12px" },
  addExpBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    background: "#2D5A27", color: "#D4E8B0",
    border: "none", borderRadius: "12px", padding: "14px 20px",
    fontSize: "14px", fontWeight: 600, cursor: "pointer",
    fontFamily: "'Georgia', serif",
    boxShadow: "0 2px 10px rgba(45,90,39,0.2)",
    transition: "background 0.15s, transform 0.1s",
  },
  removeExpBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    background: "#FFFFFF", color: "#C0392B",
    border: "1.5px solid #C0392B", borderRadius: "12px", padding: "14px 20px",
    fontSize: "14px", fontWeight: 600, cursor: "pointer",
    fontFamily: "'Georgia', serif",
    transition: "background 0.15s",
  },
  btnIcon: { fontSize: "18px", lineHeight: 1 },

  note: {
    fontSize: "12px", color: "#8A7E65", background: "#F7F4ED",
    border: "1px solid #D4C9A8", borderRadius: "8px",
    padding: "10px 14px", margin: "0",
    fontFamily: "system-ui, sans-serif", lineHeight: "1.5",
  },

  historyHeader: { display: "flex", alignItems: "baseline", gap: "10px", marginTop: "4px" },
  historyTitle: { fontSize: "16px", fontWeight: 700, color: "#2C2B1E" },
  historySub: { fontSize: "11px", color: "#8A7E65", fontFamily: "system-ui", fontStyle: "italic" },

  historyList: { display: "flex", flexDirection: "column", gap: "12px" },
  emptyState: {
    textAlign: "center", color: "#8A7E65", padding: "40px",
    fontSize: "14px", fontFamily: "system-ui", fontStyle: "italic",
  },
};

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    background: "#FFFFFF", border: "1px solid #D4C9A8",
    borderRadius: "14px", padding: "16px 20px",
    display: "flex", flexDirection: "column", gap: "8px",
    boxShadow: "0 1px 6px rgba(45,60,30,0.06)",
    transition: "opacity 0.3s",
  },
  removedCard: {
    opacity: 0.45,
    background: "#F5F2EC",
    textDecoration: "line-through",
  },
  dateRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" },
  dateText: { fontSize: "11px", color: "#9E9580", fontFamily: "'Courier New', monospace", letterSpacing: "0.03em" },
  removedBadge: {
    fontSize: "10px", background: "#FDECEA", color: "#C0392B",
    border: "1px solid #E57373", borderRadius: "20px",
    padding: "2px 8px", fontFamily: "system-ui", fontWeight: 600,
  },
  metaRow: { display: "flex", gap: "8px", alignItems: "center" },
  metaLabel: { fontSize: "12px", color: "#8A7E65", fontFamily: "system-ui", minWidth: "60px" },
  metaLabel2: { fontSize: "11px", color: "#8A7E65", fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" },
  metaValue: { fontSize: "14px", color: "#2C2B1E", fontWeight: 500 },
  divider: { height: "1px", background: "#EDE8DC", margin: "4px 0" },
  splitRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" },
  splitName: { fontSize: "13px", color: "#4A5E3A", fontFamily: "system-ui" },
  splitAmt: { fontSize: "13px", color: "#2C2B1E", fontFamily: "'Courier New', monospace", fontWeight: 600 },
  totalRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    borderTop: "1.5px solid #D4C9A8", paddingTop: "8px", marginTop: "4px",
  },
  totalLabel: { fontSize: "12px", fontWeight: 700, color: "#5C4A1E", fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: "0.04em" },
  totalAmt: { fontSize: "16px", fontWeight: 700, color: "#2D5A27", fontFamily: "'Courier New', monospace" },
  soloRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  soloAmt: { fontSize: "16px", fontWeight: 700, color: "#2D5A27", fontFamily: "'Courier New', monospace" },
  splitNote: { fontSize: "11px", color: "#5C8A3A", fontFamily: "system-ui", fontStyle: "italic", marginTop: "2px" },
};

const mStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(28,35,22,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: "20px",
    backdropFilter: "blur(3px)",
  },
  modal: {
    background: "linear-gradient(160deg, #F7F4ED 0%, #EFF0E8 100%)",
    border: "1px solid #D4C9A8", borderRadius: "20px",
    width: "100%", maxWidth: "500px",
    maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 16px 48px rgba(28,35,22,0.22)",
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  mHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 24px 14px",
    borderBottom: "1px solid #D4C9A8",
    position: "sticky", top: 0,
    background: "linear-gradient(160deg, #F7F4ED 0%, #EFF0E8 100%)",
    borderRadius: "20px 20px 0 0",
    zIndex: 1,
  },
  mTitle: { fontSize: "16px", fontWeight: 700, color: "#2C2B1E", letterSpacing: "0.02em" },
  closeBtn: {
    width: "30px", height: "30px", borderRadius: "50%", border: "1px solid #C8BFA0",
    background: "transparent", color: "#6B7A5A", cursor: "pointer", fontSize: "14px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  mBody: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" },
  mFooter: {
    display: "flex", gap: "10px", padding: "16px 24px",
    borderTop: "1px solid #D4C9A8",
    position: "sticky", bottom: 0,
    background: "linear-gradient(160deg, #F7F4ED 0%, #EFF0E8 100%)",
    borderRadius: "0 0 20px 20px",
  },
  questionBox: {
    background: "#FFFFFF", border: "1px solid #D4C9A8", borderRadius: "12px",
    padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px",
  },
  question: { margin: 0, fontSize: "14px", color: "#2C2B1E", lineHeight: "1.4" },
  radioRow: { display: "flex", gap: "24px" },
  radioLabel: {
    display: "flex", alignItems: "center", gap: "8px",
    fontSize: "14px", color: "#2C2B1E", cursor: "pointer",
    fontFamily: "system-ui",
  },
  radio: { accentColor: "#2D5A27", width: "16px", height: "16px", cursor: "pointer" },
  section: { display: "flex", flexDirection: "column", gap: "14px" },
  fieldRow: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "12px", color: "#6B7A5A", fontFamily: "system-ui", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  dropRow: { display: "flex", gap: "8px", alignItems: "center" },
  select: {
    flex: 1, padding: "9px 12px", border: "1.5px solid #C8BFA0", borderRadius: "8px",
    background: "#FFFFFF", fontSize: "13px", color: "#2C2B1E",
    fontFamily: "system-ui", outline: "none", cursor: "pointer",
  },
  textInput: {
    width: "100%", padding: "9px 12px", border: "1.5px solid #C8BFA0", borderRadius: "8px",
    background: "#FFFFFF", fontSize: "13px", color: "#2C2B1E",
    fontFamily: "system-ui", outline: "none", boxSizing: "border-box",
  },
  addBtn: {
    padding: "9px 16px", background: "#2D5A27", color: "#D4E8B0",
    border: "none", borderRadius: "8px", fontSize: "13px",
    cursor: "pointer", fontFamily: "system-ui", fontWeight: 600, whiteSpace: "nowrap",
  },
  contribTable: {
    background: "#FFFFFF", border: "1px solid #D4C9A8", borderRadius: "10px",
    overflow: "hidden",
  },
  contribHeaderRow: {
    display: "flex", padding: "8px 12px",
    background: "#F0EDE3", borderBottom: "1px solid #E0D9C5",
    fontSize: "11px", color: "#6B7A5A", fontFamily: "system-ui",
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  contribRow: {
    display: "flex", alignItems: "center", padding: "8px 12px",
    borderBottom: "1px solid #F0EDE3", gap: "8px",
  },
  contribColName: { flex: 1 },
  contribColAmt: { width: "110px" },
  contribColDel: { width: "22px" },
  contribName: { flex: 1, fontSize: "13px", color: "#2C2B1E", fontFamily: "system-ui", display: "flex", alignItems: "center", gap: "6px" },
  defaultTag: {
    fontSize: "10px", color: "#5C8A3A", background: "#E8F5E9",
    border: "1px solid #A5D6A7", borderRadius: "20px", padding: "1px 7px",
    fontStyle: "italic",
  },
  amtInput: {
    width: "100px", padding: "6px 10px", border: "1.5px solid #C8BFA0", borderRadius: "6px",
    background: "#F7F4ED", fontSize: "13px", color: "#2C2B1E",
    fontFamily: "'Courier New', monospace", outline: "none", textAlign: "right",
  },
  removeContrib: {
    width: "22px", height: "22px", borderRadius: "50%", border: "1px solid #E0D9C5",
    background: "transparent", color: "#C0392B", cursor: "pointer",
    fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0,
  },
  uploadBtn: {
    padding: "9px 16px", background: "#F7F4ED", color: "#6B7A5A",
    border: "1.5px dashed #C8BFA0", borderRadius: "8px", fontSize: "13px",
    cursor: "pointer", fontFamily: "system-ui", width: "100%", textAlign: "left",
  },
  cancelBtn: {
    flex: 1, padding: "12px", background: "transparent", color: "#6B7A5A",
    border: "1.5px solid #C8BFA0", borderRadius: "10px", fontSize: "14px",
    cursor: "pointer", fontFamily: "'Georgia', serif",
  },
  submitBtn: {
    flex: 2, padding: "12px", background: "#2D5A27", color: "#D4E8B0",
    border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
    fontFamily: "'Georgia', serif",
  },
  removeItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#FFFFFF", border: "1px solid #D4C9A8", borderRadius: "10px",
    padding: "12px 16px", gap: "12px",
  },
  removeItemName: { fontSize: "14px", color: "#2C2B1E", fontWeight: 500 },
  removeItemMeta: { fontSize: "11px", color: "#9E9580", marginTop: "2px", fontFamily: "'Courier New', monospace" },
  removeItemBtn: {
    padding: "7px 14px", background: "#FDECEA", color: "#C0392B",
    border: "1px solid #E57373", borderRadius: "8px", fontSize: "12px",
    cursor: "pointer", fontFamily: "system-ui", fontWeight: 600, whiteSpace: "nowrap",
  },
};