# TailAdmin React Template - Complete Structure Guide

## 📊 TOTAL FILES IN SRC

**Total React/TypeScript Files:** 97 files
**Total Size:** 944 KB

---

## 🗂️ FOLDER STRUCTURE BREAKDOWN

```
src/ (944 KB)
├── pages/                 (9 folders, 18 files)     ← ADD YOUR PAGES HERE
├── components/            (11 folders, 64 files)    ← REUSABLE COMPONENTS
├── layout/                (5 files)                 ← APP LAYOUT (don't touch)
├── context/               (2 files)                 ← STATE MANAGEMENT
├── hooks/                 (2 files)                 ← CUSTOM HOOKS
├── icons/                 (60+ SVG files)           ← ICON ASSETS
├── App.tsx               (routing setup)
├── main.tsx              (entry point)
├── index.css             (global styles)
└── vite-env.d.ts & svg.d.ts  (type definitions)
```

---

## 📍 FILE COUNT BY FOLDER

| Folder | Files | Purpose | Edit? |
|--------|-------|---------|-------|
| `pages/` | 18 | Full-page views (Dashboard, Forms, Charts, etc.) | ✅ YES - Add your pages |
| `components/ui/` | 8 | Basic UI (Button, Badge, Alert, Modal, etc.) | ❌ NO - Already built |
| `components/form/` | 15 | Form inputs (Text, Select, Checkbox, Date, etc.) | ❌ NO - Already built |
| `components/auth/` | 2 | Login/Sign up forms | ❌ NO - Keep as-is |
| `components/header/` | 3 | Top navbar components | ⚠️ MAYBE - Customize menu |
| `components/common/` | 8 | Reusable utilities (Breadcrumb, PageMeta, etc.) | ❌ NO - Already built |
| `components/charts/` | 2 | Chart components | ⚠️ MAYBE - For analytics |
| `components/tables/` | 2 | Table component | ✅ YES - Use for expenses |
| `components/ecommerce/` | 8 | E-commerce specific (NOT NEEDED) | ❌ DELETE |
| `components/UserProfile/` | 3 | User profile cards | ✅ YES - Adapt for members |
| `layout/` | 5 | Main layout structure | ❌ NO - Don't touch |
| `hooks/` | 2 | Custom hooks (useGoBack, useModal) | ✅ YES - Add your hooks |
| `context/` | 2 | Theme & Sidebar context | ✅ YES - Add auth context |
| `icons/` | 60+ | SVG icons | ✅ YES - Add custom icons |

---

## 🧩 COMPONENTS EXPLAINED - HOW THEY WORK

### Level 1: BASIC UI COMPONENTS (Reusable, Atomic)

These are the smallest building blocks. **Never modify these.**

#### 📌 Button Component
**Location:** `src/components/ui/button/Button.tsx`

```typescript
// How to use:
import { Button } from '@/components/ui/button/Button';

export function MyComponent() {
  return (
    <Button 
      size="md"           // sm, md, lg
      variant="primary"   // primary, secondary, outline
      onClick={() => alert('clicked')}
    >
      Click Me
    </Button>
  );
}
```

**Props Available:**
- `size`: "sm" | "md" | "lg"
- `variant`: "primary" | "secondary" | "outline" | "danger"
- `disabled`: true | false
- `className`: for custom styling

---

#### 📌 Badge Component
**Location:** `src/components/ui/badge/Badge.tsx`

```typescript
import Badge from '@/components/ui/badge/Badge';

<Badge color="success">Paid</Badge>
<Badge color="warning">Pending</Badge>
<Badge color="danger">Failed</Badge>
```

**Used for:** Status tags, category labels, expense tags

---

#### 📌 Alert Component
**Location:** `src/components/ui/alert/Alert.tsx`

```typescript
import { Alert } from '@/components/ui/alert/Alert';

<Alert type="success">Payment successful!</Alert>
<Alert type="error">Something went wrong</Alert>
<Alert type="warning">Are you sure?</Alert>
```

---

#### 📌 Modal Component
**Location:** `src/components/ui/modal/index.tsx`

```typescript
import Modal from '@/components/ui/modal';
import { useModal } from '@/hooks/useModal';

export function MyComponent() {
  const { isOpen, open, close } = useModal();
  
  return (
    <>
      <button onClick={open}>Open Modal</button>
      
      <Modal isOpen={isOpen} onClose={close} title="Confirm Delete">
        <p>Are you sure?</p>
        <button onClick={close}>Cancel</button>
        <button onClick={handleDelete}>Delete</button>
      </Modal>
    </>
  );
}
```

---

#### 📌 Avatar Component
**Location:** `src/components/ui/avatar/Avatar.tsx`

```typescript
import Avatar from '@/components/ui/avatar/Avatar';

<Avatar 
  src="/path/to/image.jpg" 
  initials="AB"    // Fallback if no image
  size="md"        // sm, md, lg
/>
```

**Used for:** User profiles, group member display

---

#### 📌 Table Component
**Location:** `src/components/ui/table/index.tsx`

```typescript
import { Table } from '@/components/ui/table';

<Table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Description</th>
      <th>Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>2024-05-01</td>
      <td>Lunch</td>
      <td>₹500</td>
    </tr>
  </tbody>
</Table>
```

---

### Level 2: FORM COMPONENTS

**Location:** `src/components/form/`

These handle user input. Use them in your custom pages.

#### 📌 TextInput (InputField)
**Location:** `src/components/form/input/InputField.tsx`

```typescript
import InputField from '@/components/form/input/InputField';

<InputField
  label="Expense Amount"
  type="number"
  placeholder="Enter amount"
  onChange={(e) => setAmount(e.target.value)}
  value={amount}
/>
```

---

#### 📌 TextArea
**Location:** `src/components/form/input/TextArea.tsx`

```typescript
import TextArea from '@/components/form/input/TextArea';

<TextArea
  label="Notes"
  placeholder="Add notes..."
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
/>
```

---

#### 📌 Select (Dropdown)
**Location:** `src/components/form/Select.tsx`

```typescript
import Select from '@/components/form/Select';

<Select
  label="Group"
  options={[
    { value: '1', label: 'Friends Trip' },
    { value: '2', label: 'Roommates' },
  ]}
  onChange={(e) => setGroup(e.target.value)}
/>
```

---

#### 📌 Checkbox
**Location:** `src/components/form/input/Checkbox.tsx`

```typescript
import Checkbox from '@/components/form/input/Checkbox';

<Checkbox
  label="Include Raj"
  checked={includeRaj}
  onChange={(e) => setIncludeRaj(e.target.checked)}
/>
```

---

#### 📌 Radio Button
**Location:** `src/components/form/input/Radio.tsx`

```typescript
import Radio from '@/components/form/input/Radio';

<Radio
  label="Equal Split"
  name="splitType"
  value="equal"
  checked={splitType === 'equal'}
  onChange={(e) => setSplitType(e.target.value)}
/>
```

---

#### 📌 DatePicker
**Location:** `src/components/form/date-picker.tsx`

```typescript
import DatePicker from '@/components/form/date-picker';

<DatePicker
  label="Expense Date"
  value={date}
  onChange={setDate}
/>
```

---

### Level 3: COMMON COMPONENTS (Utilities)

**Location:** `src/components/common/`

Used across multiple pages.

#### 📌 PageMeta
**Location:** `src/components/common/PageMeta.tsx`

Sets page title & description (for browser tab, SEO)

```typescript
import PageMeta from '@/components/common/PageMeta';

export function MyPage() {
  return (
    <>
      <PageMeta title="Add Expense" description="Create new expense entry" />
      {/* Page content */}
    </>
  );
}
```

---

#### 📌 PageBreadcrumb
**Location:** `src/components/common/PageBreadCrumb.tsx`

Navigation breadcrumbs

```typescript
import PageBreadCrumb from '@/components/common/PageBreadCrumb';

<PageBreadCrumb pageName="Add Expense" />
// Shows: Home > Add Expense
```

---

#### 📌 ThemeToggleButton
**Location:** `src/components/common/ThemeToggleButton.tsx`

Dark/light mode toggle (already in header)

---

### Level 4: LAYOUT COMPONENTS (App Structure)

**Location:** `src/layout/`

**Don't modify these.** They provide the overall structure.

- `AppLayout.tsx` - Main layout wrapper
- `AppHeader.tsx` - Top navbar (can customize menu text)
- `AppSidebar.tsx` - Left sidebar menu (customize menu items)
- `Backdrop.tsx` - Mobile menu background
- `SidebarWidget.tsx` - Sidebar item component

---

## 🗺️ HOW ROUTING WORKS

**Location:** `src/App.tsx`

```typescript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from '@/layout/AppLayout';
import Home from '@/pages/Dashboard/Home';
import SignIn from '@/pages/AuthPages/SignIn';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes (no layout) */}
        <Route path="/signin" element={<SignIn />} />
        
        {/* Protected routes (with layout) */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Home />} />
          {/* Add your routes here */}
        </Route>
      </Routes>
    </Router>
  );
}
```

---

## ➕ HOW TO ADD YOUR OWN PAGES

### Step 1: Create a New Page File

**Location:** `src/pages/YourFeature/YourPage.tsx`

Example: `src/pages/Expenses/CreateExpense.tsx`

```typescript
import PageMeta from '@/components/common/PageMeta';
import PageBreadCrumb from '@/components/common/PageBreadCrumb';
import { Button } from '@/components/ui/button/Button';
import InputField from '@/components/form/input/InputField';
import TextArea from '@/components/form/input/TextArea';
import Select from '@/components/form/Select';
import { useState } from 'react';

export default function CreateExpense() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [group, setGroup] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ amount, description, group });
    // Send to API
  };

  return (
    <>
      {/* Page title in browser tab */}
      <PageMeta title="Add Expense" description="Create new expense entry" />
      
      {/* Navigation breadcrumb */}
      <PageBreadCrumb pageName="Add Expense" />

      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">
          Add New Expense
        </h1>
      </div>

      {/* Form */}
      <div className="rounded-sm border border-stroke bg-white px-5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <InputField
            label="Amount"
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <TextArea
            label="Description"
            placeholder="What did you spend on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <Select
            label="Group"
            options={[
              { value: '1', label: 'Friends Trip' },
              { value: '2', label: 'Roommates' },
            ]}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            required
          />

          <div className="flex gap-4">
            <Button variant="primary">Add Expense</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </form>
      </div>
    </>
  );
}
```

---

### Step 2: Add Route to App.tsx

```typescript
// In src/App.tsx
import CreateExpense from '@/pages/Expenses/CreateExpense';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          
          {/* Add your new route */}
          <Route path="/expenses/create" element={<CreateExpense />} />
          
        </Route>
      </Routes>
    </Router>
  );
}
```

---

### Step 3: Add to Sidebar Menu

**Location:** `src/layout/AppSidebar.tsx`

Find the sidebar menu items and add yours:

```typescript
// Inside AppSidebar.tsx, find the menu array and add:

const MENU_ITEMS = [
  {
    label: 'Dashboard',
    path: '/',
    icon: DashboardIcon,
  },
  {
    label: 'Add Expense',
    path: '/expenses/create',
    icon: PlusIcon,  // You can use any icon from src/icons
  },
  {
    label: 'Expenses',
    path: '/expenses',
    icon: ListIcon,
  },
  // ... more items
];
```

---

## 🎨 STYLING - HOW TO MODIFY

### Tailwind CSS Classes

The template uses **Tailwind CSS**. Styles are classes in HTML.

```typescript
// Example with Tailwind classes:
<div className="rounded-sm border border-stroke bg-white px-5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark">
  {/* 
    rounded-sm = small border radius
    border = 1px border
    bg-white = white background
    px-5 = 5 padding on x-axis (left/right)
    py-6 = 6 padding on y-axis (top/bottom)
    shadow-default = default shadow
    dark:* = classes for dark mode
  */}
</div>
```

**Common Tailwind classes to know:**
- `bg-white`, `bg-gray-100`, `bg-blue-500` = Background colors
- `text-black`, `text-white`, `text-sm`, `text-lg` = Text colors & sizes
- `px-4`, `py-2` = Padding
- `mx-2`, `my-4` = Margin
- `flex`, `grid`, `w-full`, `h-screen` = Layout
- `rounded-sm`, `rounded-md`, `rounded-lg` = Border radius
- `shadow-default`, `shadow-lg` = Shadows
- `border border-gray-300` = Borders

**Dark mode:** Prefix with `dark:`
```typescript
<div className="bg-white dark:bg-boxdark">Light white, dark gray</div>
```

---

### Custom CSS

**Location:** `src/index.css`

Contains global styles and CSS variables:

```css
/* Color variables used in Tailwind */
:root {
  --color-primary: #3C50E0;
  --color-success: #10B981;
  --color-danger: #EF4444;
  --color-warning: #FBBF24;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #4F46E5;
    /* ... */
  }
}

/* Custom component styles */
.input-field {
  @apply rounded-sm border border-gray-300 px-4 py-2;
}
```

---

## 🔧 SIMPLE CUSTOMIZATION GUIDE

### How to Change Colors

Find color in `index.css` or component file:

```typescript
// Before: Blue primary color
<Button variant="primary">Submit</Button>  // Blue

// To change: Find Button.tsx and modify className:
// className="bg-blue-500" → change to "bg-green-500"
```

**Or use Tailwind directly:**
```typescript
<Button className="bg-green-500 hover:bg-green-600">Green Button</Button>
```

---

### How to Change Sidebar Menu

**Location:** `src/layout/AppSidebar.tsx`

Find this section:
```typescript
const menuItems = [
  { label: 'Dashboard', icon: HomeIcon, path: '/' },
  { label: 'Calendar', icon: CalendarIcon, path: '/calendar' },
  // ... etc
];
```

Replace with your menu:
```typescript
const menuItems = [
  { label: 'Dashboard', icon: HomeIcon, path: '/' },
  { label: 'Groups', icon: GroupIcon, path: '/groups' },
  { label: 'Add Expense', icon: PlusIcon, path: '/expenses/create' },
  { label: 'Expenses', icon: ListIcon, path: '/expenses' },
  { label: 'Settlements', icon: WalletIcon, path: '/settlements' },
  { label: 'Profile', icon: UserIcon, path: '/profile' },
];
```

---

### How to Delete Unused Pages

Remove files:
- ❌ `src/pages/Calendar.tsx`
- ❌ `src/pages/Charts/` (entire folder)
- ❌ `src/pages/UiElements/` (entire folder)
- ❌ `src/components/ecommerce/` (entire folder)

Then remove their routes from `src/App.tsx`

---

## 🪝 HOOKS - HOW TO USE & CREATE

**Location:** `src/hooks/`

### Existing Hooks

#### useModal
```typescript
import { useModal } from '@/hooks/useModal';

export function MyComponent() {
  const { isOpen, open, close } = useModal();
  
  return (
    <>
      <button onClick={open}>Open</button>
      <Modal isOpen={isOpen} onClose={close}>
        Content
      </Modal>
    </>
  );
}
```

#### useGoBack
```typescript
import { useGoBack } from '@/hooks/useGoBack';

export function MyComponent() {
  const goBack = useGoBack();
  
  return <button onClick={goBack}>Go Back</button>;
}
```

---

### Create Your Own Hook

**Example:** `src/hooks/useExpense.ts`

```typescript
import { useState } from 'react';

export function useExpense() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = async (groupId: string) => {
    setLoading(true);
    const response = await fetch(`/api/expenses?group=${groupId}`);
    const data = await response.json();
    setExpenses(data);
    setLoading(false);
  };

  const addExpense = async (expense) => {
    const response = await fetch('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
    const newExpense = await response.json();
    setExpenses([...expenses, newExpense]);
  };

  return { expenses, loading, fetchExpenses, addExpense };
}
```

**Use it:**
```typescript
import { useExpense } from '@/hooks/useExpense';

export function ExpenseList() {
  const { expenses, loading, fetchExpenses } = useExpense();

  useEffect(() => {
    fetchExpenses('group-123');
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <ul>
      {expenses.map(e => <li key={e.id}>{e.description}: ₹{e.amount}</li>)}
    </ul>
  );
}
```

---

## 📋 CONTEXT - STATE MANAGEMENT

**Location:** `src/context/`

Used to share state across components without prop drilling.

### Existing Context

#### ThemeContext
```typescript
import { useTheme } from '@/context/ThemeContext';

export function MyComponent() {
  const { isDark, toggleTheme } = useTheme();
  
  return <button onClick={toggleTheme}>Toggle Theme</button>;
}
```

---

### Create Your Own Context

**Example:** `src/context/AuthContext.tsx`

```typescript
import React, { createContext, useState, useContext } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const userData = await response.json();
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
```

**Use it in App.tsx:**
```typescript
import { AuthProvider } from '@/context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Routes */}
      </Router>
    </AuthProvider>
  );
}
```

**Use in components:**
```typescript
import { useAuth } from '@/context/AuthContext';

export function Profile() {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## 🗂️ WHERE TO ADD CUSTOM ELEMENTS

### Checklist for Adding Features

```
✅ Create new Page?          → Add to src/pages/YourFeature/YourPage.tsx
✅ Create reusable component? → Add to src/components/YourComponent.tsx
✅ Need form inputs?          → Use existing in src/components/form/
✅ Need UI elements?          → Use existing in src/components/ui/
✅ Need shared state?         → Add to src/context/YourContext.tsx
✅ Need custom logic?         → Add hook to src/hooks/useYourLogic.ts
✅ Need custom icons?         → Add SVG to src/icons/ folder
✅ Modify menu?               → Edit src/layout/AppSidebar.tsx
✅ Add route?                 → Edit src/App.tsx
✅ Change colors/styles?      → Edit src/index.css or use Tailwind classes
```

---

## 📝 QUICK REFERENCE

| Task | Location | How |
|------|----------|-----|
| Add page | `src/pages/YourFeature/Page.tsx` | Create file + add route in App.tsx |
| Add component | `src/components/YourComponent.tsx` | Create file + import where needed |
| Add hook | `src/hooks/useYourHook.ts` | Create file + export function |
| Add context | `src/context/YourContext.tsx` | Create + wrap App with provider |
| Change sidebar | `src/layout/AppSidebar.tsx` | Edit menu items array |
| Change colors | `src/index.css` | Edit CSS variables or use Tailwind classes |
| Use form input | Any page | Import from `src/components/form/` |
| Use UI element | Any page | Import from `src/components/ui/` |

---

## 🚀 YOUR NEXT STEPS

1. **Understand the structure:** You have 97 files organized in 12+ folders
2. **Keep what you need:** Layout, theme, form components, UI elements
3. **Delete unused:** ecommerce, charts, calendar, UI demo pages
4. **Create your pages:**
   - `src/pages/Groups/CreateGroup.tsx`
   - `src/pages/Groups/ViewGroup.tsx`
   - `src/pages/Expenses/CreateExpense.tsx`
   - `src/pages/Expenses/ExpenseList.tsx`
   - `src/pages/Settlements/SettlementList.tsx`
5. **Create reusable components:**
   - `src/components/GroupCard.tsx`
   - `src/components/ExpenseForm.tsx`
   - `src/components/BalanceCard.tsx`
6. **Add your hooks:** `useGroup`, `useExpense`, `useBalance`
7. **Add contexts:** `AuthContext`, `GroupContext`
8. **Update routing** in `src/App.tsx`
9. **Customize sidebar** in `src/layout/AppSidebar.tsx`

---

**Ready to start building? Start with creating your first page!**

