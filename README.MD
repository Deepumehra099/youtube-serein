# Serein video app

This workspace contains the Expo mobile client and its Node.js API.

## Start the backend

```powershell
cd backend
npm install
npm start
```

The API listens on port 8000. Backend environment options are documented in `backend/.env.example`.

## Admin access

Create a Serein account first. Then promote it from the backend folder:

```powershell
cd backend
npm run admin:promote -- your-email@example.com
```

Sign out and back in on the app. Admins can review reports, moderate videos, and disable or restore user accounts from Settings → Admin panel.

## Start the Expo client

Open a second terminal:

```powershell
cd frontend
npm install
npx expo start --lan --port 8082
```

Set `EXPO_PUBLIC_API_URL` in `frontend/.env` to the backend's LAN address when testing on a physical phone, for example `http://192.168.1.8:8000`.

The SQLite database and uploaded media live under `backend/data` and `backend/media`.
