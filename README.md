**Prerequisites:** Node.js, `uv`, Python 3.14

1. Install dependencies: `npm install`
2. Create `.env` (see `.env.example`) and set `GEMINI_API_KEY`
3. Run the app (starts the API server + Vite): `npm run dev`

Notes:
- The Gemini API key is read by the local server (`backend/server.py`) and is not bundled into the browser app.
- Backend Python env is managed via `uv` (see `backend/README.md`).
