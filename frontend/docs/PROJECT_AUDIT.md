# Project audit

Audit date: 2026-10-15

## Repository layout and license

The active workspace contains the Expo mobile client in `frontend/` and the first-party Node API in `backend/`. The previous Kotlin Multiplatform project and its root AGPL-3.0 license have been removed. `frontend/LICENSE` is Expo's MIT license notice; it does not by itself select a license for Serein's own code. Both app packages are private and have no project license selected.

## Mobile client

- Expo SDK 57, React Native 0.86, React 19, TypeScript, Expo Router, npm.
- Routes cover Home, Shorts, Following, Library, Watch, Settings, Feedback, and Notifications. The visual style is being rebuilt around the independent Serein identity.
- Home can query YouTube Data API v3 when an `EXPO_PUBLIC_YOUTUBE_API_KEY` is configured, otherwise it shows a small explicit sample set. That key is bundled into the app and is public; restrict it in Google Cloud.
- YouTube playback uses the official embedded player in `react-native-webview`. Native WebView playback identifies Serein (`com.deepumehra.serein`) through its Referer base URL and matching player origin to avoid Error 153.
- `src/services/api.ts` and `src/context/AppProvider.tsx` exist. The API client covers basic feed/search/comments, and the auth context supports register/login/logout plus secure token storage, but the context has not yet been wired into the root layout or screens.
- No unified design tokens/theme provider exists yet. Screens still contain scattered styles, and dark/light/system persistence is not implemented.

## First-party backend

- Node.js 24.15+, built-in HTTP server, `node:sqlite`, npm; no third-party runtime dependencies.
- SQLite migrations define users, sessions, videos, comments, likes, saves, subscriptions, history, notifications, and reports, with feed and ownership indexes.
- Routes support account registration/login/logout, profile read/update, public feeds/search, channels/following, video metadata CRUD and MP4/WebM media streaming, comments, likes, saves, reports, notifications, and admin moderation.
- Passwords are scrypt hashed. Session tokens are revocable server-side and have an expiry. Admin access is enforced on the backend and can be bootstrapped with an environment allowlist.
- Storage is local disk with a 50 MiB default upload cap. This is for development/single-host demos, not production-scale storage/CDN.
- Password reset/email delivery, thumbnail uploads, playlists, replies, upload transcoding/HLS, production object storage, and a PostgreSQL deployment are not implemented.

## Known issues and security

- The backend is not yet connected to the app screens, so sign-in, first-party feeds, upload, reactions, and library actions are not usable from the mobile client yet.
- The YouTube API key is an Expo public variable by design and must be restricted; never place a server secret in an `EXPO_PUBLIC_*` variable.
- The initial player route accepted any video ID shape; validate YouTube IDs before constructing embed URLs and provide an external-player fallback for private or non-embeddable videos.
- Expo route screens still have placeholder functionality in some areas. Do not present UI-only actions as working.
- Local media and SQLite need durable managed storage, backups, quotas, scanning, and delivery controls before real multi-user deployment.
- The original KMP app embeds previously configured YouTube/Firebase credentials. Rotate/restrict those credentials in their provider consoles; deleting them from a new revision does not revoke old builds.

## Baseline

- Expo TypeScript check passes after the latest UI and player updates.
- Expo Android Metro bundle returned HTTP 200 on ports 8082 and 8083.
- Static Android export with Hermes bytecode failed in this Windows sandbox with `spawn EPERM`; the no-bytecode retry was stopped after cache deserialization problems. This is not equivalent to a tested APK build.
- Original KMP Android build fails before compilation on the installed Java runtime `26.0.1`; use a compatible JDK to build that separate app.
