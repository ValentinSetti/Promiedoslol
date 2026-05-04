import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const leagues = [
  { id: 293, name: 'LCK', slug: 'lck' },
  { id: 4197, name: 'LEC', slug: 'lec' },
  { id: 4198, name: 'LCS', slug: 'lcs' },
  { id: 294, name: 'LPL', slug: 'lpl' },
  { id: 302, name: 'CBLOL', slug: 'cblol' },
  { id: 5351, name: 'LCP', slug: 'lcp' },
];

function App() {
  const [matches, setMatches] = useState([]);
  const [leaguesData, setLeaguesData] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState('finished');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leagueStandingsMatches, setLeagueStandingsMatches] = useState([]);
  const [viewMode, setViewMode] = useState('partidos');

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
      let endpoint = '/api/matches?limit=10';

      if (filter === 'live') {
        endpoint = '/api/matches?status=running&limit=50';
      }

      if (selectedLeague) {
        endpoint += `&league_id=${selectedLeague}`;
      }

      if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        endpoint += `&date=${year}-${month}-${day}`;
      }

      const response = await fetch(`${API_URL}${endpoint}`);
      if (!response.ok) throw new Error('Error al cargar partidos');
      let data = await response.json();

      data = data.filter(m => m.opponents && m.opponents.length >= 2 && m.opponents[0]?.opponent && m.opponents[1]?.opponent);

      setMatches(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMatchesForStandings(leagueId) {
    try {
      // Try to fetch tournaments to get the current one; if that fails, fallback to deriving tournament from matches
      const limit = 500;
      let tournaments = [];
      try {
        const tournamentsResp = await fetch(`${API_URL}/api/tournaments?league_id=${leagueId}`);
        if (tournamentsResp.ok) {
          tournaments = await tournamentsResp.json();
        }
      } catch (e) {
        // ignore and fallback
      }

      const matchesResp = await fetch(`${API_URL}/api/matches?league_id=${leagueId}&status=finished&limit=${limit}`);
      if (!matchesResp.ok) throw new Error('Error fetching league matches for standings');
      let data = await matchesResp.json();

      // If we have tournaments data, try pick the active or most recent tournament
      const now = new Date();
      let chosenTournamentId = null;
      if (tournaments && tournaments.length > 0) {
        let currentTournament = tournaments.find(t => t.begin_at && t.end_at && new Date(t.begin_at) <= now && new Date(t.end_at) >= now);
        if (!currentTournament) {
          currentTournament = tournaments.slice().sort((a, b) => new Date(b.begin_at) - new Date(a.begin_at))[0];
        }
        if (currentTournament && currentTournament.id) chosenTournamentId = currentTournament.id;
      }

      // If we couldn't determine a tournament, choose the tournament_id that appears most in the fetched matches
      if (!chosenTournamentId) {
        const counts = {};
        data.forEach(m => {
          if (m.tournament_id) counts[m.tournament_id] = (counts[m.tournament_id] || 0) + 1;
        });
        const entries = Object.entries(counts);
        if (entries.length > 0) {
          entries.sort((a, b) => b[1] - a[1]);
          chosenTournamentId = parseInt(entries[0][0], 10);
        }
      }

      if (chosenTournamentId) {
        data = data.filter(m => m.tournament_id === chosenTournamentId);
      }

      setLeagueStandingsMatches(data);
    } catch (err) {
      console.error('Error fetching matches for standings:', err);
      setLeagueStandingsMatches([]);
    }
  }

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateTime(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hour}:${minute}`;
  }

  function formatDateHeader(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function getScore(match) {
    if (!match.results || match.results.length < 2) return null;
    const team1 = match.opponents[0]?.opponent;
    const team2 = match.opponents[1]?.opponent;
    if (!team1 || !team2) return null;
    const score1 = match.results.find(r => r.team_id === team1.id)?.score ?? 0;
    const score2 = match.results.find(r => r.team_id === team2.id)?.score ?? 0;
    return { score1, score2 };
  }

  function calculateStandings(matches) {
    const teams = {};
    matches.forEach(match => {
      if (match.status !== 'finished' || !match.results || match.results.length < 2) return;
      const team1 = match.opponents[0]?.opponent;
      const team2 = match.opponents[1]?.opponent;
      if (!team1 || !team2) return;
      
      const score1 = match.results.find(r => r.team_id === team1.id)?.score ?? 0;
      const score2 = match.results.find(r => r.team_id === team2.id)?.score ?? 0;
      
      if (!teams[team1.id]) {
        teams[team1.id] = { id: team1.id, name: team1.name, image_url: team1.image_url, wins: 0, losses: 0, games: 0 };
      }
      if (!teams[team2.id]) {
        teams[team2.id] = { id: team2.id, name: team2.name, image_url: team2.image_url, wins: 0, losses: 0, games: 0 };
      }
      
      teams[team1.id].games++;
      teams[team2.id].games++;
      
      if (score1 > score2) {
        teams[team1.id].wins++;
        teams[team2.id].losses++;
      } else if (score2 > score1) {
        teams[team2.id].wins++;
        teams[team1.id].losses++;
      }
    });
    
    return Object.values(teams).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      // desempate por porcentaje de victorias (win rate)
      const rateA = a.games > 0 ? a.wins / a.games : 0;
      const rateB = b.games > 0 ? b.wins / b.games : 0;
      if (rateB !== rateA) return rateB - rateA;
      // finalmente por nombre
      return a.name.localeCompare(b.name);
    });
  }

  useEffect(() => {
    if (selectedLeague) {
      fetchMatchesForStandings(selectedLeague);
    } else {
      setLeagueStandingsMatches([]);
    }
  }, [selectedLeague]);

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

  function groupMatchesByLeague(matches) {
    const grouped = {};
    matches.forEach(match => {
      const leagueName = match.league?.name || 'Otra';
      if (!grouped[leagueName]) {
        grouped[leagueName] = [];
      }
      grouped[leagueName].push(match);
    });
    return grouped;
  }

  const leagueOrder = ['LCK', 'LEC', 'LCS', 'LPL', 'CBLOL', 'LCP', 'Americas Cup', 'First Stand', 'Worlds', 'MSI'];

  function sortLeagues(leagueNames) {
    return leagueNames.sort((a, b) => {
      const indexA = leagueOrder.indexOf(a);
      const indexB = leagueOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
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
                  onClick={() => setFilter('finished')}
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

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 1);
                  setSelectedDate(newDate);
                }}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1e3d1e] hover:bg-[#388E3C] text-green-100 flex items-center justify-center text-2xl font-bold transition"
              >
                ‹
              </button>
              
              <div className="text-center">
                {selectedDate.toDateString() === new Date().toDateString() ? (
                  <span className="text-xl font-bold text-[#4CAF50]">HOY</span>
                ) : (
                  <span className="text-xl font-bold text-white">
                    {selectedDate.getDate().toString().padStart(2, '0')}/
                    {(selectedDate.getMonth() + 1).toString().padStart(2, '0')}
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 1);
                  setSelectedDate(newDate);
                }}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1e3d1e] hover:bg-[#388E3C] text-green-100 flex items-center justify-center text-2xl font-bold transition"
              >
                ›
              </button>
            </div>
          </div>

          {selectedLeague ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-[#234d23] rounded-lg p-4 border border-[#388E3C]">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#4CAF50] rounded-full"></span>
                  {leagues.find(l => l.id === selectedLeague)?.name || 'Liga'}
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

                {!loading && !error && (
                  <div className="bg-[#1e3d1e] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#2E7D32] text-white">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Equipo</th>
                        <th className="px-3 py-2 text-center">PJ</th>
                        <th className="px-3 py-2 text-center">G</th>
                        <th className="px-3 py-2 text-center">P</th>
                        <th className="px-3 py-2 text-center">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateStandings(selectedLeague ? leagueStandingsMatches : matches).map((team, idx) => (
                        <tr key={team.id} className="border-b border-[#388E3C] hover:bg-[#234d23]">
                          <td className="px-3 py-2 text-[#4CAF50] font-bold">{idx + 1}</td>
                          <td className="px-3 py-2 flex items-center gap-2">
                            {team.image_url && (
                              <img src={team.image_url} alt="" className="w-6 h-6 rounded-full" />
                            )}
                            <span className="text-white">{team.name}</span>
                          </td>
                          <td className="px-3 py-2 text-center text-green-100">{team.games}</td>
                          <td className="px-3 py-2 text-center text-[#4CAF50]">{team.wins}</td>
                          <td className="px-3 py-2 text-center text-red-300">{team.losses}</td>
                          <td className="px-3 py-2 text-center text-green-100">
                            {team.games > 0 ? Math.round((team.wins / team.games) * 100) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>

              <div className="bg-[#234d23] rounded-lg p-4 border border-[#388E3C]">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#4CAF50] rounded-full"></span>
                  Partidos
                </h2>

                {!loading && !error && matches.length === 0 && (
                  <div className="text-center py-8 text-green-200 bg-[#1e3d1e]/50 rounded-lg">
                    No hay partidos
                  </div>
              )}

              <div className="space-y-3">
              {(() => {
                const grouped = groupMatchesByLeague(matches);
                const sortedLeagueNames = sortLeagues(Object.keys(grouped));
                return sortedLeagueNames.map(leagueName => (
                  <div key={leagueName}>
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#388E3C]">
                      <span className="text-sm font-bold text-[#4CAF50] uppercase tracking-wider">{leagueName}</span>
                      <span className="text-xs text-green-400 bg-[#1e3d1e] px-2 py-0.5 rounded">{grouped[leagueName].length}</span>
                    </div>
                    <div className="space-y-2">
                      {grouped[leagueName].map(match => {
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
                            <div className="flex items-center gap-3 flex-[3]">
                              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                <span className="font-medium text-sm text-right truncate">{match.opponents[0]?.opponent?.name || 'TBD'}</span>
                                {match.opponents[0]?.opponent?.image_url && (
                                  <img src={match.opponents[0].opponent.image_url} alt="" className="w-8 h-8 rounded-full border border-green-600" />
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
                                  <span className="text-[#81C784] font-bold text-sm">{formatDateTime(match.scheduled_at || match.begin_at)}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                                {match.opponents[1]?.opponent?.image_url && (
                                  <img src={match.opponents[1].opponent.image_url} alt="" className="w-8 h-8 rounded-full border border-green-600" />
                                )}
                                <span className="font-medium text-sm text-left truncate">{match.opponents[1]?.opponent?.name || 'TBD'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
              </div>
            </div>
            </div>
          ) : (
            <div className="bg-[#234d23] rounded-lg p-4 border border-[#388E3C]">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#4CAF50] rounded-full"></span>
                Partidos
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
                  No hay partidos
                </div>
              )}

              {!loading && !error && matches.length > 0 && (
                <div className="space-y-3">
                  {(() => {
                    const grouped = groupMatchesByLeague(matches);
                    const sortedLeagueNames = sortLeagues(Object.keys(grouped));
                    return sortedLeagueNames.map(leagueName => (
                      <div key={leagueName}>
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#388E3C]">
                          <span className="text-sm font-bold text-[#4CAF50] uppercase tracking-wider">{leagueName}</span>
                          <span className="text-xs text-green-400 bg-[#1e3d1e] px-2 py-0.5 rounded">{grouped[leagueName].length}</span>
                        </div>
                        <div className="space-y-2">
                          {grouped[leagueName].map(match => {
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
                                <div className="flex items-center gap-3 flex-[3]">
                                  <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                    <span className="font-medium text-sm text-right truncate">{match.opponents[0]?.opponent?.name || 'TBD'}</span>
                                    {match.opponents[0]?.opponent?.image_url && (
                                      <img src={match.opponents[0].opponent.image_url} alt="" className="w-8 h-8 rounded-full border border-green-600" />
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
                                      <span className="text-[#81C784] font-bold text-sm">{formatDateTime(match.scheduled_at || match.begin_at)}</span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                                    {match.opponents[1]?.opponent?.image_url && (
                                      <img src={match.opponents[1].opponent.image_url} alt="" className="w-8 h-8 rounded-full border border-green-600" />
                                    )}
                                    <span className="font-medium text-sm text-left truncate">{match.opponents[1]?.opponent?.name || 'TBD'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="bg-[#1e3d1e] text-center py-4 text-green-300 text-sm border-t border-[#388E3C] mt-4">
        <p>PromiedosLoL - Resultados de League of Legends</p>
      </footer>
    </div>
  );
}

export default App;