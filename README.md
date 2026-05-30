# ⚡ LinkedIn Experience Calculator

A Chrome extension that automatically calculates total work experience from any LinkedIn profile.

---

## What it does

Opens on any LinkedIn profile and instantly shows:

- **Total Experience** — calculated from earliest job start date to today
- **Career Started** — when they started their first job
- **Number of Roles** — total roles detected
- **Timeline** — list of recent roles

### Smart Alerts

| Result | Meaning |
|--------|---------|
| ✅ Normal widget | Active profile with valid experience |
| 💀 **DEAD CONTACT** | No current "Present" role found — person may be between jobs |
| 💀 **DEAD CONTACT** | Total experience exceeds 39 yrs 11 mos |
| ⚡⚡ **DUAL CONTACT** | Person is currently working 2 or more jobs simultaneously |

---

## How to Install

1. Download this repository as a ZIP — click **Code → Download ZIP**
2. Unzip the folder on your computer
3. Open Chrome and go to `chrome://extensions/`
4. Enable **Developer Mode** (toggle in top right corner)
5. Click **"Load unpacked"**
6. Select the unzipped folder
7. Done! Open any LinkedIn profile and the widget appears automatically ✅

---

## How it Works

- Opens any LinkedIn profile → `linkedin.com/in/username/`
- Extension automatically reads the **Experience section only**
- Calculates: **Earliest Job Start Date → Today = Total Experience**
- Works on `/details/experience/` page too (expanded view)
- Detects **Present** roles to show Dead Contact or Dual Contact alerts

---

## Example

For a profile with:
- Job 1: Sep 2013 → Present
- Job 2: Feb 2018 → Oct 2019

**Result:** Career Started Sep 2013, Total Experience = ~12 yrs 8 mos ✅

---

## Files

| File | Description |
|------|-------------|
| `manifest.json` | Chrome extension config |
| `content.js` | Main logic — reads LinkedIn and calculates experience |
| `styles.css` | Widget styling |
| `icons/` | Extension icons |

---

## Built With

- Vanilla JavaScript
- Chrome Extensions API (Manifest V3)
- No external libraries or dependencies

---

## Note

> This extension reads only the **Experience section** of LinkedIn profiles.
> It does not collect, store, or send any data anywhere.
> All calculations happen locally in your browser.
