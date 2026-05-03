import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const leagues = [
  { id: 1, name: 'LCK (Corea)', slug: 'lck' },
  { id: 2, name: 'LEC (Europa)', slug: 'lec' },
  { id: 3, name: 'LCS (Norteamérica)', slug: 'lcs' },
  { id: 4, name: 'LJL (Japón)', slug: 'ljl' },
  { id: 5, name: 'LCK (España)', slug: 'lsl' },
  { id: 6, name: 'CBLOL (Brasil)', slug: 'cblol' },
  { id: 7, name: 'LLA (Latinoamérica)', slug: 'lla' },
  { id: 8, name: 'Worlds', slug: 'worlds' },
];

function App() {
  const [matches, setMatches] = useState([]);
  const [leaguesData, setLeaguesData] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeagues();
    fetchMatches();
  }, [selectedLeague, selectedDate, filter]);

  async function fetchLeagues() {
    try {
      const response = await fetch(`${API_URL}/api/leagues`);
      const data = await response.json();
      setLeaguesData(data);
    } catch (err) {
      console.error('Error fetching leagues:', err);
    }
  }

  async function fetchMatches() {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/api/matches?limit=100';

      if (filter === 'upcoming') {
        endpoint = '/api/matches/upcoming?limit=50';
      } else if (filter === 'past') {
        endpoint = '/api/matches/past?limit=50';
      }

      const response = await fetch(`${API_URL}${endpoint}`);
      if (!response.ok) throw new Error('Error al cargar partidos');
      let data = await response.json();

      if (selectedLeague) {
        data = data.filter(m => m.league_id === selectedLeague || m.league?.id === selectedLeague);
      }

      data = data.filter(m => {
        const matchDate = new Date(m.begin_at).toDateString();
        return matchDate === selectedDate.toDateString();
      });

      setMatches(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateHeader(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function getScore(match) {
    if (!match.results || match.results.length < 2) return null;
    const team1 = match.opponents[0]?.team;
    const team2 = match.opponents[1]?.team;
    const score1 = match.results.find(r => r.team_id === team1?.id)?.score ?? 0;
    const score2 = match.results.find(r => r.team_id === team2?.id)?.score ?? 0;
    return { score1, score2 };
  }

  function generateCalendarDays() {
    const days = [];
    const today = new Date();
    for (let i = -3; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  }

  return (
    <div className="min-h-screen bg-[#1a3a1a] text-white font-sans">
      <header className="bg-[#2E7D32] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#2E7D32] font-bold text-xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Promiedos<span className="text-[#a5d6a7]">LoL</span>
            </h1>
          </div>
          <div className="text-sm text-green-100">
            Resultados de League of Legends
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-56 bg-[#1e3d1e] min-h-screen border-r border-[#388E3C] hidden md:block">
          <div className="p-3">
            <h3 className="text-xs font-semibold text-green-300 uppercase tracking-wider mb-2">Ligas</h3>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => setSelectedLeague(null)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                    selectedLeague === null 
                      ? 'bg-[#4CAF50] text-white font-medium' 
                      : 'hover:bg-[#388E3C] text-green-100'
                  }`}
                >
                  Todas las ligas
                </button>
              </li>
              {leagues.map(league => (
                <li key={league.id}>
                  <button
                    onClick={() => setSelectedLeague(league.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                      selectedLeague === league.id 
                        ? 'bg-[#4CAF50] text-white font-medium' 
                        : 'hover:bg-[#388E3C] text-green-100'
                    }`}
                  >
                    {league.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 border-t border-[#388E3C]">
            <h3 className="text-xs font-semibold text-green-300 uppercase tracking-wider mb-2">Accesos</h3>
            <ul className="space-y-0.5">
              <li>
                <button 
                  onClick={() => setSelectedDate(new Date())}
                  className="w-full text-left px-3 py-2 rounded text-sm hover:bg-[#388E3C] text-green-100 transition"
                >
                  Partidos de Hoy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setSelectedDate(tomorrow);
                  }}
                  className="w-full text-left px-3 py-2 rounded text-sm hover:bg-[#388E3C] text-green-100 transition"
                >
                  Próximos Partidos
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setFilter('past')}
                  className="w-full text-left px-3 py-2 rounded text-sm hover:bg-[#388E3C] text-green-100 transition"
                >
                  Resultados
                </button>
              </li>
            </ul>
          </div>
        </aside>

        <main className="flex-1 p-4">
          <div className="bg-[#234d23] rounded-lg p-4 mb-4 border border-[#388E3C]">
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'live', label: 'En Vivo' },
                { key: 'upcoming', label: 'Próximos' },
                { key: 'finished', label: 'Finalizados' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition ${
                    filter === f.key 
                      ? 'bg-[#4CAF50] text-white' 
                      : 'bg-[#1e3d1e] hover:bg-[#388E3C] text-green-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1">
              {generateCalendarDays().map((date, idx) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = date.toDateString() === selectedDate.toDateString();
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 w-12 h-14 rounded flex flex-col items-center justify-center text-xs transition ${
                      isSelected 
                        ? 'bg-[#4CAF50] text-white' 
                        : isToday 
                          ? 'bg-[#81C784] text-[#1a3a1a] font-bold'
                          : 'bg-[#1e3d1e] hover:bg-[#388E3C] text-green-100'
                    }`}
                  >
                    <span className="text-[10px]">{date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                    <span className="text-lg font-bold">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#234d23] rounded-lg p-4 border border-[#388E3C]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#4CAF50] rounded-full"></span>
              Partidos del {formatDateHeader(selectedDate.toISOString())}
            </h2>

            {loading && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[#4CAF50] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {error && (
              <div className="text-center py-8 text-red-300 bg-red-900/20 rounded-lg p-4">
                {error}
              </div>
            )}

            {!loading && !error && matches.length === 0 && (
              <div className="text-center py-8 text-green-200 bg-[#1e3d1e]/50 rounded-lg">
                No hay partidos programados para esta fecha
              </div>
            )}

            <div className="space-y-2">
              {matches.map(match => {
                const score = getScore(match);
                const isLive = match.status === 'running';
                const isFinished = match.status === 'finished';

                return (
                  <div 
                    key={match.id} 
                    className={`bg-[#1e3d1e] rounded-lg p-3 flex items-center justify-between border-l-4 ${
                      isLive ? 'border-green-400' : isFinished ? 'border-gray-500' : 'border-[#4CAF50]'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-green-300">{match.league?.name || 'Liga'}</span>
                        <span className="text-[9px] text-green-400/70 truncate max-w-[80px]">{match.tournament?.name || ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-[3]">
                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <span className="font-medium text-sm text-right truncate">{match.opponents[0]?.team?.name || 'TBD'}</span>
                        {match.opponents[0]?.team?.image_url && (
                          <img src={match.opponents[0].team.image_url} alt="" className="w-8 h-8 rounded-full border border-green-600" />
                        )}
                      </div>

                      <div className="text-center min-w-[70px]">
                        {isFinished && score ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xl font-bold ${score.score1 > score.score2 ? 'text-[#4CAF50]' : 'text-white'}`}>
                              {score.score1}
                            </span>
                            <span className="text-green-400">-</span>
                            <span className={`text-xl font-bold ${score.score2 > score.score1 ? 'text-[#4CAF50]' : 'text-white'}`}>
                              {score.score2}
                            </span>
                          </div>
                        ) : isLive ? (
                          <span className="text-green-400 font-bold text-xs bg-green-900/50 px-2 py-0.5 rounded animate-pulse">EN VIVO</span>
                        ) : (
                          <span className="text-[#81C784] font-bold text-sm">{formatTime(match.begin_at)}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                        {match.opponents[1]?.team?.image_url && (
                          <img src={match.opponents[1].team.image_url} alt="" className="w-8 h-8 rounded-full border border-green-600" />
                        )}
                        <span className="font-medium text-sm text-left truncate">{match.opponents[1]?.team?.name || 'TBD'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      <footer className="bg-[#1e3d1e] text-center py-4 text-green-300 text-sm border-t border-[#388E3C] mt-4">
        <p>PromiedosLoL - Resultados de League of Legends</p>
      </footer>
    </div>
  );
}

export default App;