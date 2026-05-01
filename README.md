# Group-Expense-Tracker

**Intro**
This Group expense tracker is used to keep track of how much money you/others spend on in group events, which is shared by group members. It supports real-time balance calculation, debt settlement, and in-group communication.

**What problem does it actually solve ?**
- When people go and hangout with friends, family or let it be business trip, sometimes the user needs to keep track of expenses when the event has ended. Manual tracking is tedious and error-prone. This tool keeps a live track of expenses by adding events, calculates who owes whom, and gives you a summary of expenses from its history.
- Tracks partial and full payments, minimizes settlement transactions, and allows groups to dissolve after all debts are settled.

**Features:**
- Add, update, delete expenses with timestamps
- Group management (create, update, dissolve groups; add/remove members)
- Real-time balance calculation showing who owes whom
- Debt simplification algorithm that minimizes payment transactions
- Settlement interface (pay in full or partial amounts, track payment history)
- Settlement suggestions (e.g., "Alice pays Bob Rs50")
- In-group chat for real-time communication
- Comments/notes on individual expenses
- Expense history and analytics by category/member
- Email reminders for pending settlements
- CSV export for expense data
- Account-based authentication for secure, multi-user access
- Mobile and desktop responsive design

**Future Features (Phase 2 & 3):**
- Receipt scanning with OCR (auto-detect items, amounts)
- Multi-currency support with real-time conversion
- Payment method integration (Razorpay/UPI for India)
- Bank integration (open banking APIs, if legal & feasible)
- Mobile and desktop web app.
- Group Savings feature (shared financial goals, contribution tracking)
- Advanced analytics and budgeting insights

**Tech Stack:**
- **Frontend:** React, Tailwind CSS, Material-UI, Vite
- **Backend:** Python (FastAPI), PostgreSQL, SQLAlchemy
- **Real-time:** WebSocket for chat
- **Hosting:** Vercel (frontend), Railway/Render (backend)
- **UI Template:** TailAdmin React (SaaS variant)

**Development Approach:**
Build a fully functional MVP first (Phase 1). Once stable and tested, incrementally add advanced features (Phase 2 & 3) based on user feedback and market validation.