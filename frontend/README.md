# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

## Global Search and Browsing Hub

HealthSync features a powerful, enterprise-grade Global Search and Browsing Hub command palette. Rather than a simple keyword search bar, it operates as a full dataset explorer partitioned by medical category.

### 1. Architecture Overview
- **Split-Pane Design**: The modal operates in a split-pane layout. On the left is the category sidebar displaying all searchable tabs and live record counts. On the right is the search header, active filters, results view, and pagination.
- **Immediate Data Loading**: Selecting a category tab immediately loads and displays all available records from the database inside the search modal, even if the search query input is completely empty.
- **Live Counts (Stats)**: Real-time record counts are displayed inside stats badges next to each category tab in the sidebar, providing immediate visibility into system data sizes.
- **Client Side**: Utilizes a debounced hook (300ms) with full keyboard navigation (`Up`/`Down` arrows to highlight, `Enter` to select, `Escape` to close).
- **Backend API**: A unified endpoint `/api/db/search` that queries multiple tables in parallel using MySQL connection pooling. It automatically performs `COUNT(*)` across all categories in parallel to populate sidebar stats.
- **Pagination & Server-Side Filtering**: Supports infinite browsing by paging database rows (`LIMIT 10 OFFSET ?`) using next/prev controls in the modal footer.

### 2. Searchable Categories & Metadata
- **Doctors**: Name, clinical specialty, degree, consultation fee, chamber address, district.
- **Hospitals**: Name, address, phone number, district.
- **Diagnostic Centers**: Center name, address, phone number.
- **Medical Reports / Prescriptions**: Report title, patient name, uploader, event type, date, severity.
- **Appointments**: Appointment date, reason/symptoms, doctor name, patient name, clinic/hospital, status.
- **Patients**: Full name, email, phone, blood group, gender.
- **Medical Services / Tests**: Test name, clinical category, base price.
- **Specializations**: Clinical specialization name.
- **Blog Articles**: Educational articles, read time, summaries.
- **Health Packages**: Comprehensive packages, description, included tests count, pricing.

### 3. Category Quick Filters
Users can drill down into loaded datasets using dynamic dropdowns specific to each category:
- **Doctors**: Specialization, Hospital, Availability (Doctors with set fees).
- **Medical Reports**: Event Type (`REPORT`, `PRESCRIPTION`, `VACCINATION`), Severity (`HIGH`, `MEDIUM`, `LOW`), Event Date.
- **Appointments**: Status (`PENDING`, `CONFIRMED`, `CANCELLED`), Appointment Date.
- **Hospitals / Diagnostic Centers**: Geographic Location (`Dhaka`, `Chittagong`, `Sylhet`, `Rajshahi`).

### 4. Role-Based Access Control & Permissions
Strict security rules are applied on both the frontend tabs rendering and the SQL query builder:
- **Citizens (Patients)**:
  - Can only view/search their own reports (`patient_id = userId`) and appointments (`patient_id = userId`).
  - The **Patients** category is completely hidden and blocked; any attempt to query it returns 0 rows.
- **Doctors**:
  - Can view reports where they are the uploader or where the patient is registered in their patient panel.
  - Can only view appointments assigned to their schedule.
  - Can view details of patients in their panel or who have appointments booked with them.
- **Hospitals**:
  - Can view reports uploaded by the hospital or of patients registered at their facility.
  - Can view appointments booked at their hospital.
  - Can view details of patients registered or admitted to beds at their hospital.
- **Diagnostic Centers**:
  - Can view reports/tests uploaded by them.
  - Can view patients who have performed diagnostic tests at their facility.

### 5. API Endpoint Structure
- **POST** `/api/db/search`
  - **Request Body**:
    ```json
    {
      "query": "Cardio",
      "filters": {
        "category": "doctors",
        "page": 1,
        "limit": 10,
        "specialty": "Cardiology",
        "hospitalId": "h1111111-1111-1111-1111-111111111111",
        "availability": "",
        "eventType": "",
        "severity": "",
        "date": "",
        "status": "",
        "location": ""
      }
    }
    ```
  - **Response Body**:
    ```json
    {
      "data": {
        "doctors": [ ... ],
        "hospitals": [],
        ...
      },
      "stats": {
        "doctors": 6,
        "hospitals": 2,
        "diagnostics": 2,
        "reports": 0,
        "appointments": 0,
        ...
      }
    }
    ```

### 6. Keyboard Shortcuts
- `Ctrl + K` / `Cmd + K`: Toggle Search Menu overlay from anywhere.
- `Arrow Up` / `Arrow Down`: Navigate up and down the results list.
- `Enter`: Select the highlighted card (e.g. view report details, open doctor appointment scheduler, etc.).
- `Escape` / Click Overlay: Close the search hub modal.

---

## Doctor Dashboard Patient Creation & Relationship Fixes

### 1. Root Cause Analysis
- **Missing Database Joins**: The backend `/api/db/query` route did not contain query JOIN structures for the `doctor_patients` and `hospital_patients` tables under the `select` action. As a result, querying patient relationships returned empty `profiles` fields, displaying patient names as `Unknown`.
- **Missing Creation Workflow**: The frontend dialog only permitted searching existing patient emails, without providing any flow to create a patient profile from scratch if the citizen was not already registered on the system.

### 2. Fixes Implemented
- **Backend SQL Joins**: Added `LEFT JOIN profiles` clauses to retrieve and nest patient profile properties (`full_name`, `email`, `phone`) inside `doctor_patients` and `hospital_patients` query results.
- **Double-Tab Add Modal**: Redesigned the "Add Patient" modal in `DoctorMyPatients.tsx` to support:
  - **Link Existing**: Standard email lookups to connect existing citizens.
  - **Create New Patient**: Form fields for Name, Email, Phone, Gender, Blood Group, District, and Address.
- **Image & File Uploads**: Integrated optional profile photos and intake report attachments, uploading them to the local `reports` bucket.
- **Intake Vitals & Medical History**: Added inputs to register optional vitals (BP, HR, Temp, Weight) and initial intake history notes as a `medical_events` timeline record.
- **Proper State & Validations**: Form validates inputs on submission, queries duplicate emails, displays load animations, and immediately updates treatment tables upon success.

---

## Diagnostic Center Dashboard Patient Creation & Relationship Fixes

### 1. Root Cause Analysis
- **Missing Relationship Table**: The relationship table `diagnostic_patients` was completely missing from the database schema, which prevented patient linking, searches, and list retrievals from succeeding.
- **API Column Mismatches**: The backend `/query` select path for listing diagnostic patients filtered on `provider_id`, whereas the frontend registered patient relationships using `diagnostic_id`.
- **Asynchronous State Closure**: In `DiagnosticSearch.tsx`, `handleRegister` updated the state (`setEmail(newEmail)`) and immediately invoked `handleSearch()`. Due to React's asynchronous state updates, the search query used the stale/empty email state, resulting in a false "User not found" alert immediately after a successful registration.

### 2. Fixes Implemented
- **Database Schema Updates**: Added the `CREATE TABLE IF NOT EXISTS diagnostic_patients` statement to the database `schema.sql` and injected verification logic inside the database pool initialization in `db.ts` to ensure it is created automatically on application start.
- **Automatic Relationship Mapping in RPC**: Upgraded the `create_dummy_user` backend RPC to determine user roles via jwt (`req.user`) and automatically insert links into relationship tables (`diagnostic_patients`, `doctor_patients`, or `hospital_patients`) depending on the caller.
- **Query Interceptor**: Added intercept logic in `/api/db/query` insert handler inside `backend/src/routes/db.ts` to automatically populate `provider_id` with `diagnostic_id` for `diagnostic_patients` database entries.
- **State Closure Fix**: Refactored `handleSearch` in `DiagnosticSearch.tsx` to accept an optional `emailOverride` parameter and updated `handleRegister` to call `await handleSearch(undefined, newEmail)` directly.
- **Improved UX & Registration reset**: Cleansed the input state variables (`newName`, `newEmail`, `newPhone`) and closed the modal upon successful registration, displaying a clean success notification.

### 3. Files Modified
- [schema.sql](file:///d:/HealthSync/backend/schema.sql) - Database Schema definition
- [db.ts](file:///d:/HealthSync/backend/src/config/db.ts) - Database initialization and table creation checks
- [db.ts](file:///d:/HealthSync/backend/src/routes/db.ts) - Query select logic for nested profiles and insert intercept maps
- [rpc.ts](file:///d:/HealthSync/backend/src/routes/rpc.ts) - User creation RPC updates with auto-mapping
- [DiagnosticSearch.tsx](file:///d:/HealthSync/frontend/src/features/diagnostic/DiagnosticSearch.tsx) - Search state closure fixes, input reset, modal close, and UX refinements

### 4. Testing Performed
- Verified backend and frontend compile cleanly via `npm run build`.
- Logged in as `labaid@healthsync.com` (Diagnostic role).
- Successfully searched a new patient email, verified the "User not found" alert triggers the registration modal.
- Filled details and registered, verifying that the modal closes, fields reset, and the patient is automatically loaded in the search card.
- Clicked "Assign to Center" and verified that they appear in the "Assigned Patients" list tab.
- Re-searched and tried to re-assign, verifying that duplicate assignment is rejected.

---

## Diagnostic Center Dashboard Functional Fixes & Schema Corrections

### 1. Issues & Root Cause Analysis
- **Test Assignment Failure**: Creating a test order / bill for a patient returned a database error. The client-side payload in `SharedTestModal.tsx` was passing `paid_amount: 0`, which is not a column in the `patient_payments` table in MySQL, triggering a column mismatch SQL exception.
- **Pending Reports Loading Issue**: The pending reports page failed to load patient details, rendering names as "Unknown". The database select route in `db.ts` lacked a join for the `profiles` table for `patient_payments` table selects, meaning `order.profiles` was returned as undefined.
- **Hospital Patient Registration Crash**: Creating a dummy user from the Hospital Dashboard crashed with a database error. The `create_dummy_user` RPC route attempted to insert `admission_date` into `hospital_patients`, which does not exist in the database table schema.
- **Available Tests UUID Generation**: Adding a new test from the frontend bill modal failed with a primary key constraint error (`Field 'id' doesn't have a default value`) because the backend insert controller only auto-generated UUIDs for a limited hardcoded set of tables, omitting `available_tests`.

### 2. Fixes Implemented
- **Test Order Payload Sync**: Removed the invalid `paid_amount` column from the database insert payload in [SharedTestModal.tsx](file:///d:/HealthSync/frontend/src/features/dashboard/widgets/SharedTestModal.tsx).
- **Patient Payments Query Join**: Updated [db.ts](file:///d:/HealthSync/backend/src/routes/db.ts) to handle joins and result nesting of patient profile fields (`full_name`, `email`, `phone`) when querying `patient_payments`.
- **Hospital Patient Link Fix**: Omitted the non-existent `admission_date` column from the insert query on `hospital_patients` in [rpc.ts](file:///d:/HealthSync/backend/src/routes/rpc.ts).
- **UUID Generation for Tests**: Added `available_tests` to the list of tables that automatically receive generated UUIDs for primary keys in the backend insert/upsert query handlers of [db.ts](file:///d:/HealthSync/backend/src/routes/db.ts).

### 3. Files Modified
- [db.ts](file:///d:/HealthSync/backend/src/routes/db.ts) - Added `patient_payments` select query joins and mappings; added `available_tests` UUID generation.
- [rpc.ts](file:///d:/HealthSync/backend/src/routes/rpc.ts) - Fixed `hospital_patients` insert columns.
- [SharedTestModal.tsx](file:///d:/HealthSync/frontend/src/features/dashboard/widgets/SharedTestModal.tsx) - Corrected `patient_payments` insert payload fields.

### 4. Testing Performed
- Re-built both frontend and backend projects successfully.
- Conducted browser-agent automated tests:
  - Logged in as Diagnostic Center, created test orders, verified invoice creation.
  - Verified pending reports list loads cleanly with correct patient names.
  - Uploaded report files and successfully completed AI analysis and updates.
  - Confirmed completed records are removed from the pending dashboard.

---

## Sidebar Transition & Animation Redesign

We have polished and redesigned the sidebar toggle transition and animations to provide a modern, premium, and fluid motion design across desktop, tablet, and mobile devices.

### 1. UI/UX & Animation Changes
- **CSS-Driven Label Transitions**: Restructured navigation labels, welcome messages, and user information cards to transition `max-width`, `opacity`, and `visibility` in pure CSS. Elements are kept in the DOM at all times to prevent sudden layout jumps, vertical height shifts, or text wrapping during width scaling.
- **Micro-Interactions**:
  - **Translate Hover**: Expanded navigation items slide 4px (`translateX`) and scale icons (`scale(1.1)`) on hover to provide elegant interactive feedback.
  - **Bouncy Hamburger Rotation**: The navbar hamburger toggle spins 180 degrees and scales dynamically using a spring curve (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`).
- **Custom Custom Tooltips**: Built custom HTML5 tooltip selectors for collapsed navigation icons. They render to the right, matching the application's premium aesthetic (translucent dark background with border and drop shadow), and include a `0.12s` transition delay to prevent flickering on quick cursor passes.
- **Mobile Drawer Backdrop Fade**: Replaced instant mobile drawer backdrop overlays with a smooth opacity/visibility transition (`0.4s`) that blends in backdrop blurring and shading.

### 2. Responsiveness & Layout Safety
- **Desktop Isolation**: Wrapped all collapsed sidebar CSS overrides (such as centering icons, setting collapsed widths, and enabling custom tooltips) inside a `@media (min-width: 769px)` block. On mobile and tablet, the sidebar drawer defaults to a normal `280px` drawer overlay instead of breaking or shrinking if the desktop sidebar was collapsed.
- **Synchronized Margin Adjustments**: Synced the main content area margin and width resizing animations with the sidebar width transition using identical timing (`0.4s`) and bezier easing (`cubic-bezier(0.25, 1, 0.5, 1)`), avoiding horizontal scrollbars or overlaps.

### 3. Performance Optimizations
- **Non-Clipped Tooltips**: Placed `overflow: visible !important` specifically on `.collapsed .nav` to allow pseudo-element tooltips to display cleanly outside the sidebar container without needing heavy DOM-portal solutions.
- Hardware Acceleration: Applied GPU-accelerated `will-change: width, transform` on the sidebar and `will-change: margin-left, width` on the main layout to minimize reflow recalculations and maintain a constant 60 FPS transition speed.

---

## Database Health Check & Startup Diagnostics

HealthSync features a built-in database validation and startup diagnostics suite in the backend. Whenever the development server starts or restarts (`npm run dev`), the system automatically performs connection tests, schema integrity checks, and module diagnostics before starting the Express listener.

### 1. Startup Validation Process
1. **Connection Test**: Connects to the database pool, measures query round-trip response time, and retrieves the MySQL server version.
2. **Schema Verification**: Checks for the existence of all 15 tables (`User`, `blood_donors`, `blood_requests`, `request_acceptors`, `medical_events`, `patient_payments`, `notifications`, `Appointment`, `MedicalTest`, `doctor_patients`, `hospital_patients`, `HospitalDoctor`, `blood_inventory`, `ai_health_plans`, `diagnostic_patients`) and validates that all expected columns, types, and constraints are present.
3. **Relationship Mapping Checks**: Verifies that all expected foreign key links exist.
4. **Data Integrity Scanning**: Analyzes child tables for orphaned records (broken references) and scans for duplicate records on unique constraints.
5. **Lookup & Seed Verification**: Confirms that essential seed data is populated inside lookup tables (like `MedicalTest` and `User`).
6. **Critical Modules Health**: Displays total active item counts and status breakdowns for critical features (Authentication, Doctors, Patients, Appointments, Payments, Notifications).

### 2. Standalone Health Check Command
To run the same database verification and system diagnostics standalone without launching the Express server, execute the following command in the `backend` folder:

```bash
npm run health-check
```

This script will run the checks, print the colored System Health Report, and exit with code `0` (Success) or `1` (Failure), making it ideal for CI/CD checks or deployment scripts.

### 3. Diagnostic Report Example

#### All Checks Pass (Healthy System)
```
=== DATABASE DIAGNOSTICS & SYSTEM HEALTH CHECK ===
✅ Database Connected successfully (Version: 8.0.44, Response Time: 23ms)
✅ User Table Verified
✅ blood_donors Table Verified
✅ blood_requests Table Verified
✅ request_acceptors Table Verified
✅ medical_events Table Verified
✅ patient_payments Table Verified
✅ notifications Table Verified
✅ Appointment Table Verified
✅ MedicalTest Table Verified
✅ doctor_patients Table Verified
✅ hospital_patients Table Verified
✅ HospitalDoctor Table Verified
✅ blood_inventory Table Verified
✅ ai_health_plans Table Verified
✅ diagnostic_patients Table Verified
✅ Foreign Key Relationships Verified
✅ Database Integrity (Orphan records check) Passed
✅ Seed Data Verified

=== CRITICAL SERVICE MODULES STATUS ===
✅ Users & Authentication Module Verified (Total breakdown: CITIZEN: 7, DIAGNOSTIC: 2, DOCTOR: 6, HOSPITAL: 2)
...
==================================================
               SYSTEM HEALTH REPORT               
==================================================
Database Connection  : PASS
Tables Verified      : 15/15
Relationships Status : PASS
Seed Data Status     : PASS
API Modules Status   : PASS
Startup Errors       : 0
Startup Warnings     : 0
==================================================
```

#### Warnings Detected (Orphaned Rows)
```
==================================================
               SYSTEM HEALTH REPORT               
==================================================
Database Connection  : PASS
Tables Verified      : 15/15
Relationships Status : WARNING
Seed Data Status     : PASS
API Modules Status   : PASS
Startup Errors       : 0
Startup Warnings     : 1
==================================================

DETAILED DIAGNOSTIC LOGS:

⚠️  [WARNING] Orphaned records found: Table `diagnostic_patients` has 1 records referencing non-existent keys in `User`.
   - Target Table: `diagnostic_patients`
   - Relationship: `diagnostic_patients.patient_id -> User.id`
   - Suggested Fix: Clean up orphan references: DELETE FROM `diagnostic_patients` WHERE `patient_id` NOT IN (SELECT `id` FROM `User`);
```

### 4. Error Interpretation & Troubleshooting Guide

| Log Category | Issue Type | Description | Suggested Fix / Action |
### 6. Keyboard Shortcuts
- `Ctrl + K` / `Cmd + K`: Toggle Search Menu overlay from anywhere.
- `Arrow Up` / `Arrow Down`: Navigate up and down the results list.
- `Enter`: Select the highlighted card (e.g. view report details, open doctor appointment scheduler, etc.).
- `Escape` / Click Overlay: Close the search hub modal.

---

## Doctor Dashboard Patient Creation & Relationship Fixes

### 1. Root Cause Analysis
- **Missing Database Joins**: The backend `/api/db/query` route did not contain query JOIN structures for the `doctor_patients` and `hospital_patients` tables under the `select` action. As a result, querying patient relationships returned empty `profiles` fields, displaying patient names as `Unknown`.
- **Missing Creation Workflow**: The frontend dialog only permitted searching existing patient emails, without providing any flow to create a patient profile from scratch if the citizen was not already registered on the system.

### 2. Fixes Implemented
- **Backend SQL Joins**: Added `LEFT JOIN profiles` clauses to retrieve and nest patient profile properties (`full_name`, `email`, `phone`) inside `doctor_patients` and `hospital_patients` query results.
- **Double-Tab Add Modal**: Redesigned the "Add Patient" modal in `DoctorMyPatients.tsx` to support:
  - **Link Existing**: Standard email lookups to connect existing citizens.
  - **Create New Patient**: Form fields for Name, Email, Phone, Gender, Blood Group, District, and Address.
- **Image & File Uploads**: Integrated optional profile photos and intake report attachments, uploading them to the local `reports` bucket.
- **Intake Vitals & Medical History**: Added inputs to register optional vitals (BP, HR, Temp, Weight) and initial intake history notes as a `medical_events` timeline record.
- **Proper State & Validations**: Form validates inputs on submission, queries duplicate emails, displays load animations, and immediately updates treatment tables upon success.

---

## Diagnostic Center Dashboard Patient Creation & Relationship Fixes

### 1. Root Cause Analysis
- **Missing Relationship Table**: The relationship table `diagnostic_patients` was completely missing from the database schema, which prevented patient linking, searches, and list retrievals from succeeding.
- **API Column Mismatches**: The backend `/query` select path for listing diagnostic patients filtered on `provider_id`, whereas the frontend registered patient relationships using `diagnostic_id`.
- **Asynchronous State Closure**: In `DiagnosticSearch.tsx`, `handleRegister` updated the state (`setEmail(newEmail)`) and immediately invoked `handleSearch()`. Due to React's asynchronous state updates, the search query used the stale/empty email state, resulting in a false "User not found" alert immediately after a successful registration.

### 2. Fixes Implemented
- **Database Schema Updates**: Added the `CREATE TABLE IF NOT EXISTS diagnostic_patients` statement to the database `schema.sql` and injected verification logic inside the database pool initialization in `db.ts` to ensure it is created automatically on application start.
- **Automatic Relationship Mapping in RPC**: Upgraded the `create_dummy_user` backend RPC to determine user roles via jwt (`req.user`) and automatically insert links into relationship tables (`diagnostic_patients`, `doctor_patients`, or `hospital_patients`) depending on the caller.
- **Query Interceptor**: Added intercept logic in `/api/db/query` insert handler inside `backend/src/routes/db.ts` to automatically populate `provider_id` with `diagnostic_id` for `diagnostic_patients` database entries.
- **State Closure Fix**: Refactored `handleSearch` in `DiagnosticSearch.tsx` to accept an optional `emailOverride` parameter and updated `handleRegister` to call `await handleSearch(undefined, newEmail)` directly.
- **Improved UX & Registration reset**: Cleansed the input state variables (`newName`, `newEmail`, `newPhone`) and closed the modal upon successful registration, displaying a clean success notification.

### 3. Files Modified
- [schema.sql](file:///d:/HealthSync/backend/schema.sql) - Database Schema definition
- [db.ts](file:///d:/HealthSync/backend/src/config/db.ts) - Database initialization and table creation checks
- [db.ts](file:///d:/HealthSync/backend/src/routes/db.ts) - Query select logic for nested profiles and insert intercept maps
- [rpc.ts](file:///d:/HealthSync/backend/src/routes/rpc.ts) - User creation RPC updates with auto-mapping
- [DiagnosticSearch.tsx](file:///d:/HealthSync/frontend/src/features/diagnostic/DiagnosticSearch.tsx) - Search state closure fixes, input reset, modal close, and UX refinements

### 4. Testing Performed
- Verified backend and frontend compile cleanly via `npm run build`.
- Logged in as `labaid@healthsync.com` (Diagnostic role).
- Successfully searched a new patient email, verified the "User not found" alert triggers the registration modal.
- Filled details and registered, verifying that the modal closes, fields reset, and the patient is automatically loaded in the search card.
- Clicked "Assign to Center" and verified that they appear in the "Assigned Patients" list tab.
- Re-searched and tried to re-assign, verifying that duplicate assignment is rejected.

---

## Diagnostic Center Dashboard Functional Fixes & Schema Corrections

### 1. Issues & Root Cause Analysis
- **Test Assignment Failure**: Creating a test order / bill for a patient returned a database error. The client-side payload in `SharedTestModal.tsx` was passing `paid_amount: 0`, which is not a column in the `patient_payments` table in MySQL, triggering a column mismatch SQL exception.
- **Pending Reports Loading Issue**: The pending reports page failed to load patient details, rendering names as "Unknown". The database select route in `db.ts` lacked a join for the `profiles` table for `patient_payments` table selects, meaning `order.profiles` was returned as undefined.
- **Hospital Patient Registration Crash**: Creating a dummy user from the Hospital Dashboard crashed with a database error. The `create_dummy_user` RPC route attempted to insert `admission_date` into `hospital_patients`, which does not exist in the database table schema.
- **Available Tests UUID Generation**: Adding a new test from the frontend bill modal failed with a primary key constraint error (`Field 'id' doesn't have a default value`) because the backend insert controller only auto-generated UUIDs for a limited hardcoded set of tables, omitting `available_tests`.

### 2. Fixes Implemented
- **Test Order Payload Sync**: Removed the invalid `paid_amount` column from the database insert payload in [SharedTestModal.tsx](file:///d:/HealthSync/frontend/src/features/dashboard/widgets/SharedTestModal.tsx).
- **Patient Payments Query Join**: Updated [db.ts](file:///d:/HealthSync/backend/src/routes/db.ts) to handle joins and result nesting of patient profile fields (`full_name`, `email`, `phone`) when querying `patient_payments`.
- **Hospital Patient Link Fix**: Omitted the non-existent `admission_date` column from the insert query on `hospital_patients` in [rpc.ts](file:///d:/HealthSync/backend/src/routes/rpc.ts).
- **UUID Generation for Tests**: Added `available_tests` to the list of tables that automatically receive generated UUIDs for primary keys in the backend insert/upsert query handlers of [db.ts](file:///d:/HealthSync/backend/src/routes/db.ts).

### 3. Files Modified
- [db.ts](file:///d:/HealthSync/backend/src/routes/db.ts) - Added `patient_payments` select query joins and mappings; added `available_tests` UUID generation.
- [rpc.ts](file:///d:/HealthSync/backend/src/routes/rpc.ts) - Fixed `hospital_patients` insert columns.
- [SharedTestModal.tsx](file:///d:/HealthSync/frontend/src/features/dashboard/widgets/SharedTestModal.tsx) - Corrected `patient_payments` insert payload fields.

### 4. Testing Performed
- Re-built both frontend and backend projects successfully.
- Conducted browser-agent automated tests:
  - Logged in as Diagnostic Center, created test orders, verified invoice creation.
  - Verified pending reports list loads cleanly with correct patient names.
  - Uploaded report files and successfully completed AI analysis and updates.
  - Confirmed completed records are removed from the pending dashboard.

---

## Sidebar Transition & Animation Redesign

We have polished and redesigned the sidebar toggle transition and animations to provide a modern, premium, and fluid motion design across desktop, tablet, and mobile devices, matching the animation quality of leading dashboards like Vercel and Linear.

### 1. UI/UX & Animation Changes
- **CSS-Driven Label Transitions**: Restructured navigation labels, welcome messages, and user information cards. We introduced a progressive animation reveal using staggered delays:
  - Section header (`welcomeLabel`): `0.04s` delay
  - User details (`userInfo`): `0.08s` delay
  - Menu items (`navLabel`): `0.12s` delay
  - Footer logout item: `0.16s` delay
- **No-Wrap Exit Animations**: When collapsing, labels use an instant `0.1s` exit transition with a translation of `-12px` to the left. This ensures text is fully faded and hidden before the sidebar width collapses, preventing any horizontal text wrapping or jumping.
- **Snappy Hamburger Rotation**: The navbar hamburger toggle spins 180 degrees and scales dynamically using a premium deceleration curve (`0.5s var(--ease-out)`).

### 2. Responsiveness & Layout Safety
- **Desktop Isolation**: Wrapped all collapsed sidebar CSS overrides inside a `@media (min-width: 769px)` block. Mobile and tablet layouts slide out as a full drawer overlay (`280px`).
- **Synchronized Margin Adjustments**: Synced the main content area margin and width resizing animations with the sidebar width transition using identical timing (`0.5s`) and bezier easing (`var(--ease-out)`), preventing horizontal overlaps or visual stuttering.

### 3. Performance Optimizations
- **Centered Tooltips on Icons**: Shifted custom tooltips from the `.navItem` to the `.navIcon` element. This isolates absolute tooltip positioning, allowing child containers to run optimized visibility changes without layout clipping.
- **Hardware Acceleration**: Applied GPU-accelerated layer creation with `will-change` on all animating parameters (width, transform, padding, gap, max-width) to minimize browser layout recalculation and maintain 60 FPS.

---

## Database Health Check & Startup Diagnostics

HealthSync features a built-in database validation and startup diagnostics suite in the backend. Whenever the development server starts or restarts (`npm run dev`), the system automatically performs connection tests, schema integrity checks, and module diagnostics before starting the Express listener.

### 1. Startup Validation Process
1. **Connection Test**: Connects to the database pool, measures query round-trip response time, and retrieves the MySQL server version.
2. **Schema Verification**: Checks for the existence of all 15 tables (`User`, `blood_donors`, `blood_requests`, `request_acceptors`, `medical_events`, `patient_payments`, `notifications`, `Appointment`, `MedicalTest`, `doctor_patients`, `hospital_patients`, `HospitalDoctor`, `blood_inventory`, `ai_health_plans`, `diagnostic_patients`) and validates that all expected columns, types, and constraints are present.
3. **Relationship Mapping Checks**: Verifies that all expected foreign key links exist.
4. **Data Integrity Scanning**: Analyzes child tables for orphaned records (broken references) and scans for duplicate records on unique constraints.
5. **Lookup & Seed Verification**: Confirms that essential seed data is populated inside lookup tables (like `MedicalTest` and `User`).
6. **Critical Modules Health**: Displays total active item counts and status breakdowns for critical features (Authentication, Doctors, Patients, Appointments, Payments, Notifications).

### 2. Standalone Health Check Command
To run the same database verification and system diagnostics standalone without launching the Express server, execute the following command in the `backend` folder:

```bash
npm run health-check
```

This script will run the checks, print the colored System Health Report, and exit with code `0` (Success) or `1` (Failure), making it ideal for CI/CD checks or deployment scripts.

### 3. Diagnostic Report Example

#### All Checks Pass (Healthy System)
```
=== DATABASE DIAGNOSTICS & SYSTEM HEALTH CHECK ===
✅ Database Connected successfully (Version: 8.0.44, Response Time: 23ms)
✅ User Table Verified
✅ blood_donors Table Verified
✅ blood_requests Table Verified
✅ request_acceptors Table Verified
✅ medical_events Table Verified
✅ patient_payments Table Verified
✅ notifications Table Verified
✅ Appointment Table Verified
✅ MedicalTest Table Verified
✅ doctor_patients Table Verified
✅ hospital_patients Table Verified
✅ HospitalDoctor Table Verified
✅ blood_inventory Table Verified
✅ ai_health_plans Table Verified
✅ diagnostic_patients Table Verified
✅ Foreign Key Relationships Verified
✅ Database Integrity (Orphan records check) Passed
✅ Seed Data Verified

=== CRITICAL SERVICE MODULES STATUS ===
✅ Users & Authentication Module Verified (Total breakdown: CITIZEN: 7, DIAGNOSTIC: 2, DOCTOR: 6, HOSPITAL: 2)
...
==================================================
               SYSTEM HEALTH REPORT               
==================================================
Database Connection  : PASS
Tables Verified      : 15/15
Relationships Status : PASS
Seed Data Status     : PASS
API Modules Status   : PASS
Startup Errors       : 0
Startup Warnings     : 0
==================================================
```

#### Warnings Detected (Orphaned Rows)
```
==================================================
               SYSTEM HEALTH REPORT               
==================================================
Database Connection  : PASS
Tables Verified      : 15/15
Relationships Status : WARNING
Seed Data Status     : PASS
API Modules Status   : PASS
Startup Errors       : 0
Startup Warnings     : 1
==================================================

DETAILED DIAGNOSTIC LOGS:

⚠️  [WARNING] Orphaned records found: Table `diagnostic_patients` has 1 records referencing non-existent keys in `User`.
   - Target Table: `diagnostic_patients`
   - Relationship: `diagnostic_patients.patient_id -> User.id`
   - Suggested Fix: Clean up orphan references: DELETE FROM `diagnostic_patients` WHERE `patient_id` NOT IN (SELECT `id` FROM `User`);
```

### 4. Error Interpretation & Troubleshooting Guide

| Log Category | Issue Type | Description | Suggested Fix / Action |
| :--- | :--- | :--- | :--- |
| `❌ [ERROR]` | Database Offline | MySQL server is down or unreachable. | Verify the MySQL service is started. Check host, port, and credentials in the `.env` file. |
| `❌ [ERROR]` | Table Missing | A required table (e.g. `User`) does not exist. | Execute the database migrations or run `schema.sql` via MySQL client to create the schema. |
| `❌ [ERROR]` | Column Missing | A column required by the application is not present. | Alter the table to add the column, or rebuild the schema using `schema.sql` and re-seed the tables. |
| `❌ [ERROR]` | Missing Foreign Key | A foreign key relation constraint is missing in MySQL. | Run the suggested `ALTER TABLE ADD FOREIGN KEY` query printed in the logs to restore reference safety. |
| `⚠️  [WARNING]` | Orphaned Records | Row references exist pointing to non-existent primary keys. | Execute the suggested `DELETE FROM child WHERE fk NOT IN (SELECT pk FROM parent)` query printed in the logs. |
| `⚠️  [WARNING]` | Duplicate Records | Duplicates found in columns where uniqueness is required (e.g. `User.email`). | Delete duplicate records and preserve only one unique entry. |
| `⚠️  [WARNING]` | Seed Data Empty | Tables like `MedicalTest` contain no records. | Execute the seed script: `npm run seed` (or `node seed.js`) inside the backend directory. |
