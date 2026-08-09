# Pet Detective

Pet Detective is a React game where players match pet clues to families.

## Supabase progress tracking

The app uses Supabase PostgreSQL + Realtime to track player sessions and answers.

### What is tracked

- Unique game session per player login (UUID, not player name)
- Player name and game name (`Pet Detective`)
- Score, progress count, total questions
- Session status (`playing` / `completed`)
- Start and completion timestamps
- Every confirmed answer (family, selected pet, correct pet, correctness, answer time)

### Database setup

1. Create a Supabase project (free tier is enough).
2. Open the SQL Editor and run [supabase/schema.sql](supabase/schema.sql).
3. In Supabase, copy your project URL and anon key.

### Environment variables

Create a `.env` file from [.env.example](.env.example):

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the React app:

```bash
npm run dev
```

The local Node API (`npm run server`) is no longer required for leaderboard storage.

## Play from phone + laptop

1. Keep both devices on the same Wi-Fi network.
2. Start `npm run dev` on your laptop.
3. Open the Vite URL from your laptop IP on your phone (example: `http://192.168.1.20:5173`).

Both phone and laptop will share the same Supabase-backed leaderboard and progress.

## Admin controls

Log in as `Ogotlhe` to open the admin portal:

- `Delete User` removes one player session and its answers.
- `Clear All Users` removes all player sessions and answers.
- Click a player to view detailed answer history.
- Winner is calculated automatically: highest score, then fastest completion time.

## Realtime updates

Admin leaderboard and answer details update automatically through Supabase Realtime when players submit answers.

## Deploy to Vercel

Add these environment variables in Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy.

## Security note

The included RLS policies allow anon read/write for this game data so browser clients can work without Supabase Auth.
For stronger production security, add Supabase Auth and tighten policies per authenticated role.
