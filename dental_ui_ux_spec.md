# UI/UX Specification: Dental Clinic Network Application

This document provides a comprehensive layout, interactive element count, button positions, and functional specifications of all user interfaces in the **Dental Clinic Network** application. It is structured to serve as a design ingestion file for manual generation tools (e.g., Stitch, v0, or custom UI generators).

---

## 🎨 Global Design System & Aesthetics

- **Primary Colors**: Cyan (`#0891b2`), Teal (`#0d9488`), and Emerald (`#10b981`) for clinic portals, clinical paths, and success screens.
- **Warm Accent Colors**: Amber (`#d97706`), Orange (`#ea580c`), and Rose (`#e11d48`) for the Family clinic branch, warning badges, and delete actions.
- **Dark Mode System (ShadowForge)**: Dark theme variables are tailored around clean medical-slate greens (e.g., `#070c0a` background, `#121c19` cards, and glowing teal borders).
- **Claymorphism / Glassmorphic UI**: High use of translucent backdrops, frosted borders, subtle white overlays, card hover offsets (`translate-y-[-2px]`), and radial light glow effects.
- **Typography**: Editorial headings using font-serif typography (e.g., *Outfit*, *Playfair*, or system serif) paired with highly readable sans-serif labels (*Inter*) and mono font faces (*JetBrains Mono*) for financial records, dates, and ID strings.
- **Micro-Animations (Framer Motion)**:
  - Staggered entry lists (`staggerChildren: 0.08`)
  - Smooth 3D tilt effects on branch choice cards
  - Bouncing badge check circles
  - Loading spinner rotations and spring transitions (`type: "spring"`)

---

## 🏛️ Summary of Application Routes & Pages

Total unique route groups: **14 pages / interfaces**

1. **Clinic Gateway Portal** (`/`)
2. **Family Branch Home Page** (`/family`)
3. **Hazara Branch Home Page** (`/hazara`)
4. **Appointment Intake Form** (`/[branchSlug]/book`)
5. **Booking Success Screen** (`/[branchSlug]/book/success`)
6. **Centralized Administration Gateway** (`/adminstration` & `/administration`)
7. **Admin Dashboard Login** (`/admin/login`)
8. **Admin Control Console - Appointments** (`/admin`)
9. **Admin Control Console - Doctors** (`/admin/doctors`)
10. **Admin Control Console - Billing** (`/admin/billing`)
11. **Admin Control Console - Finances** (`/admin/finances`)
12. **Admin Control Console - Messaging** (`/admin/messaging`)
13. **Admin Control Console - Settings** (`/admin/settings`)
14. **Mobile Camera Capture Utility** (`/admin/capture`)

---

## 📋 Detailed Page UI & UX Specifications

---

### 1. Clinic Gateway Portal (`/`)
* **Purpose**: Primary entrance page where patients select which branch clinic portal to enter.
* **Layout Structure**: 
  - Frosted sticky header with network logo.
  - Centered Hero Section with text badge, main heading, subtext, and happy patient social proof indicator.
  - Side-by-side Branch Cards with 3D hover effects, custom list bullets of branch features, and prominent portal links.
  - Minimalist text footer.
* **Interactive Elements**:
  - Social Proof Badge: Star review summary.
  - Branch Choice Cards: Hazara vs. Family Dental Clinic.
* **Buttons Count & Positions**: **3 buttons**
  1. Header Brand Link (Left): Returns to `/`.
  2. Hazara Card Portal CTA (Center-Left Card, Bottom): Links to `/hazara`.
  3. Family Card Portal CTA (Center-Right Card, Bottom): Links to `/family`.

---

### 2. Branch Home Pages (`/family` & `/hazara`)
* **Purpose**: Marketing and details page for a specific clinic branch.
* **Layout Structure**:
  - Floating top navigation bar with a back link and portal CTA.
  - Hero area with custom branch gradient backdrop, floating visual particles, headline, and subtext.
  - Coordinate Grid: Three clean cards summarizing (a) Working hours, (b) Clinic location coordinates, (c) Contact numbers & emails.
  - Services Catalog: 3 columns of cards detailing treatment categories (Pediatrics, examinations, crowns).
  - Testimonial Callout: Quote bubble with star ratings and patient details.
  - Clean branded footer.
* **Buttons Count & Positions**: **4 buttons**
  1. Header Back Arrow Link (Left): Returns to `/`.
  2. Header Appointment CTA (Right): Links to `/[branchSlug]/book`.
  3. Hero Booking CTA (Center, Left): Links to `/[branchSlug]/book`.
  4. Hero Treatments CTA (Center, Right): Anchors to `#services` section.

---

### 3. Appointment Intake Form (`/[branchSlug]/book`)
* **Purpose**: Client-facing secure multi-step booking form.
* **Layout Structure**:
  - Frosted header with back link.
  - Card container with active 3-step progress bar (demographics -> doctor/date -> slot/symptoms).
  - Form field rows with icons inside input tags.
  - Modal overlay for family accounts checking.
* **Interactive Elements & Input Fields**:
  - *Step 1*: Full Name (text), Age (number), Mobile Number (tel), Email Address (email).
  - *Step 2*: Doctor selection cards (list), Appointment Date (date-picker).
  - *Step 3*: Available time slot grid (8 buttons), Concern text box (textarea).
* **Buttons Count & Positions**: **15 buttons (dynamic based on slots)**
  1. Header Back Arrow Link (Left): Returns to `/[branchSlug]`.
  2. Step 1 Next Step (Bottom Right): Validates details and moves to Step 2.
  3. Step 1.5 Family Account Confirmation Modal - Primary (Modal Center-Left): Links account.
  4. Step 1.5 Family Account Confirmation Modal - Secondary (Modal Center-Right): Returns to edit.
  5. Step 2 Back Link (Bottom Left): Goes back to Step 1.
  6. Step 2 Next Step (Bottom Right): Goes to Step 3.
  7. Step 3 time slot buttons (8 grids): Selects specific appointment slot.
  8. Step 3 Back Link (Bottom Left): Goes back to Step 2.
  9. Step 3 Submit CTA (Bottom Right): Confirms slot.

---

### 4. Booking Success Screen (`/[branchSlug]/book/success`)
* **Purpose**: Displays reservation verification.
* **Layout Structure**:
  - Centered success tick icon with bounce animation.
  - Structured receipt container detailing branch name, assigned doctor, booking date, time, demographics, and symptoms text.
  - Bottom action row.
* **Buttons Count & Positions**: **3 buttons**
  1. Header Back Arrow Link (Left): Returns to `/[branchSlug]`.
  2. Home Page Navigation Link (Bottom Left): Links to `/[branchSlug]`.
  3. Book Another Navigation Link (Bottom Right): Links to `/[branchSlug]/book`.

---

### 5. Centralized Administration Gateway (`/adminstration` / `/administration`)
* **Purpose**: Launcher page for staff to access dashboards and tools.
* **Layout Structure**:
  - Clean header with home back link.
  - Centered tagline.
  - 3-Column directory dashboard cards: (1) Control Center, (2) Dentist Portals, (3) Mobile Camera.
* **Buttons Count & Positions**: **3+ buttons (depends on doctor records)**
  1. Header Back Arrow Link (Left): Returns to `/`.
  2. Card 1 Admin Dash Portal CTA (Left Card, Bottom): Links to `/admin`.
  3. Card 2 Dentist Portals list (Center Card): Dynamic list of links to `/doctor/[slug]`.
  4. Card 3 Mobile Capture Portal CTA (Right Card, Bottom): Links to `/admin/capture`.

---

### 6. Admin Dashboard Login (`/admin/login`)
* **Purpose**: Passcode block for administration panel.
* **Layout Structure**:
  - Floating ambient blobs background.
  - Centered card with Shield icon, heading, single password input, and submission button.
* **Interactive Elements**:
  - Admin Passcode input (password type, centered lock icon).
* **Buttons Count & Positions**: **2 buttons**
  1. Submit Login CTA (Form bottom): Validates access.
  2. Return to Gateway Link (Page bottom): Returns to `/adminstration`.

---

### 7. Admin Control Console - Appointments Layout (`/admin`)
* **Purpose**: Central hub for managing clinic appointments.
* **Layout Structure**:
  - Left navigation Sidebar: Network logo, 6 nav buttons, theme toggler, and logout button.
  - Top header bar: Page identifier, gateway redirect shortcut.
  - Stats Strip: 4 indicators (Total, Pending, Confirmed, Completed) in claymorphism cards.
  - Filter bar: Horizontal branch selectors, date-picker input, patient details search input.
  - Appointments Table: Columns (Patient Info, Branch, Slot Info, Doctor, Status, Actions).
* **Interactive Elements & Input Fields**:
  - Search field, Date field, Branch tabs.
  - Interactive Table: Dropdown select in status columns (Pending/Confirmed/Completed/Cancelled).
* **Buttons & Actions Count**: **11+ buttons (depends on rows)**
  1. Sidebar Nav Link 1 (Appointments)
  2. Sidebar Nav Link 2 (Manage Doctors)
  3. Sidebar Nav Link 3 (Billing & Checkout)
  4. Sidebar Nav Link 4 (Finances & Profits)
  5. Sidebar Nav Link 5 (Messaging & Campaigns)
  6. Sidebar Nav Link 6 (Settings)
  7. Sidebar Theme Toggle (Sidebar Bottom)
  8. Sidebar Logout CTA (Sidebar Bottom)
  9. Topbar Gateway Shortcut Link (Header Right)
  10. Filter Tabs (Branch toggles: All, Hazara, Family)
  11. Book Offline Button (Filter row, right): Opens Modal.
  12. Table row: "Reports" button (Table actions column): Opens reports compiler modal.
  13. Table row: "Postpone" button (Table actions column): Opens reschedule modal.

#### 🗲 Modals in Appointments View:
* **Book Offline Modal Form**:
  - Inputs: Name, Email, Mobile, Age, Branch selection, Doctor selection, Date, Time Slot selection, symptoms textarea.
  - Buttons: Cancel (Bottom Left), Book Appointment (Bottom Right).
* **Reschedule / Postpone Modal Form**:
  - Inputs: Date picker, time slot picker.
  - Buttons: Cancel (Bottom Left), Confirm Postpone (Bottom Right).
* **Reports Compiler Modal Form**:
  - Verification Box: Warning label if no invoice is found.
  - Inputs: Email address, WhatsApp phone number, Prescription text area.
  - Uploaders: X-ray file input, Prescription sheet input.
  - Special Button: "Pick by Mobile" (Integrates mobile camera syncing using active tickets).
  - Buttons: Cancel (Bottom Left), Send Combined Report & Bill (Bottom Right).

---

### 8. Admin Control Console - Doctors (`/admin/doctors`)
* **Purpose**: Administration of clinic staff directories and payouts.
* **Layout Structure**:
  - Standard Admin sidebar + Header layout.
  - Header bar with "Add Clinic Doctor" trigger.
  - 3-column doctor profiles grid showing image, specialty, branch badge, compensation summary, and actions.
* **Interactive Elements & Modals**:
  - Profile card action triggers: Edit doctor, Delete doctor.
  - Add/Edit Modal inputs: Picture upload, Name, Email, Specialty, Branch dropdown, Compensation mode select (fixed salary vs profit split percentage), Fixed Salary base input, Profit Share percentage input, profit sharing target checkboxes (consultation/medicines/both), password input, profile slug text field.
* **Buttons Count & Positions**: **3+ buttons (depends on cards)**
  1. Add Doctor Trigger (Header Right).
  2. Card edit icon button (Card footer, right).
  3. Card delete icon button (Card footer, right).
  4. Modal Form Cancel (Modal bottom left).
  5. Modal Form Save (Modal bottom right).

---

### 9. Admin Control Console - Billing (`/admin/billing`)
* **Purpose**: Live point-of-sale invoicing terminal for checkout.
* **Layout Structure**:
  - Left panel: Selection of active patient appointment, medicine search input with dropdown autocomplete results, treatment/procedure dropdown selectors, Custom Procedure trigger, Custom Medicine trigger.
  - Right panel: Itemized checkout table (shows item details, quantity counters, strips/tablets toggles, unit pricing inputs, delete buttons), discount modifiers, and grand total card.
* **Interactive Elements & Inputs**:
  - Select patient appointment (dropdown).
  - Medicine query (autocomplete input) -> Autocomplete Dropdown list.
  - Medicine Batch Modal select (if medicine has multiple batches).
  - Quantity counter inputs, unit price inputs, discount inputs (Treatment discount %, Medicine discount %).
  - Register New Stock Modal: Barcode, Quantity, Name, Generic, Batch, Expiry, tablets per patch, Price, Cost, Save button.
* **Buttons Count & Positions**: **7+ buttons (depends on row items)**
  1. Medicine search results (dynamic rows in dropdown): Click to add item.
  2. "Add Treatment" Trigger (Left panel): Adds selected procedure.
  3. "Add Custom Treatment" (Left panel): Adds blank custom row.
  4. "Add Custom Medicine" (Left panel): Adds blank custom medicine row.
  5. Register New Stock Trigger (Left panel, below medicine search).
  6. Table row Delete (Each row, right).
  7. "Checkout" CTA (Right panel bottom): finalizes invoice.

---

### 10. Admin Control Console - Finances (`/admin/finances`)
* **Purpose**: Analytics dashboard for revenue and profits.
* **Layout Structure**:
  - Standard dashboard layout with sub-tabs deck: Analytics, Closing, Attendance, Helpers, Doctors, Extra.
  - **Analytics Tab**: Recharts graphs (monthly revenue lines, branch expense area charts, treatment vs medicine profit pies), statistics boxes, detail logs.
  - **Closing Tab**: Appointment invoice overrides table.
  - **Attendance Tab**: Date filter and attendance status radios for helpers/doctors.
  - **Helpers Tab**: Roster of assistant boys, shift rates, and adding modal.
  - **Doctors Tab**: Registered doctors list linking to their proration detail sheets.
  - **Extra Expenses**: Logging tool for unexpected branch charges.
* **Salary Computation Breakdown Page (`/admin/finances/doctor/[id]`)**:
  - Month selection input.
  - Absences logs list.
  - Operating expenses tooltips.
  - Math formula display (Billed gross - absences - expenses).
* **Buttons Count & Positions**: **8+ buttons**
  1. Sub-tab headers (6 buttons).
  2. Update Attendance Trigger (Attendance tab).
  3. Add Assistant Trigger (Helpers tab).
  4. Save Electricity Bill (Finances main tab).
  5. Log Salary Deduction / Fine Trigger (Finances main tab).
  6. View Salary Details Link (Doctors list table row, right): Navigates to computation page.
  7. Log Extra Expense Trigger (Extra tab).

---

### 11. Admin Control Console - Messaging (`/admin/messaging`)
* **Purpose**: Customer outreach center using WhatsApp and emails.
* **Layout Structure**:
  - Quick Automated Runners block: Two side-by-side cards.
  - Dual Column grid: Left side has the broadcast campaign form composer; right side has the message delivery logs.
* **Interactive Elements & Input Fields**:
  - Audience target selector dropdown (All, Hazara, Family).
  - Campaign announcement body (textarea).
  - Offer image URL link (url input).
* **Buttons Count & Positions**: **4 buttons**
  1. "Run Reminders" Trigger (Top-left quick panel).
  2. "Send Greetings" Trigger (Top-right quick panel).
  3. "Broadcast Campaign Now" Submit CTA (Composer bottom).
  4. Refresh Delivery Logs icon trigger (Logs table header).

---

### 12. Admin Control Console - Settings (`/admin/settings`)
* **Purpose**: General clinical and technical overrides.
* **Layout Structure**:
  - Left vertical sub-nav cards: Security, Branch Hours, Procedures, Medicines, Messaging.
  - Right settings sheet matching selection.
  - **Medicines Sub-tab**: Lists inventory with search, Batch Add Stock Modal, bulk CSV template download, and bulk CSV file importer.
* **Interactive Elements**:
  - Add Time Slot input (text).
  - Create Treatment inputs (Procedure name, selling price, unit cost).
  - Inventory search filter (text).
  - CSV file import selection.
* **Buttons Count & Positions**: **10+ buttons**
  1. Settings tab deck (5 buttons).
  2. "Update Access Passcode" CTA (Security page).
  3. "Save Branch Hours" CTA (Branches page).
  4. "Add Time Slot" CTA (Branches page).
  5. "Add Procedure" CTA (Procedures page).
  6. "Export Inventory (CSV)" CTA (Medicines page).
  7. "Download Import Template" CTA (Medicines page).
  8. "Import from CSV" File Trigger (Medicines page).
  9. Add Stock to Medicine Trigger (Medicines inventory list, row right).
  10. "Save Capture Permissions" CTA (Branches camera passcode page).

---

### 13. Dentist Portal (`/doctor/[slug]`)
* **Purpose**: Clinic screen designed for dentist usage.
* **Layout Structure**:
  - Pre-dashboard auth screen (Key passcode input).
  - Header: Practitioner info, branch location, back to Gateway button.
  - Multi-tab layouts: Appointments list, Book offline, Earnings details.
  - Earnings Tab features proration settings.
* **Buttons Count & Positions**: **6+ buttons**
  1. Authenticate Dentist Portal CTA (Login page).
  2. Return to Gateway Link (Login page, bottom).
  3. Tab selector buttons: Appointments, Book, Earnings (3 buttons).
  4. Logout Practitioner Icon Trigger (Header Right).
  5. Computation breakdown toggle (Earnings page).
  6. Modals action buttons (same modal forms as admin control console).

---

### 14. Mobile Camera Capture Utility (`/admin/capture`)
* **Purpose**: Web utility for smartphones to capture diagnostics and scan stock.
* **Layout Structure**:
  - Frosted top bar.
  - Step 1: Branch select and Passcode validator.
  - Step 2: Mode Toggle (Prescription vs Barcode).
    - **Prescription Mode**: Dropdown selector of active clinical slots, device camera trigger window, compression logs, upload preview container.
    - **Barcode Mode**: Input box for manual entries, live camera barcode capture area (`html5-qrcode` scanner frame), medicine registration sheet.
* **Interactive Elements & Input Fields**:
  - Branch selection dropdown, passcode text input.
  - Target patient slot dropdown.
  - Camera launch button (triggers native device camera).
  - Barcode capture stream.
* **Buttons Count & Positions**: **5 buttons**
  1. Unlock Camera Portal CTA (Authentication page).
  2. Mode Toggle (Prescription vs Barcode).
  3. "Launch Device Camera" Trigger (Prescription page center).
  4. "Upload Sync Photo" CTA (Prescription page bottom, appears after photo capture).
  5. "Register Medicine Stock" CTA (Barcode page bottom).
