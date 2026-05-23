# ⚡ FieldTrack
### Field Engineer Attendance System
**Client:** Tata Power Odisha | **Operator:** Digitide Solutions Limited

---

## Files in This Package

```
fieldtrack/
├── pwa/
│   ├── index.html      ← The complete mobile app (single file)
│   ├── manifest.json   ← PWA install config (Android/iPhone)
│   └── sw.js           ← Service worker (offline support)
│
├── backend/
│   └── Code.gs         ← Google Apps Script (paste into script.google.com)
│
├── SETUP.md            ← Step-by-step deployment guide ← START HERE
└── README.md           ← This file
```

## Quick Start

**Read `SETUP.md` for the full step-by-step guide.**

In short:
1. Create a Google Sheet + Drive folder
2. Deploy `Code.gs` to Google Apps Script
3. Paste the Web App URL into `index.html`
4. Host `pwa/` folder on GitHub Pages or Netlify (free)
5. Share the link with your 70 engineers

## What it does (Phase 1)

- ✅ Engineer logs in with Employee ID + Name + Zone
- 📷 Captures a selfie using front camera
- 📍 Acquires GPS coordinates with accuracy reading
- ✅ Taps Punch IN → data sent to Google Sheets + selfie to Drive
- 🔴 Taps Punch OUT → same process at end of day
- 📋 Manager views real-time data in Google Sheets with Maps links

## Phase 2 (Travel Allowance) — Ready to build on request
- Location waypoints throughout the day
- Haversine distance calculation between points
- Auto TA calculation (km × rate)
- Admin dashboard with route visualization

---
*FieldTrack v1.0 — 100% free, no subscriptions, no app stores*
