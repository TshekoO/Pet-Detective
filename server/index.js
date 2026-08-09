import cors from 'cors'
import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const PORT = Number(process.env.PORT) || 4000
const ADMIN_NAME = 'ogotlhe'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataFilePath = path.join(__dirname, 'data', 'leaderboard.json')

app.use(cors())
app.use(express.json())

async function ensureDataFile() {
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true })

  try {
    await fs.access(dataFilePath)
  } catch {
    await fs.writeFile(dataFilePath, '[]', 'utf8')
  }
}

function normalizeEntry(entry) {
  return {
    name: String(entry.name || '').trim(),
    bestScore: Number(entry.bestScore || 0),
    attempts: Number(entry.attempts || 0),
    completed: Boolean(entry.completed),
    achievedAt: Number(entry.achievedAt || Date.now()),
  }
}

async function readLeaderboard() {
  await ensureDataFile()
  const raw = await fs.readFile(dataFilePath, 'utf8')

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map(normalizeEntry)
      .filter((entry) => entry.name && entry.name.toLowerCase() !== ADMIN_NAME)
  } catch {
    return []
  }
}

async function writeLeaderboard(entries) {
  await ensureDataFile()
  await fs.writeFile(dataFilePath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
}

app.get('/api/leaderboard', async (_request, response) => {
  const leaderboard = await readLeaderboard()
  response.json(leaderboard)
})

app.put('/api/leaderboard/:name', async (request, response) => {
  const name = String(request.params.name || '').trim()

  if (!name) {
    response.status(400).json({ error: 'Player name is required.' })
    return
  }

  const score = Number(request.body?.score || 0)
  const attempts = Number(request.body?.attempts || 0)
  const totalPets = Math.max(1, Number(request.body?.totalPets || 1))

  const leaderboard = await readLeaderboard()
  const existingEntry = leaderboard.find((entry) => entry.name.toLowerCase() === name.toLowerCase())

  const bestScore = existingEntry ? Math.max(existingEntry.bestScore, score) : score
  const achievedAt =
    !existingEntry || score > existingEntry.bestScore ? Date.now() : existingEntry.achievedAt

  const updatedEntry = {
    name,
    bestScore,
    attempts,
    completed: attempts >= totalPets,
    achievedAt,
  }

  const withoutCurrent = leaderboard.filter((entry) => entry.name.toLowerCase() !== name.toLowerCase())
  const nextLeaderboard = [...withoutCurrent, updatedEntry]

  await writeLeaderboard(nextLeaderboard)
  response.json({ leaderboard: nextLeaderboard })
})

app.delete('/api/leaderboard/:name', async (request, response) => {
  const name = String(request.params.name || '').trim().toLowerCase()

  if (!name) {
    response.status(400).json({ error: 'Player name is required.' })
    return
  }

  const leaderboard = await readLeaderboard()
  const nextLeaderboard = leaderboard.filter((entry) => entry.name.toLowerCase() !== name)

  await writeLeaderboard(nextLeaderboard)
  response.json({ leaderboard: nextLeaderboard })
})

app.delete('/api/leaderboard', async (_request, response) => {
  await writeLeaderboard([])
  response.json({ leaderboard: [] })
})

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Pet Detective API running on http://localhost:${PORT}`)
})
