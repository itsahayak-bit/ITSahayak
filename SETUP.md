# FieldTrack – Complete Setup Guide
## Tata Power Odisha · Desktop Support Engineer Attendance System

---

## 📋 WHAT YOU'RE DEPLOYING

| Component | Technology | Cost |
|-----------|-----------|------|
| Mobile Web App (PWA) | HTML/CSS/JS | Free |
| Backend API | Google Apps Script | Free |
| Database | Google Sheets | Free |
| Selfie Storage | Google Drive | Free (15GB) |
| Hosting | Any static host (GitHub Pages, Netlify) | Free |

**Works on:** Android (Chrome) + iPhone (Safari) — no App Store required.

---

## STEP 1 — Create the Google Sheet

1. Go to **sheets.google.com** → click **Blank spreadsheet**
2. Name it: `FieldTrack – Attendance`
3. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/  <<<COPY THIS PART>>>  /edit
   ```
4. Save this ID — you'll need it in Step 3.

---

## STEP 2 — Create the Google Drive Folder (for selfies)

1. Go to **drive.google.com** → click **New → Folder**
2. Name it: `FieldTrack – Selfies`
3. Open the folder, copy the **Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/  <<<COPY THIS PART>>>
   ```
4. Save this ID — you'll need it in Step 3.

---

## STEP 3 — Deploy the Google Apps Script Backend

1. Go to **script.google.com** → click **New Project**
2. Name it: `FieldTrack Backend`
3. Delete any existing code in the editor
4. Open the file `backend/Code.gs` from this package
5. **Paste the entire contents** into the Apps Script editor
6. Replace the two constants at the top:
   ```javascript
   const SHEET_ID        = 'PASTE_YOUR_SHEET_ID_HERE';
   const DRIVE_FOLDER_ID = 'PASTE_YOUR_FOLDER_ID_HERE';
   ```
7. Click **Save** (Ctrl+S / Cmd+S)

### Test the setup first:
8. In the function dropdown (top bar), select **testSetup**
9. Click **▶ Run**
10. Check the **Execution Log** at the bottom — you should see two green checkmarks

### Deploy as Web App:
11. Click **Deploy → New Deployment**
12. Click the gear icon ⚙️ next to "Select type" → choose **Web App**
13. Fill in:
    - Description: `FieldTrack v1`
    - Execute as: **Me**
    - Who has access: **Anyone**
14. Click **Deploy**
15. Click **Authorize access** → choose your Google account → Allow
16. **COPY THE WEB APP URL** — it looks like:
    ```
    https://script.google.com/macros/s/AKfycb.../exec
    ```
    > ⚠️ Keep this URL private — anyone with it can submit data

---

## STEP 4 — Configure the PWA

1. Open `pwa/index.html` in a text editor (Notepad, VS Code, etc.)
2. Find this line near the top of the `<script>` section:
   ```javascript
   const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
3. Replace it with your actual URL:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
4. Save the file.

---

## STEP 5 — Host the PWA (Free Options)

### Option A: GitHub Pages (Recommended — completely free)

1. Create a free account at **github.com**
2. Click **New Repository** → name it `fieldtrack` → set to **Public** → Create
3. Upload the three files from the `pwa/` folder:
   - `index.html`
   - `manifest.json`
   - `sw.js`
4. Go to **Settings → Pages → Source** → select `main` branch → Save
5. Your app is live at:
   ```
   https://YOUR-USERNAME.github.io/fieldtrack/
   ```

### Option B: Netlify (Drag & drop — 30 seconds)

1. Go to **netlify.com** → sign up free
2. Drag the entire `pwa/` folder onto the Netlify dashboard
3. Your app gets a URL instantly like:
   ```
   https://random-name.netlify.app
   ```

### Option C: Self-hosted (If you have a web server)
- Copy all 3 files to your web server's `public_html` or `www` folder
- Must be served over **HTTPS** (camera + GPS require secure context)

---

## STEP 6 — Add App Icons (Important for PWA install)

The manifest references `icon-192.png` and `icon-512.png`. Create these:

**Quick way:** Use **realfavicongenerator.net**
1. Upload any square image (your company logo)
2. Download the package
3. Extract `android-chrome-192x192.png` → rename to `icon-192.png`
4. Extract `android-chrome-512x512.png` → rename to `icon-512.png`
5. Upload both to your hosting alongside `index.html`

---

## STEP 7 — Share with Engineers

Send your 70 engineers this message (WhatsApp / Email):

```
Team,

We have launched FieldTrack for digital attendance.

🔗 App link: https://YOUR-USERNAME.github.io/fieldtrack/

HOW TO INSTALL ON YOUR PHONE:
• Android: Open in Chrome → tap ⋮ menu → "Add to Home Screen"
• iPhone: Open in Safari → tap Share (□↑) → "Add to Home Screen"

Every day:
✅ Open app → Login with your Employee ID
📷 Capture selfie
📍 Get GPS location
✅ Tap PUNCH IN

At end of day:
📷 Capture selfie again
📍 Get GPS location
🔴 Tap PUNCH OUT

Your manager can view all records in real-time on Google Sheets.
```

---

## STEP 8 — View & Manage Attendance Data

Open your Google Sheet (`FieldTrack – Attendance`):

| Column | Data |
|--------|------|
| A | Server Timestamp (auto) |
| B | Date |
| C | Time |
| D | **IN / OUT** (green/red) |
| E | Employee ID |
| F | Employee Name |
| G | Zone / Location |
| H | Latitude |
| I | Longitude |
| J | GPS Accuracy |
| K | Google Maps Link (click to see location) |
| L | Selfie Link (click to view photo) |
| M | ISO Timestamp |

### Useful Sheet operations:
- **Filter by employee:** Data → Create Filter → filter column E
- **Filter by date:** Filter column B
- **Sort by time:** Sort column A
- **Export for payroll:** File → Download → .xlsx

---

## 🔒 SECURITY NOTES

1. **Restrict Sheet access:** Share the sheet only with your managers (not "Anyone with link")
2. **Keep the Apps Script URL private** — treat it like a password
3. **GPS spoofing:** The app uses `enableHighAccuracy: true`. For additional verification, the Google Maps link lets managers verify location on map.
4. **Selfie verification:** Photos are stored in Google Drive with timestamps in the filename.

---

## 📊 PHASE 2 — TRAVEL DISTANCE & TA CALCULATION

This Phase 1 gives you the foundation. For Phase 2 (Travel Allowance), we will:

1. Add a **"Mark Location"** button engineers tap at each site visit
2. Calculate **Haversine distance** between consecutive GPS coordinates
3. Store waypoints in a separate `Travel_Log` sheet
4. Auto-generate a daily **TA report** (km × rate per km)
5. Build an **Admin Dashboard** (separate web page) showing:
   - Engineer-wise distance traveled
   - TA amount due
   - Map with travel route

Let your manager know when Phase 1 is running smoothly and we'll build Phase 2.

---

## 🛠️ TROUBLESHOOTING

| Problem | Fix |
|---------|-----|
| Camera not opening | Allow camera permission in browser settings |
| GPS not working | Enable Location in phone settings → browser |
| Punch button stays disabled | Must capture BOTH selfie AND GPS first |
| Data not reaching sheet | Re-check APPS_SCRIPT_URL in index.html |
| "Authorization required" on deploy | Re-deploy and authorize again |
| App not installable | Must be served over HTTPS |
| iPhone camera black | Use Safari (not Chrome) on iPhone |

---

## 📞 SUPPORT

For technical issues during deployment, check:
- Apps Script execution logs: **script.google.com → your project → Executions**
- Browser console: Press F12 → Console tab

---

*FieldTrack v1.0 · Built for Digitide Solutions Limited · Tata Power Odisha project*
