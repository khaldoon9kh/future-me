# FutureMe – Setup Guide

**FutureMe** is a React Native + Expo app that acts as a personal "reminder + action inbox" for links shared from TikTok, Instagram, YouTube, browsers, or any other app.

---

## Table of contents

1. [Project structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Running in Expo Go (limited)](#running-in-expo-go-limited)
5. [EAS Build — required for share intent](#eas-build--required-for-share-intent)
6. [Share intent — how it works](#share-intent--how-it-works)
7. [Notifications setup](#notifications-setup)
8. [Assets](#assets)
9. [Data model](#data-model)
10. [Screens overview](#screens-overview)
11. [Troubleshooting](#troubleshooting)

---

## Project structure

```
future-me/
├── App.js                         # Root component, share-intent + notification wiring
├── app.json                       # Expo config + native plugins
├── eas.json                       # EAS Build profiles
├── babel.config.js
├── index.js                       # Entry point
├── assets/                        # Icons & splash (replace placeholders!)
├── scripts/
│   └── generate-assets.py        # Script to regenerate placeholder PNGs
└── src/
    ├── navigation/
    │   └── AppNavigator.js        # Stack + bottom-tab navigator
    ├── screens/
    │   ├── HomeScreen.js          # Main inbox with filters
    │   ├── QuickAddScreen.js      # Add / edit item (modal)
    │   ├── ItemDetailsScreen.js   # View, edit, delete item
    │   └── SettingsScreen.js      # Permissions, stats, data management
    ├── components/
    │   ├── ItemCard.js            # Card shown in the list
    │   ├── FilterTabs.js          # Horizontal filter tab bar
    │   └── EmptyState.js          # Empty list illustration
    ├── services/
    │   ├── notificationService.js # Expo Notifications wrapper
    │   └── shareIntentService.js  # Normalises expo-share-intent payloads
    ├── storage/
    │   └── storageService.js      # AsyncStorage CRUD helpers
    └── utils/
        ├── dateUtils.js           # Date formatting & comparisons
        └── urlUtils.js            # URL normalisation & platform detection
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| npm / yarn | any recent | bundled with Node |
| Expo CLI | latest | `npm install -g expo-cli` |
| EAS CLI | latest | `npm install -g eas-cli` |
| Expo account | free | https://expo.dev/signup |
| Android Studio | latest (for Android) | https://developer.android.com/studio |
| Xcode | ≥ 15 (for iOS, macOS only) | App Store |

---

## Installation

```bash
# 1. Clone / enter the project
cd future-me

# 2. Install dependencies
npm install

# 3. (Optional) Regenerate placeholder assets
python3 scripts/generate-assets.py
```

---

## Running in Expo Go (limited)

> **Important:** `expo-share-intent` requires a custom native build and **will not work** in standard Expo Go. The app will still launch and all features except receiving shared links from other apps will function normally.

```bash
npx expo start
```

Then scan the QR code with the Expo Go app on your device.

---

## EAS Build — required for share intent

The share-intent feature (receiving links from TikTok, Instagram, etc.) uses `expo-share-intent` which adds native code (an iOS Share Extension and Android intent filters). This requires either:

- **EAS Build** (recommended — cloud build, no local toolchain needed)
- **`expo prebuild`** (local bare workflow)

### Option A — EAS Build (recommended)

```bash
# 1. Log in to your Expo account
eas login

# 2. Link or create an EAS project
eas init

# 3. Update app.json → expo.extra.eas.projectId with your real project ID

# 4. Build a development client for your device
eas build --profile development --platform android   # Android
eas build --profile development --platform ios       # iOS

# 5. Install the resulting .apk / .ipa on your device

# 6. Start the local dev server (the custom build connects to it)
npx expo start --dev-client
```

### Option B — Local bare workflow

```bash
npx expo prebuild            # generates ios/ and android/ native folders
npx expo run:android         # build & launch on Android
npx expo run:ios             # build & launch on iOS (macOS only)
```

---

## Share intent — how it works

### Android

The plugin adds the following `<intent-filter>` to `AndroidManifest.xml`:

```xml
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="text/*" />
</intent-filter>
```

When the user taps **Share → FutureMe** in any Android app, the OS launches FutureMe with the URL/text in the intent extras. `expo-share-intent` reads this and exposes it via the `useShareIntentContext` hook.

### iOS

The plugin adds a **Share Extension** target to the Xcode project. When the user taps the Share sheet in any iOS app and selects FutureMe, the extension captures the URL/text and passes it to the main app via app groups.

The `NSExtensionActivationRules` in `app.json` control what content types are accepted:
- `NSExtensionActivationSupportsWebURLWithMaxCount: 1` — URLs
- `NSExtensionActivationSupportsWebPageWithMaxCount: 1` — web pages
- `NSExtensionActivationSupportsText: true` — plain text

---

## Notifications setup

Notifications are requested automatically on first launch. If the user denies permission:

- Go to **Settings → Notifications** inside the app
- Or go to the device's system settings and enable notifications for FutureMe

Local notifications are scheduled via `expo-notifications` and fire at the exact `reminderDateTime` set on a reminder item. Tapping a notification navigates directly to the corresponding item.

**Android:** A `reminders` notification channel is created on first permission grant. It uses `HIGH` importance with vibration.

**Simulator/emulator note:** Scheduled local notifications work on iOS Simulator. Android emulator support depends on the emulator version — physical devices are more reliable.

---

## Assets

The `assets/` folder currently contains auto-generated purple placeholder PNGs. Replace them with your own artwork before submitting to app stores:

| File | Recommended size | Purpose |
|------|-----------------|---------|
| `icon.png` | 1024 × 1024 | App icon (iOS + Android) |
| `splash.png` | 1242 × 2436 | Launch screen |
| `adaptive-icon.png` | 512 × 512 | Android adaptive icon foreground |
| `favicon.png` | 32 × 32 | Web favicon |

To regenerate the purple placeholders:
```bash
python3 scripts/generate-assets.py
```

---

## Data model

Each saved item is stored as a JSON object in AsyncStorage:

```js
{
  id: string,              // auto-generated (timestamp + random)
  url: string,             // full URL including scheme
  title: string,           // user-supplied or auto-detected
  actionType: string,      // 'reminder' | 'bookmark' | 'send_later' | 'other'
  reminderDateTime: string | null,  // ISO 8601, only for 'reminder'
  notificationId: string | null,    // expo-notifications scheduled ID
  recipientName: string,   // only for 'send_later'
  notes: string,           // free-form private note
  createdAt: string,       // ISO 8601 creation timestamp
  completed: boolean,      // whether the item has been acted on
}
```

All items are stored under the AsyncStorage key `@future_me:items` as a JSON array, newest first.

---

## Screens overview

### Home (Inbox)
- Displays all saved items with filter tabs (All / Reminders / Bookmarks / Send Later / Other)
- Active items appear above completed items
- Tap **+** to manually add an item
- Pull to refresh
- Overdue reminders show a red "Overdue" chip; same-day reminders show "Today"

### Quick Add (modal)
- Opened automatically when a link is shared into the app from another app
- Also opened manually via the **+** button on Home
- Fields: URL, Title, Action type (grid picker), Reminder date+time, Recipient name, Notes
- Handles both **create** (new item) and **edit** (existing item) modes

### Item Details
- Full view of a saved item
- Tappable URL card opens the link in the default browser
- Edit button → navigates back to Quick Add in edit mode
- Mark Done / Mark Active toggle
- Delete with confirmation (also cancels any scheduled notification)

### Settings
- Stats card (total / active / reminders / done count)
- Notification permission toggle
- Clear completed items
- Clear all data
- How-to-use tips

---

## Troubleshooting

**Share sheet doesn't show FutureMe**
→ You must install a custom build (EAS Build or `expo run`). Expo Go does not support share extensions.

**Notifications not appearing**
→ Check permission in device Settings. On iOS Simulator, ensure notifications are enabled in the simulated device's Settings app.

**App crashes on start**
→ Make sure you ran `npm install` and all peer deps are satisfied. Check the Metro bundler console for the specific error.

**Date picker not showing on Android**
→ The date/time pickers show sequentially on Android (date first, then time). Tap the date button on the Quick Add screen and follow the prompts.

**`expo-share-intent` version mismatch**
→ This project uses `expo-share-intent ^2.2.1` targeting Expo SDK 52. If you upgrade Expo, check the package's changelog for the matching version.
