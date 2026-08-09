# Pet Detective

Pet Detective is a React game where players match pet clues to families.

## Shared leaderboard (no Firebase)

The app now uses a local Node/Express API with a JSON file for leaderboard data.
This means no Firebase billing is needed.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the API server (terminal 1):

```bash
npm run server
```

3. Start the React app (terminal 2):

```bash
npm run dev
```

The Vite dev server is configured with `host: true` and API proxying to `http://localhost:4000`.

## Play from phone + laptop

1. Keep both devices on the same Wi-Fi network.
2. Start both commands above on your laptop.
3. Open the Vite URL from your laptop IP on your phone (example: `http://192.168.1.20:5173`).

Both phone and laptop will share the same leaderboard file while your server is running.

## Admin controls

Log in as `Ogotlhe` to open the admin portal:

- `Delete User` removes one user.
- `Clear All Users` removes everyone from the leaderboard.
