import { useEffect, useState } from 'react'
import './App.css'

const PLAYER_NAME_STORAGE_KEY = 'pet-detective-player-name'
const LEADERBOARD_STORAGE_KEY = 'pet-detective-leaderboard'
const ADMIN_NAME = 'Ogotlhe'

function getStoredLeaderboard() {
  const storedLeaderboard = localStorage.getItem(LEADERBOARD_STORAGE_KEY)

  if (!storedLeaderboard) {
    return []
  }

  try {
    const parsed = JSON.parse(storedLeaderboard)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function leaderboardChanged(currentLeaderboard, nextLeaderboard) {
  return JSON.stringify(currentLeaderboard) !== JSON.stringify(nextLeaderboard)
}

function App() {
  const [playerName, setPlayerName] = useState(() => {
    const savedName = localStorage.getItem(PLAYER_NAME_STORAGE_KEY)
    return savedName ? savedName.trim() : ''
  })
  const [nameInput, setNameInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [leaderboard, setLeaderboard] = useState(() => getStoredLeaderboard())

  const employeeNames = [
    'Mpho Family',
    'Kagiso Family',
    'Dineo Family',
    'Thato Family',
    'Lerato Family',
    'Neo Family',
    'Palesa Family',
    'Tumelo Family',
    'Naledi Family',
    'Boitumelo Family',
    'Lesego Family',
    'Tshepo Family',
    'Karabo Family',
    'Refilwe Family',
    'Katlego Family',
    'Keitumetse Family',
    'Onthatile Family',
    'Ayanda Family',
    'Lungile Family',
    'Siyabonga Family',
  ]

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

    return {
      id: index + 1,
      clue: `We both ${habit}, and we both refuse to share ${snack}.`,
      answer: name,
      image: `/placeholders/pet-${(index % 4) + 1}.svg`,
    }
  })

  const playerOptions = employeeNames.map((name, index) => ({
    name,
    tone: `tone-${(index % 4) + 1}`,
    image: [
      '/placeholders/family-mpho.svg',
      '/placeholders/family-kagiso.svg',
      '/placeholders/family-dineo.svg',
      '/placeholders/family-thato.svg',
    ][index % 4],
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

  const rankedLeaderboard = [...leaderboard]
    .filter((entry) => entry.name.toLowerCase() !== ADMIN_NAME.toLowerCase())
    .sort((a, b) => {
      if (b.bestScore !== a.bestScore) {
        return b.bestScore - a.bestScore
      }

      return a.achievedAt - b.achievedAt
    })

  const topScorer = rankedLeaderboard[0]

  useEffect(() => {
    if (!isAdminUser) {
      return
    }

    function refreshLeaderboardFromStorage() {
      const nextLeaderboard = getStoredLeaderboard()

      setLeaderboard((current) => {
        if (!leaderboardChanged(current, nextLeaderboard)) {
          return current
        }

        return nextLeaderboard
      })
    }

    function handleStorageChange(event) {
      if (event.key === LEADERBOARD_STORAGE_KEY) {
        refreshLeaderboardFromStorage()
      }
    }

    refreshLeaderboardFromStorage()
    window.addEventListener('storage', handleStorageChange)
    const syncTimer = window.setInterval(refreshLeaderboardFromStorage, 1500)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.clearInterval(syncTimer)
    }
  }, [isAdminUser])

  useEffect(() => {
    if (!playerName || isAdminUser || attempts === 0) {
      return
    }

    setLeaderboard((current) => {
      const existingEntry = current.find(
        (entry) => entry.name.toLowerCase() === playerName.toLowerCase(),
      )

      const bestScore = existingEntry ? Math.max(existingEntry.bestScore, score) : score
      const achievedAt =
        !existingEntry || score > existingEntry.bestScore ? Date.now() : existingEntry.achievedAt

      const updatedEntry = {
        name: playerName,
        bestScore,
        attempts,
        completed: attempts === petEntries.length,
        achievedAt,
      }

      const withoutCurrentUser = current.filter(
        (entry) => entry.name.toLowerCase() !== playerName.toLowerCase(),
      )

      const nextLeaderboard = [...withoutCurrentUser, updatedEntry]
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(nextLeaderboard))
      return nextLeaderboard
    })
  }, [attempts, isAdminUser, petEntries.length, playerName, score])

  function handleSelection(entryId, value) {
    setPreviewChoices((current) => ({ ...current, [entryId]: value }))
  }

  function handleConfirmSelection() {
    const selectedFamily = previewChoices[currentPet.id]

    if (!selectedFamily) {
      return
    }

    const isCorrect = selectedFamily === currentPet.answer

    setResultsByPet((current) => ({
      ...current,
      [currentPet.id]: isCorrect ? 'correct' : 'wrong',
    }))
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

  function handleLoginSubmit(event) {
    event.preventDefault()

    const trimmedName = nameInput.trim()

    if (!trimmedName) {
      setLoginError('Please enter your name to continue.')
      return
    }

    setPlayerName(trimmedName)
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmedName)
    setLoginError('')
    setNameInput('')
  }

  function handleLogout() {
    setPlayerName('')
    setNameInput('')
    setLoginError('')
    localStorage.removeItem(PLAYER_NAME_STORAGE_KEY)
  }

  if (!playerName) {
    return (
      <main className="login-shell">
        <section className="login-card" aria-label="User login">
          <p className="hero-kicker">Pet Detective</p>
          <h1>Login</h1>
          <p className="login-summary">
            Enter your name to capture your details and continue into the software.
          </p>

          <form className="login-form" onSubmit={handleLoginSubmit}>
            <label htmlFor="player-name" className="login-label">
              Your name
            </label>
            <input
              id="player-name"
              name="playerName"
              type="text"
              className="login-input"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Type your name"
              autoComplete="name"
            />

            {loginError ? <p className="login-error">{loginError}</p> : null}

            <button type="submit" className="login-button">
              Login
            </button>
          </form>
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
            Rankings are ordered from highest score. The first user with the top score wins.
          </p>
          <div className="session-bar" role="status" aria-live="polite">
            <span>Signed in as {playerName}</span>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="leaderboard-panel" aria-label="User leaderboard">
          {topScorer ? (
            <p className="top-scorer-line">
              1st Place: <strong>{topScorer.name}</strong> with <strong>{topScorer.bestScore}</strong>{' '}
              / {petEntries.length}
            </p>
          ) : (
            <p className="top-scorer-line">No user scores recorded yet.</p>
          )}

          {rankedLeaderboard.length ? (
            <ol className="leaderboard-list">
              {rankedLeaderboard.map((entry) => (
                <li key={entry.name}>
                  <div className="leaderboard-row-top">
                    <span className="leaderboard-name">{entry.name}</span>
                    <span className="leaderboard-score">
                      {entry.bestScore} / {petEntries.length}
                    </span>
                  </div>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={petEntries.length}
                    aria-valuenow={entry.attempts ?? 0}
                    aria-label={`${entry.name} selection progress`}
                  >
                    <span
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, ((entry.attempts ?? 0) / petEntries.length) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="progress-caption">
                    {entry.attempts ?? 0} / {petEntries.length} selections
                    {entry.completed ? ' (Complete)' : ' (In progress)'}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell">
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

      <section className="panel-grid" aria-label="Game instructions">
        <article className="info-panel">
          <h2>How to play</h2>
          <ol>
            <li>Read each numbered clue and look at the matching pet photo.</li>
            <li>Select who you think owns each pet.</li>
            <li>Check your answers and compare your score with others.</li>
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
              <div className="pet-and-family-layout">
                <div className="pet-media">
                  <img src={currentPet.image} alt={`Placeholder for pet ${currentPet.id}`} />
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

                  <button
                    type="button"
                    className="secondary pick-family-button"
                    onClick={() => handleSelection(currentPet.id, currentFamilySlide.name)}
                  >
                    Select {currentFamilySlide.name}
                  </button>
                </aside>
              </div>

              <p className="pet-clue">{currentPet.clue}</p>

              <button
                type="button"
                className="confirm-button"
                onClick={handleConfirmSelection}
                disabled={!previewChoices[currentPet.id]}
              >
                Confirm selection
              </button>

              {resultsByPet[currentPet.id] ? (
                <p
                  className={
                    resultsByPet[currentPet.id] === 'correct'
                      ? 'result-chip correct'
                      : 'result-chip wrong'
                  }
                >
                  {resultsByPet[currentPet.id] === 'correct'
                    ? 'Answer Correct'
                    : 'Oh Incorrect'}
                </p>
              ) : null}
            </article>

            <p className="selection-count">
              Confirmed selections: {attempts} / {petEntries.length}
            </p>
            <p className="selection-count">Pet {currentPet.id} of {petEntries.length}</p>

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
                onClick={() =>
                  setCurrentPetIndex((value) => Math.min(petEntries.length - 1, value + 1))
                }
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
                >
                  {entry.id}
                </button>
              ))}
            </div>
          </div>
          <p className="score-line">Score: {score} / {petEntries.length}</p>
        </article>
      </section>

      <section className="closing-banner" aria-label="Closing message">
        <p>
          Remember, there is a prize to be won and the satisfaction of being crowned
          <span> Pet Detective.</span>
        </p>
      </section>
    </main>
  )
}

export default App
