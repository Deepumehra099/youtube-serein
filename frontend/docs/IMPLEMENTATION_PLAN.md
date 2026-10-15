# Serein implementation plan

The Expo app and backend remain separate. The mobile client will use the backend for first-party accounts/videos and the official YouTube API/player only for permitted discovery and playback.

## 1. Platform foundation

- Centralize colors, type, spacing, radii, and component dimensions.
- Add persisted Dark, Light, and System theme selection and apply it to every route.
- Wire secure session restore at app startup and add working register/login/logout screens.
- Make routing reflect actual availability: authentication-gate account-only actions and provide real empty, retry, and loading states.

## 2. Core viewer journeys

- Combine paginated first-party feed results with clearly identified YouTube discovery results.
- Add debounced search and result state, channel screens, and a functional notification center.
- Add first-party watch history, saved/liked lists, comments, follow/unfollow, report, and share actions.
- Keep YouTube playback inside its official embedded player; preserve provider controls and explain when a video disallows embedding.

## 3. Creator journeys

- Add media selection, metadata entry, visibility, upload progress, retries, and publish confirmation backed by the existing API.
- Add creator video management and basic server-provided analytics/moderation views only where API support exists.
- Avoid claiming unsupported thumbnail, transcoding, email recovery, playlist, and production storage functionality.

## 4. Quality and delivery

- Reuse Expo-compatible modules already installed; add no dependency unless the SDK 57 documentation and package compatibility support it.
- Verify backend route tests, Expo typecheck, Expo config, and a real Metro Android bundle; report sandbox-specific APK/export limits accurately.
- Keep local SQLite/media clearly scoped to a developer demo. Production readiness requires managed PostgreSQL, object storage/CDN, transcoding, recovery email, backups, monitoring, and deployment controls.
