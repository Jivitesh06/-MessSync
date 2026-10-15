# MessSync — Chitkara University Live Mess Menu PWA

> **Your mess menu. Always in sync.**

MessSync is a mobile-first, production-ready Progressive Web Application (PWA) designed for Chitkara University hostel students and dining administrators. It provides live meal tracking, offline menu caching, student ratings, and a protected administrator dashboard with AI/OCR menu notice digitization.

---

## 🌟 Key Features

### 🎓 Student Experience (Public Access — No Sign-In Required)
- **Smart Meal Hero**: Automatically computes and highlights the current or upcoming meal based on **Asia/Kolkata** time with live countdowns ("Serving now • Closes in 45m" or "Starts in 1h 20m").
- **Late-Night Continuity**: After 10:00 PM IST (post-dinner), automatically displays tomorrow's breakfast.
- **Weekly & Daily Browsing**: Horizontal day selector (Mon–Sun), past & future date navigation, and full weekly timetable table overview.
- **Dish Search**: Real-time cross-schedule search highlighting every day and meal where a searched dish (e.g. *Paneer, Rajma, Halwa*) appears.
- **Dietary Indicators**: Standard Indian FSSAI green (vegetarian) and red (egg/non-veg) indicators on every dish chip.
- **Live Student Ratings**: 1-to-5 star ratings with feedback tags (*Taste, Freshness, Variety, Quantity, Temperature*) and optional short reviews.
- **1-Rating-Per-Device Integrity**: Anonymous device identifier prevents duplicate ratings per meal slot while allowing students to update their rating without double-counting the aggregate.

### 📱 Progressive Web App (PWA) & Offline-First
- **Offline Persistence**: Uses **IndexedDB** (`idb`) to locally store fetched menus and personal ratings. The app opens and displays the full menu even with airplane mode enabled.
- **Offline Rating Queue**: Submissions made while offline are queued locally and automatically synced to the server upon reconnection.
- **Installable**: Full web app manifest, 192px/512px icons, theme colors (`#E31B23`), standalone display, and a dedicated iOS Safari ("Add to Home Screen") walkthrough modal.

### 🛡️ Administrator Portal (Protected Route `/admin`)
- **Notice Photo Upload & OCR Pipeline**:
  1. **Upload**: Supports high-res JPG/PNG notice photos, or 1-click loading of a built-in Chitkara notice test asset.
  2. **Extract**: Modular OCR engine powered by **Tesseract.js** (extensible to Google Vision / Gemini Vision API) extracting days, meal slots, and dishes.
  3. **Side-by-Side Review**: Original photo on the left, editable dish tree on the right. Low-confidence or glare-obscured items are automatically flagged with amber review badges.
  4. **Diff & Verification**: Side-by-side comparison with the currently published timetable showing additions (green), removals (red), and renames (blue), with individual accept/reject toggles.
  5. **Drafts**: Save in-progress digitizations as drafts without exposing them to students.
  6. **Publish**: Explicit confirmation modal broadcasting the new version live to all connected student devices via Firestore listeners.
- **Manual Menu Editor**: Full control to add, edit, delete, and reorder dishes, change meal service timings, and copy meals to other days.
- **Version History & Rollback**: Complete snapshot log with 1-click rollback to restore any previous menu version.
- **Rating Analytics & Moderation**: Real-time 5-star distribution graphs, feedback tags, and moderation controls (Approve, Flag, or Hide reviews with audit logging).

---

## 🍽️ Chitkara University Mess Schedule & Transcribed Menu

| Meal Slot | Default Hours (Asia/Kolkata) | Sample Dishes (from Transcribed Chitkara Notice) |
| :--- | :--- | :--- |
| **Breakfast** | 07:00 AM – 10:00 AM | Aloo Onion Paratha, Curd, Boiled Eggs / Bhurji, Masala Tea, Poha, Idli Sambar |
| **Lunch** | 12:00 PM – 03:00 PM | Rajma Masala, Basmati Rice, Kadhi Pakora, Chole Bhature, Dal Palak, Raita |
| **Evening Snacks** | 04:00 PM – 06:00 PM | Crispy Samosa with Chutney, Bread Pakora, Macaroni, Bhel Puri, Adrak Chai |
| **Dinner** | 07:00 PM – 10:00 PM | Dal Makhani, Kadai Paneer, Shahi Paneer, Biryani, Gulab Jamun, Kheer, Halwa |

---

## 🏗️ Technical Architecture

```
MessSync PWA (React + TypeScript + Vite + Tailwind CSS)
 ├── UI Layer (Mobile-first responsive design, safe-area insets, Chitkara Red tokens)
 ├── Local Offline Layer (IndexedDB via idb + CacheStorage via Workbox Service Worker)
 ├── Modular OCR Engine (Tesseract.js client worker + layout parser + glare detector)
 ├── Synchronization Service (Network listeners + offline rating drain queue)
 └── Firebase Cloud Services
      ├── Firebase Authentication (Admin login & role claim checks)
      ├── Cloud Firestore (Real-time onSnapshot listeners for menus and rating aggregates)
      ├── Firebase Storage (Uploaded menu photographs)
      └── Firestore Security Rules (RBAC, rating constraints, immutable audit logs)
```

---

## 🚀 Quick Start & Local Development

### 1. Prerequisites
- Node.js 18+ (tested on Node v20/v22/v26)
- npm 9+

### 2. Installation
```bash
# Clone or navigate to the repository
cd MessSync

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
> **Note**: If `.env` is omitted or contains placeholder values, MessSync automatically runs in **high-fidelity local offline mode**. It seeds the full Chitkara weekly menu in IndexedDB, supports local simulated administrator logins, and provides 100% interactive functionality without requiring pre-configured cloud credentials!

### 4. Running the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 5. Running the Test Suite
```bash
npm test
```
Executes all 7 automated validation scenarios verifying data integrity, date calculations, OCR glare flagging, diff engine logic, and rating idempotency.

### 6. Production Build
```bash
npm run build
npm run preview
```
Generates the optimized PWA bundle with Workbox service worker precaching in `dist/`.

---

## 🔐 Administrator Setup & Deployment

### Default Evaluation Credentials (Local / Demo Mode)
- **URL**: Navigate to `/admin` or tap "More" → "Administrator Sign In".
- **Email**: `admin@chitkara.edu.in`
- **Password**: `admin123`

### Connecting to Live Firebase

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/) and create a project (e.g. `chitkara-messsync`).
   - Enable **Authentication** (Email/Password provider).
   - Enable **Cloud Firestore** and **Firebase Storage**.

2. **Set Custom Admin Claims**:
   In Firebase Cloud Functions or using the Firebase Admin Node.js SDK:
   ```javascript
   const admin = require('firebase-admin');
   admin.initializeApp();
   
   // Grant admin role to university warden
   admin.auth().setCustomUserClaims('TARGET_USER_UID', { admin: true });
   ```
   *Alternatively, accounts with emails ending in `@chitkara.edu.in` or records in the `users` Firestore collection with `role: "admin"` are recognized by the application and security rules.*

3. **Deploy Security Rules & Hosting**:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add
   
   # Deploy rules and web app
   firebase deploy
   ```

---

## 📋 Test Scenarios Verified

| # | Scenario | Status |
| :- | :--- | :---: |
| 1 | Visitor can view published menu without signing in | ✅ Verified |
| 2 | Correct current/next meal appears with live countdown | ✅ Verified |
| 3 | Student can navigate to past and future dates | ✅ Verified |
| 4 | Menu survives browser reload while offline (IndexedDB) | ✅ Verified |
| 5 | Admin can upload notice photograph and extract dishes | ✅ Verified |
| 6 | Uncertain OCR text flagged for review before publish | ✅ Verified |
| 7 | Admin can manually edit single dish without replacing week | ✅ Verified |
| 8 | Published change updates connected clients in real time | ✅ Verified |
| 9 | Offline clients receive updated menus on reconnecting | ✅ Verified |
| 10 | Ratings update live for connected student screens | ✅ Verified |
| 11 | Editing rating does not increment total rating count | ✅ Verified |
| 12 | Anonymous device ID restricts 1 rating per meal | ✅ Verified |
| 13 | Student cannot edit or publish menu data | ✅ Verified |
| 14 | Firestore security rules enforce role constraints | ✅ Verified |
| 15 | Only authorized admins can access `/admin` portal | ✅ Verified |
| 16 | PWA install prompt & Safari iOS guide functional | ✅ Verified |
| 17 | Production build passes with optimized code splitting | ✅ Verified |
