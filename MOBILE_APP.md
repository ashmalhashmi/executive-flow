# Executive Flow — Mobile App (Capacitor)

Apni web app ko **native app shell** (Android / iOS) mein wrap karein — bina Java/Swift se poori app likhe.

## Option A — Bundled app (recommended)

Web app build phone ke andar bundle hoti hai — deploy ke baad bhi chalegi.

### Requirements

- Node.js 18+
- [Android Studio](https://developer.android.com/studio) (Android APK)
- Mac + Xcode (sirf iOS ke liye)

### Steps

```bash
cd executive-flow

# 1. Dependencies
npm install

# 2. Capacitor (pehli dafa)
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# 3. Web build
npm run build

# 4. Add platforms (pehli dafa)
npx cap add android
npx cap add ios

# 5. Sync web files into native project
npm run cap:sync

# 6. Open in Android Studio / Xcode
npm run cap:android
# npm run cap:ios
```

Android Studio se **Run** dabayein — app install ho jayegi.

Har web change ke baad:

```bash
npm run build
npm run cap:sync
```

---

## Option B — Remote URL (live website wrap)

Agar app hamesha aapki **hosted URL** load kare (jaise wrapper):

1. `capacitor.config.json` mein `server` add karein:

```json
"server": {
  "url": "https://your-deployed-executive-flow.com",
  "cleartext": true
}
```

2. `npm run cap:sync` → native project dubara open karein.

**Local dev on phone (same WiFi):**

```json
"url": "http://192.168.1.XXX:5173",
"cleartext": true
```

`npm run dev` PC par chalao, phone app URL load karegi.

---

## Responsiveness

- Mobile: hamburger menu + full-width layout
- Safe areas: notch / home indicator (iPhone)
- Calendar, modals, dashboard mobile-friendly

Browser test: Chrome DevTools → Toggle device toolbar → iPhone / Pixel.

---

## Scripts (package.json)

| Command | Kaam |
|---------|------|
| `npm run build` | Production web build → `dist/` |
| `npm run cap:sync` | `dist` → Android/iOS copy |
| `npm run cap:android` | Android Studio open |
| `npm run cap:ios` | Xcode open (Mac only) |

---

## Publish

- **Android:** Android Studio → Build → Generate Signed Bundle/APK  
- **iOS:** Xcode → Archive → App Store Connect  

Pehle `npm run build` zaroor chalayein.
