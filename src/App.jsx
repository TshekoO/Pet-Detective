import { createClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import './App.css'

const PLAYER_NAME_STORAGE_KEY = 'pet-detective-player-name'
const SESSION_ID_STORAGE_KEY = 'pet-detective-session-id'
const ADMIN_NAME = 'Ogotlhe'
const GAME_NAME = 'Pet Detective'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const IS_SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
const supabase = IS_SUPABASE_CONFIGURED ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

const EMPLOYEE_DIRECTORY_ASSETS = [
  {
    name: 'Cilliers',
    familyImage: '/Pet Detective/Cilliers/unclassified/Cilliers.jpg',
    petImage: null,
    funFact: 'Can map a full project plan before the first coffee is finished.',
  },
  {
    name: 'Eugenie',
    familyImage: '/Pet Detective/Eugenie/family.jpeg',
    petImage: '/Pet Detective/Eugenie/pet.jpeg',
  },
  {
    name: 'Frans',
    familyImage: '/Pet Detective/Frans/family.jpeg',
    petImage: '/Pet Detective/Frans/pet.jpeg',
  },
  {
    name: 'Jacqui',
    familyImage: '/Pet Detective/Jacqui/family.jpeg',
    petImage: '/Pet Detective/Jacqui/pet.jpeg',
  },
  {
    name: 'Jaron',
    familyImage: '/Pet Detective/Jaron/family.jpg',
    petImage: '/Pet Detective/Jaron/pet.jpg',
  },
  {
    name: 'Leonie',
    familyImage: '/Pet Detective/Leonie/family.jpg',
    petImage: '/Pet Detective/Leonie/pet.jpg',
  },
  {
    name: 'Marli',
    familyImage: '/Pet Detective/Marli/family.jpg',
    petImage: '/Pet Detective/Marli/pet.jpg',
  },
  {
    name: 'Oelof',
    familyImage: '/Pet Detective/Oelof/family.jpeg',
    petImage: '/Pet Detective/Oelof/pet.png',
  },
  {
    name: 'Ogotlhe',
    familyImage: '/Pet Detective/Ogotlhe/family.jpg',
    petImage: null,
    funFact: 'Can turn a stressful day into laughs in just a few minutes.',
  },
  {
    name: 'Sherilise',
    familyImage: '/Pet Detective/Sherilise/family.jpeg',
    petImage: '/Pet Detective/Sherilise/pet.jpeg',
  },
  {
    name: 'Stefanie',
    familyImage: '/Pet Detective/Stefanie/family.jpeg',
    petImage: '/Pet Detective/Stefanie/pet.jpeg',
  },
]

function mapSessionForUi(session) {
  const startedAtMs = session.started_at ? Date.parse(session.started_at) : null
  const completedAtMs = session.completed_at ? Date.parse(session.completed_at) : null

  return {
    id: session.id,
    name: session.player_name,
    gameName: session.game_name,
    score: Number(session.score ?? 0),
    totalQuestions: Number(session.total_questions ?? 0),
    numberCompleted: Number(session.number_completed ?? 0),
    status: session.status,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    startedAtMs,
    completedAtMs,
    completionDurationMs:
      completedAtMs && startedAtMs ? Math.max(0, completedAtMs - startedAtMs) : Number.POSITIVE_INFINITY,
  }
}

async function fetchGameSessions() {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('game_sessions')
    .select(
      'id, player_name, game_name, score, total_questions, number_completed, status, started_at, completed_at',
    )
    .eq('game_name', GAME_NAME)

  if (error) {
    throw new Error(error.message || 'Could not load leaderboard.')
  }

  return (data ?? []).map(mapSessionForUi)
}

async function fetchAnswersForSession(sessionId) {
  if (!supabase || !sessionId) {
    return []
  }

  const { data, error } = await supabase
    .from('game_answers')
    .select(
      'id, session_id, family_id, family_name, selected_pet_id, correct_pet_id, is_correct, answered_at',
    )
    .eq('session_id', sessionId)
    .order('answered_at', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Could not load player answers.')
  }

  return data ?? []
}

async function createGameSession(playerName, totalQuestions) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      player_name: playerName,
      game_name: GAME_NAME,
      score: 0,
      total_questions: totalQuestions,
      number_completed: 0,
      status: 'playing',
    })
    .select('id, player_name, game_name, score, total_questions, number_completed, status, started_at, completed_at')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Could not start the game session.')
  }

  return mapSessionForUi(data)
}

async function saveGameAnswer({
  sessionId,
  familyId,
  familyName,
  selectedPetId,
  correctPetId,
  isCorrect,
}) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { error } = await supabase.from('game_answers').insert({
    session_id: sessionId,
    family_id: familyId,
    family_name: familyName,
    selected_pet_id: selectedPetId,
    correct_pet_id: correctPetId,
    is_correct: isCorrect,
  })

  if (error) {
    throw new Error(error.message || 'Could not save your answer.')
  }
}

async function updateGameSessionProgress({ sessionId, score, totalQuestions, numberCompleted }) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const isCompleted = numberCompleted >= totalQuestions

  const { error } = await supabase
    .from('game_sessions')
    .update({
      score,
      total_questions: totalQuestions,
      number_completed: numberCompleted,
      status: isCompleted ? 'completed' : 'playing',
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', sessionId)

  if (error) {
    throw new Error(error.message || 'Could not save player progress.')
  }
}

async function deleteSessionById(sessionId) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { error: answersError } = await supabase.from('game_answers').delete().eq('session_id', sessionId)
  if (answersError) {
    throw new Error('Could not delete answer history.')
  }

  const { error: sessionError } = await supabase.from('game_sessions').delete().eq('id', sessionId)
  if (sessionError) {
    throw new Error('Could not delete the user session.')
  }
}

async function clearAllSessions() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.from('game_sessions').select('id').eq('game_name', GAME_NAME)
  if (error) {
    throw new Error('Could not load sessions to clear.')
  }

  const sessionIds = (data ?? []).map((row) => row.id)

  if (sessionIds.length) {
    const { error: answersError } = await supabase.from('game_answers').delete().in('session_id', sessionIds)

    if (answersError) {
      throw new Error('Could not clear answer history.')
    }
  }

  const { error: sessionsError } = await supabase
    .from('game_sessions')
    .delete()
    .eq('game_name', GAME_NAME)

  if (sessionsError) {
    throw new Error('Could not clear users.')
  }
}

function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs)) {
    return 'In progress'
  }

  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function getDetectiveMood(attempts, totalQuestions) {
  if (attempts === 0) {
    return 'Warm up your detective instincts. The first clue is waiting.'
  }

  if (attempts >= totalQuestions) {
    return 'Case closed. The pets have all been matched.'
  }

  const remaining = totalQuestions - attempts

  if (remaining <= 2) {
    return 'Final stretch. Trust your instincts and close the case.'
  }

  if (attempts >= Math.ceil(totalQuestions / 2)) {
    return 'You are on a roll. The mystery board is starting to make sense.'
  }

  return 'The clues are lining up. Keep following the paw prints.'
}

function getFinishTitle(score, totalQuestions) {
  const ratio = totalQuestions ? score / totalQuestions : 0

  if (ratio === 1) {
    return 'Top-tier pet detective.'
  }

  if (ratio >= 0.75) {
    return 'Strong detective work.'
  }

  if (ratio >= 0.5) {
    return 'Solid sleuthing.'
  }

  return 'Case completed.'
}

function App() {
  const [playerName, setPlayerName] = useState(() => {
    const savedName = localStorage.getItem(PLAYER_NAME_STORAGE_KEY)
    return savedName ? savedName.trim() : ''
  })
  const [playerSessionId, setPlayerSessionId] = useState(() => {
    const savedSessionId = localStorage.getItem(SESSION_ID_STORAGE_KEY)
    return savedSessionId ? savedSessionId.trim() : ''
  })
  const [firstNameInput, setFirstNameInput] = useState('')
  const [lastNameInput, setLastNameInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [leaderboard, setLeaderboard] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [selectedSessionAnswers, setSelectedSessionAnswers] = useState([])
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showScorePopup, setShowScorePopup] = useState(false)

  const employeeNames = EMPLOYEE_DIRECTORY_ASSETS.map((entry) => entry.name)

  const habits = [
    'hide in the kitchen when thunder starts',
    'spin in circles when excited',
    'nap in sunny corners after lunch',
    'wake up before everyone else',
    'stare out the window when it rains',
  ]

  const snacks = [
    'salted popcorn',
    'the last slice of pizza',
    'spicy chips',
    'peanut-butter toast',
    'chocolate biscuits',
  ]

  const petEntries = employeeNames.map((name, index) => {
    const habit = habits[index % habits.length]
    const snack = snacks[index % snacks.length]
    const employeeAsset = EMPLOYEE_DIRECTORY_ASSETS[index]
    const hasPetPhoto = Boolean(employeeAsset.petImage)

    return {
      id: index + 1,
      clue: hasPetPhoto
        ? `We both ${habit}, and we both refuse to share ${snack}.`
        : `Fun fact: ${employeeAsset.funFact}`,
      answer: name,
      image: hasPetPhoto ? employeeAsset.petImage : null,
      funFact: employeeAsset.funFact ?? '',
      hasPetPhoto,
    }
  })

  const playerOptions = employeeNames.map((name, index) => ({
    name,
    tone: `tone-${(index % 4) + 1}`,
    image: EMPLOYEE_DIRECTORY_ASSETS[index].familyImage,
  }))

  const [previewChoices, setPreviewChoices] = useState(() =>
    Object.fromEntries(petEntries.map((entry) => [entry.id, ''])),
  )
  const [resultsByPet, setResultsByPet] = useState(() =>
    Object.fromEntries(petEntries.map((entry) => [entry.id, ''])),
  )
  const [currentPetIndex, setCurrentPetIndex] = useState(0)
  const [familySlideIndex, setFamilySlideIndex] = useState(0)

  const currentPet = petEntries[currentPetIndex]
  const currentFamilySlide = playerOptions[familySlideIndex]

  const isAdminUser = playerName.toLowerCase() === ADMIN_NAME.toLowerCase()

  const score = petEntries.reduce((total, entry) => {
    return total + Number(resultsByPet[entry.id] === 'correct')
  }, 0)

  const attempts = petEntries.reduce((total, entry) => {
    return total + Number(Boolean(resultsByPet[entry.id]))
  }, 0)
  const isGameComplete = attempts === petEntries.length
  const progressPercent = Math.round((attempts / Math.max(1, petEntries.length)) * 100)
  const detectiveMood = getDetectiveMood(attempts, petEntries.length)
  const finishTitle = getFinishTitle(score, petEntries.length)

  const rankedLeaderboard = [...leaderboard]
    .filter((entry) => entry.name.toLowerCase() !== ADMIN_NAME.toLowerCase())
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }

      const aIsCompleted = a.status === 'completed'
      const bIsCompleted = b.status === 'completed'

      if (aIsCompleted !== bIsCompleted) {
        return Number(bIsCompleted) - Number(aIsCompleted)
      }

      return a.completionDurationMs - b.completionDurationMs
    })

  const winner = rankedLeaderboard
    .filter((entry) => entry.status === 'completed')
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }

      return a.completionDurationMs - b.completionDurationMs
    })[0]

  const selectedSession = rankedLeaderboard.find((entry) => entry.id === selectedSessionId) ?? null

  const refreshLeaderboard = useCallback(async () => {
    if (!IS_SUPABASE_CONFIGURED) {
      setSyncError('Supabase env vars are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    try {
      const nextLeaderboard = await fetchGameSessions()
      setLeaderboard(nextLeaderboard)
      setSyncError('')
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not sync leaderboard.')
    }
  }, [])

  const refreshSelectedSessionAnswers = useCallback(async (sessionId) => {
    if (!sessionId || !IS_SUPABASE_CONFIGURED) {
      setSelectedSessionAnswers([])
      return
    }

    setIsLoadingAnswers(true)

    try {
      const answers = await fetchAnswersForSession(sessionId)
      setSelectedSessionAnswers(answers)
      setSyncError('')
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not load player answers.')
    } finally {
      setIsLoadingAnswers(false)
    }
  }, [])

  useEffect(() => {
    refreshLeaderboard()

    if (selectedSessionId) {
      refreshSelectedSessionAnswers(selectedSessionId)
    }

    const syncTimer = window.setInterval(refreshLeaderboard, isAdminUser ? 2000 : 6000)

    return () => {
      window.clearInterval(syncTimer)
    }
  }, [isAdminUser, refreshLeaderboard, refreshSelectedSessionAnswers, selectedSessionId])

  useEffect(() => {
    if (!isAdminUser || !IS_SUPABASE_CONFIGURED || !supabase) {
      return
    }

    const channel = supabase
      .channel('pet-detective-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () => {
        refreshLeaderboard()
        if (selectedSessionId) {
          refreshSelectedSessionAnswers(selectedSessionId)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_answers' }, () => {
        refreshLeaderboard()
        if (selectedSessionId) {
          refreshSelectedSessionAnswers(selectedSessionId)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdminUser, refreshLeaderboard, refreshSelectedSessionAnswers, selectedSessionId])

  useEffect(() => {
    if (!playerName || isAdminUser || playerSessionId || !IS_SUPABASE_CONFIGURED) {
      return
    }

    let isActive = true

    async function restoreSessionAfterRefresh() {
      setIsSaving(true)

      try {
        const session = await createGameSession(playerName, petEntries.length)

        if (!isActive) {
          return
        }

        setPlayerSessionId(session.id)
        localStorage.setItem(SESSION_ID_STORAGE_KEY, session.id)
        setSyncError('')
      } catch (error) {
        if (!isActive) {
          return
        }

        setSyncError(error instanceof Error ? error.message : 'Could not start the game session.')
      } finally {
        if (isActive) {
          setIsSaving(false)
        }
      }
    }

    restoreSessionAfterRefresh()

    return () => {
      isActive = false
    }
  }, [isAdminUser, petEntries.length, playerName, playerSessionId])

  useEffect(() => {
    if (isGameComplete && !isAdminUser) {
      setShowScorePopup(true)
      return
    }

    setShowScorePopup(false)
  }, [isAdminUser, isGameComplete])

  async function handleDeleteUser(sessionId, name) {
    if (!window.confirm(`Delete ${name} from the leaderboard?`)) {
      return
    }

    try {
      await deleteSessionById(sessionId)

      if (selectedSessionId === sessionId) {
        setSelectedSessionId('')
        setSelectedSessionAnswers([])
      }

      await refreshLeaderboard()
      setSyncError('')
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not delete the user.')
    }
  }

  async function handleClearUsers() {
    if (!window.confirm('Clear all users from the leaderboard?')) {
      return
    }

    try {
      await clearAllSessions()
      setLeaderboard([])
      setSelectedSessionId('')
      setSelectedSessionAnswers([])
      setSyncError('')
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not clear users.')
    }
  }

  async function handleConfirmSelection() {
    const selectedFamily = currentFamilySlide.name

    setPreviewChoices((current) => ({ ...current, [currentPet.id]: selectedFamily }))

    const isCorrect = selectedFamily === currentPet.answer

    setResultsByPet((current) => ({
      ...current,
      [currentPet.id]: isCorrect ? 'correct' : 'wrong',
    }))

    if (!playerSessionId || !IS_SUPABASE_CONFIGURED || isAdminUser) {
      return
    }

    const nextResultsByPet = {
      ...resultsByPet,
      [currentPet.id]: isCorrect ? 'correct' : 'wrong',
    }

    const nextScore = petEntries.reduce((total, entry) => {
      return total + Number(nextResultsByPet[entry.id] === 'correct')
    }, 0)

    const nextCompleted = petEntries.reduce((total, entry) => {
      return total + Number(Boolean(nextResultsByPet[entry.id]))
    }, 0)

    setIsSaving(true)

    try {
      await saveGameAnswer({
        sessionId: playerSessionId,
        familyId: currentPet.id,
        familyName: currentPet.answer,
        selectedPetId: selectedFamily,
        correctPetId: currentPet.answer,
        isCorrect,
      })

      await updateGameSessionProgress({
        sessionId: playerSessionId,
        score: nextScore,
        totalQuestions: petEntries.length,
        numberCompleted: nextCompleted,
      })

      setSyncError('')
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not sync leaderboard.')
    } finally {
      setIsSaving(false)
    }
  }

  function moveCarousel(step) {
    setFamilySlideIndex((current) => {
      const total = playerOptions.length
      return (current + step + total) % total
    })
  }

  function goToSlide(index) {
    setFamilySlideIndex(index)
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()

    const trimmedFirstName = firstNameInput.trim()
    const trimmedLastName = lastNameInput.trim()
    const isAdminLogin = trimmedFirstName.toLowerCase() === ADMIN_NAME.toLowerCase() && !trimmedLastName
    const trimmedName = isAdminLogin ? trimmedFirstName : `${trimmedFirstName} ${trimmedLastName}`.trim()

    if (!trimmedFirstName || (!trimmedLastName && !isAdminLogin)) {
      setLoginError('Please enter your first name and last name to continue.')
      return
    }

    if (!IS_SUPABASE_CONFIGURED) {
      setLoginError('Missing Supabase setup. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    setIsSaving(true)

    try {
      if (trimmedName.toLowerCase() === ADMIN_NAME.toLowerCase()) {
        setPlayerSessionId('')
        localStorage.removeItem(SESSION_ID_STORAGE_KEY)
      } else {
        const session = await createGameSession(trimmedName, petEntries.length)
        setPlayerSessionId(session.id)
        localStorage.setItem(SESSION_ID_STORAGE_KEY, session.id)
      }

      setSyncError('')
      setPlayerName(trimmedName)
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmedName)
      setLoginError('')
      setFirstNameInput('')
      setLastNameInput('')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not start the game session.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleLogout() {
    setPlayerName('')
    setPlayerSessionId('')
    setSelectedSessionId('')
    setSelectedSessionAnswers([])
    setFirstNameInput('')
    setLastNameInput('')
    setLoginError('')
    setShowScorePopup(false)
    localStorage.removeItem(PLAYER_NAME_STORAGE_KEY)
    localStorage.removeItem(SESSION_ID_STORAGE_KEY)
  }

  if (!playerName) {
    return (
      <main className="login-shell">
        <section className="login-card" aria-label="User login">
          <p className="hero-kicker">Pet Detective</p>
          <h1>Login</h1>
          <p className="login-summary">
            Enter your first name and last name to capture your details.
          </p>

          <form className="login-form" onSubmit={handleLoginSubmit}>
            <label htmlFor="player-first-name" className="login-label">
              First name
            </label>
            <input
              id="player-first-name"
              name="firstName"
              type="text"
              className="login-input"
              value={firstNameInput}
              onChange={(event) => setFirstNameInput(event.target.value)}
              placeholder="Type your first name"
              autoComplete="given-name"
            />

            <label htmlFor="player-last-name" className="login-label">
              Last name
            </label>
            <input
              id="player-last-name"
              name="lastName"
              type="text"
              className="login-input"
              value={lastNameInput}
              onChange={(event) => setLastNameInput(event.target.value)}
              placeholder="Type your last name"
              autoComplete="family-name"
            />

            {loginError ? <p className="login-error">{loginError}</p> : null}

            <button type="submit" className="login-button">
              Login
            </button>
          </form>
          {isSaving ? <p className="sync-note">Starting your game session...</p> : null}
        </section>
      </main>
    )
  }

  if (isAdminUser) {
    return (
      <main className="page-shell">
        <header className="hero-banner">
          <p className="hero-kicker">Admin Portal</p>
          <h1>User Leaderboard</h1>
          <p className="hero-summary">
            Rankings are ordered by highest score. Ties are resolved by fastest completion time.
          </p>
          <div className="session-bar" role="status" aria-live="polite">
            <span>Signed in as {playerName}</span>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="leaderboard-panel" aria-label="User leaderboard">
          <div className="admin-toolbar">
            <button type="button" className="danger-button" onClick={handleClearUsers}>
              Clear All Users
            </button>
            {syncError ? <p className="sync-error">{syncError}</p> : null}
          </div>

          {winner ? (
            <p className="top-scorer-line">
              Winner: <strong>{winner.name}</strong> with <strong>{winner.score}</strong> /{' '}
              {winner.totalQuestions} in <strong>{formatDuration(winner.completionDurationMs)}</strong>
            </p>
          ) : (
            <p className="top-scorer-line">No completed players yet.</p>
          )}

          {rankedLeaderboard.length ? (
            <ol className="leaderboard-list">
              {rankedLeaderboard.map((entry) => (
                <li
                  key={entry.id}
                  className={entry.id === selectedSessionId ? 'leaderboard-item selected' : 'leaderboard-item'}
                >
                  <div className="leaderboard-row-top">
                    <button
                      type="button"
                      className="session-select-button"
                      onClick={() => setSelectedSessionId(entry.id)}
                    >
                      <span className="leaderboard-name">{entry.name}</span>
                    </button>
                    <span className="leaderboard-score">
                      {entry.score} / {entry.totalQuestions}
                    </span>
                  </div>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={entry.totalQuestions}
                    aria-valuenow={entry.numberCompleted ?? 0}
                    aria-label={`${entry.name} selection progress`}
                  >
                    <span
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, ((entry.numberCompleted ?? 0) / Math.max(1, entry.totalQuestions)) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="progress-caption">
                    {entry.numberCompleted ?? 0} / {entry.totalQuestions} selections ({entry.status})
                  </span>
                  {entry.status === 'completed' ? (
                    <span className="progress-caption">
                      Completion time: {formatDuration(entry.completionDurationMs)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="danger-button danger-button-inline"
                    onClick={() => handleDeleteUser(entry.id, entry.name)}
                  >
                    Delete User
                  </button>
                </li>
              ))}
            </ol>
          ) : null}

          {selectedSession ? (
            <section className="answer-detail-panel" aria-label="Selected player answers">
              <h2>{selectedSession.name} answer history</h2>
              <p className="progress-caption">Session: {selectedSession.id}</p>
              {isLoadingAnswers ? <p className="progress-caption">Loading answers...</p> : null}
              {!isLoadingAnswers && selectedSessionAnswers.length === 0 ? (
                <p className="progress-caption">No answers recorded yet.</p>
              ) : null}
              {!isLoadingAnswers && selectedSessionAnswers.length ? (
                <ul className="answer-detail-list">
                  {selectedSessionAnswers.map((answer) => (
                    <li key={answer.id}>
                      <strong>Family #{answer.family_id}</strong> ({answer.family_name})
                      <br />
                      Selected: {answer.selected_pet_id}
                      <br />
                      Correct: {answer.correct_pet_id}
                      <br />
                      Result: {answer.is_correct ? 'Correct' : 'Incorrect'}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell">
      {showScorePopup ? (
        <div className="score-popup-backdrop" role="presentation">
          <section className="score-popup" role="dialog" aria-modal="true" aria-labelledby="score-popup-title">
            <p className="score-popup-kicker">Case closed</p>
            <h2 id="score-popup-title">{finishTitle}</h2>
            <p className="score-popup-text">You finished Pet Detective.</p>
            <p className="score-popup-score">
              Final score: <strong>{score} / {petEntries.length}</strong>
            </p>
            <button type="button" className="confirm-button score-popup-button" onClick={() => setShowScorePopup(false)}>
              See results
            </button>
          </section>
        </div>
      ) : null}

      <header className="hero-banner">
        <p className="hero-kicker">Community Competition</p>
        <h1>Match a Pet</h1>
        <p className="hero-summary">
          Entries are collected by email. This page is the play system for participants to match
          each numbered pet and clue to the correct owner.
        </p>
        <div className="session-bar" role="status" aria-live="polite">
          <span>Signed in as {playerName}</span>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="playful-strip" aria-label="Game progress highlights">
        <article className="playful-card playful-card-accent">
          <p className="playful-card-kicker">Current mission</p>
          <h2>Follow the paw prints</h2>
          <p>{detectiveMood}</p>
        </article>
        <article className="playful-card">
          <p className="playful-card-kicker">Pawgress</p>
          <strong>{attempts} of {petEntries.length}</strong>
          <p>{progressPercent}% of the case file is complete.</p>
        </article>
        <article className="playful-card playful-card-warm">
          <p className="playful-card-kicker">Prize energy</p>
          <strong>{isGameComplete ? finishTitle : 'Pet Detective title is still in play.'}</strong>
          <p>{isGameComplete ? `Your score is locked in at ${score} out of ${petEntries.length}.` : 'Every good guess moves you closer to the crown.'}</p>
        </article>
      </section>

      <section className="panel-grid" aria-label="Game instructions">
        <article className="info-panel">
          <h2>How to play</h2>
          <ol>
            <li>Read each numbered clue and look at the matching pet photo.</li>
            <li>Select who you think owns each pet.</li>
            <li>Make sure you match the pets and families as quickly as you can.</li>
          </ol>
        </article>

        <article className="info-panel">
          <h2>Reminder</h2>
          <ol>
            <li>Photos are submitted outside this app via email.</li>
            <li>The trickier the clues, the more fun the detective round.</li>
            <li>The highest score 1st wins the Pet Detective title.</li>
          </ol>
        </article>

        <article className="info-panel highlight-panel">
          <h2>Game board</h2>
          <div className="game-board">
            <article className="pet-card" key={currentPet.id}>
              <div className="case-header">
                <p className="case-kicker">Case file #{currentPet.id}</p>
                <p className="case-hint">Match the pet with the right family.</p>
              </div>

              <div className="pet-and-family-layout">
                <div className="pet-media">
                  {currentPet.hasPetPhoto ? (
                    <img src={currentPet.image} alt={`Pet photo for ${currentPet.answer}`} />
                  ) : (
                    <div className="fun-fact-card" role="note" aria-label="Fun fact">
                      <p className="fun-fact-kicker">Fun Fact</p>
                      <p className="fun-fact-text">{currentPet.funFact}</p>
                    </div>
                  )}
                </div>

                <aside className="family-carousel-panel" aria-label="Family image carousel">
                  <div className="slideshow-container" aria-label="Family slideshow">
                    <div className="mySlides fade">
                      <div className="numbertext">
                        {familySlideIndex + 1} / {playerOptions.length}
                      </div>
                      <button
                        type="button"
                        className="slide-image-button"
                        onClick={() => moveCarousel(1)}
                        aria-label="Show next family"
                      >
                        <img
                          src={currentFamilySlide.image}
                          alt={currentFamilySlide.name}
                          className="carousel-family-image"
                        />
                      </button>
                      <div className="text">{currentFamilySlide.name}</div>
                    </div>

                    <button
                      type="button"
                      className="prev"
                      onClick={() => moveCarousel(-1)}
                      aria-label="Show previous family"
                    >
                      ❮
                    </button>
                    <button
                      type="button"
                      className="next"
                      onClick={() => moveCarousel(1)}
                      aria-label="Show next family"
                    >
                      ❯
                    </button>
                  </div>

                  <div className="dot-row" aria-label="Choose family slide">
                    {playerOptions.map((option, index) => (
                      <button
                        type="button"
                        key={option.name}
                        className={index === familySlideIndex ? 'dot active' : 'dot'}
                        onClick={() => goToSlide(index)}
                        aria-label={`Show ${option.name}`}
                      />
                    ))}
                  </div>
                </aside>
              </div>

              <p className="pet-clue">{currentPet.clue}</p>

              <button
                type="button"
                className="confirm-button"
                onClick={handleConfirmSelection}
              >
                Confirm selection
              </button>

              {resultsByPet[currentPet.id] ? (
                <p
                  className={
                    resultsByPet[currentPet.id] === 'correct' ? 'result-chip correct' : 'result-chip wrong'
                  }
                >
                  Clue logged
                </p>
              ) : null}
            </article>

            <p className="selection-count">
              Confirmed selections: {attempts} / {petEntries.length}
            </p>
            <p className="selection-count">
              Pet {currentPet.id} of {petEntries.length}
            </p>

            <div className="round-nav" aria-label="Pet navigation">
              <button
                type="button"
                className="secondary"
                onClick={() => setCurrentPetIndex((value) => Math.max(0, value - 1))}
                disabled={currentPetIndex === 0}
              >
                Previous
              </button>
              <span className="round-nav-spacer" aria-hidden="true" />
              <button
                type="button"
                className="secondary"
                onClick={() => setCurrentPetIndex((value) => Math.min(petEntries.length - 1, value + 1))}
                disabled={currentPetIndex === petEntries.length - 1}
              >
                Next
              </button>
            </div>

            <div className="pet-jump-list" aria-label="Quick pet jump">
              {petEntries.map((entry, index) => (
                <button
                  type="button"
                  key={entry.id}
                  className={index === currentPetIndex ? 'dot active' : 'dot'}
                  onClick={() => setCurrentPetIndex(index)}
                  aria-label={`Open pet ${entry.id}`}
                />
              ))}
            </div>
          </div>
          <p className="score-line">
            {isGameComplete ? `Score: ${score} / ${petEntries.length}` : 'Score will be revealed when you finish.'}
          </p>
        </article>
      </section>

      <section className="closing-banner" aria-label="Closing message">
        <p>
          Remember, there is a prize to be won and the satisfaction of being crowned
          <span> Pet Detective.</span>
        </p>
        {isGameComplete ? (
          <p className="sync-note" role="status" aria-live="polite">
            {finishTitle} You finished the game with a final score of {score} / {petEntries.length}.
          </p>
        ) : null}
        {isSaving ? <p className="sync-note">Saving your score...</p> : null}
        {syncError ? <p className="sync-error">{syncError}</p> : null}
      </section>
    </main>
  )
}

export default App
