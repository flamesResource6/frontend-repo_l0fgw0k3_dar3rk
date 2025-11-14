import { useEffect, useMemo, useRef, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function useApi() {
  const base = API
  return {
    async ensureSeed() {
      await fetch(`${base}/seed`, { method: 'POST' })
    },
    async createPlayer(username) {
      const res = await fetch(`${base}/player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      return res.json()
    },
    async getCards() {
      const res = await fetch(`${base}/cards`)
      return res.json()
    },
    async startMatch(player_id) {
      const res = await fetch(`${base}/match/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id })
      })
      return res.json()
    },
    async deploy(match_id, card_id, lane) {
      const res = await fetch(`${base}/match/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id, card_id, lane })
      })
      return res.json()
    },
    async tick(match_id) {
      const res = await fetch(`${base}/match/tick/${match_id}`, { method: 'POST' })
      return res.json()
    },
    async getState(match_id) {
      const res = await fetch(`${base}/match/state/${match_id}`)
      return res.json()
    }
  }
}

function Card({ card, onPlay }) {
  return (
    <button
      onClick={onPlay}
      className="flex flex-col items-center justify-center gap-1 bg-white/90 hover:bg-white text-gray-800 rounded-lg shadow px-3 py-2 border border-gray-200"
    >
      <span className="text-xs font-bold bg-purple-600 text-white rounded px-1">{card.cost}</span>
      <span className="text-xs font-semibold">{card.name}</span>
      <span className="text-[10px] text-gray-500">{card.role}</span>
    </button>
  )
}

function Arena({ state }) {
  // simple 3 lanes with x from 0 -> 10
  return (
    <div className="relative w-full h-64 bg-green-200 rounded-lg border border-green-400 overflow-hidden">
      {/* lanes */}
      <div className="absolute inset-x-0 top-1/3 h-0.5 bg-green-500/40"></div>
      <div className="absolute inset-x-0 top-2/3 h-0.5 bg-green-500/40"></div>
      {/* towers */}
      {state?.towers?.map((t, idx) => (
        <div key={idx} className={`absolute ${t.side === 'player' ? 'left-2' : 'right-2'} ${t.lane==='left'?'top-6': t.lane==='right'?'top-[9.5rem]':'top-28'} w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${t.side==='player'?'bg-blue-500 text-white':'bg-red-500 text-white'}`}>
          {t.hp}
        </div>
      ))}
      {/* units */}
      {state?.units?.map((u, i) => (
        <div key={i} className={`absolute top-0 left-0 translate-x-[${(u.x/10)*100}%] ${u.lane===0?'top-4':u.lane===1?'top-28':'top-[11.5rem]'} w-6 h-6 rounded-full border-2 ${u.owner==='player'?'bg-blue-200 border-blue-600':'bg-red-200 border-red-600'}`}></div>
      ))}
    </div>
  )
}

function App() {
  const api = useApi()
  const [username, setUsername] = useState('Player')
  const [player, setPlayer] = useState(null)
  const [cards, setCards] = useState([])
  const [match, setMatch] = useState(null)
  const [state, setState] = useState(null)
  const [elixir, setElixir] = useState(5)
  const tickRef = useRef(null)

  useEffect(() => {
    (async () => {
      await api.ensureSeed()
      const { cards } = await api.getCards()
      setCards(cards)
    })()
  }, [])

  useEffect(() => {
    if (!match) return
    // polling tick
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = setInterval(async () => {
      await api.tick(match.match_id)
      const s = await api.getState(match.match_id)
      setState(s)
      setElixir(s?.elixir ? Math.round(s.elixir*10)/10 : 0)
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [match])

  const start = async () => {
    const p = await api.createPlayer(username)
    setPlayer(p)
    const m = await api.startMatch(p.player_id)
    setMatch(m)
    setState(m.state)
    setElixir(m.state.elixir)
  }

  const playCard = async (card) => {
    if (!match) return
    try {
      await api.deploy(match.match_id, card.card_id, 1)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Battle Arena+</h1>
            <span className="text-xs text-gray-500">API: {API}</span>
          </div>
          <div className="flex items-center gap-2">
            <input value={username} onChange={e=>setUsername(e.target.value)} className="px-3 py-2 rounded border text-sm" />
            <button onClick={start} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">Start Match</button>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <Arena state={state} />
            <div className="flex items-center justify-between bg-white rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Elixir</span>
                <div className="w-48 h-2 bg-gray-200 rounded">
                  <div className="h-2 bg-purple-600 rounded" style={{ width: `${(elixir||0)/10*100}%` }}></div>
                </div>
                <span className="text-sm font-mono">{(elixir||0).toFixed(1)}/10</span>
              </div>
              <div className="text-sm text-gray-600">Time: {state?.time ?? 0}s</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 bg-purple-50 border border-purple-200 p-2 rounded-lg">
              {cards?.map((c) => (
                <Card key={c._id} card={c} onPlay={() => playCard(c)} />
              ))}
            </div>
            <div className="bg-white border rounded-lg p-3 text-sm">
              <h3 className="font-semibold mb-2">How to play</h3>
              <ol className="list-decimal pl-4 space-y-1 text-gray-600">
                <li>Click Start Match to begin.</li>
                <li>Click a card to deploy it to the center lane.</li>
                <li>Units advance and damage opposing towers when they reach the end.</li>
                <li>Elixir regenerates over time. Try different cards.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
