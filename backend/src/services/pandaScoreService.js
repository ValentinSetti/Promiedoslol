import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 });
const PANDASCORE_BASE_URL = 'https://api.pandascore.co';

const ALLOWED_LEAGUES = [302, 293, 5351, 4198, 4197, 294];

function getApiKey() {
  const key = process.env.PANDASCORE_API_KEY;
  if (!key) {
    throw new Error('PANDASCORE_API_KEY no está configurada en el archivo .env');
  }
  return key;
}

function createClient() {
  return axios.create({
    baseURL: PANDASCORE_BASE_URL,
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Accept': 'application/json'
    }
  });
}

async function fetchWithCache(endpoint, params = {}, ttl = 300) {
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`📦 Cache hit: ${cacheKey}`);
    return cached;
  }

  console.log(`🌐 API call: ${endpoint}`, params);
  try {
    const client = createClient();
    const response = await client.get(endpoint, { params });
    const data = response.data;
    cache.set(cacheKey, data, ttl);
    return data;
  } catch (error) {
    console.error(`❌ Error en API call ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

export async function getLeagues() {
  return fetchWithCache('/lol/leagues', { per_page: 50 }, 3600);
}

export async function getTournaments(leagueId) {
  return fetchWithCache(`/lol/tournaments`, { 'filter[league_id]': leagueId }, 3000);
}

export async function getMatches(filters = {}) {
  return fetchWithCache('/lol/matches', filters, 600);
}

export async function getAllMatches(filters = {}) {
  return fetchWithCache('/lol/matches', {
    'sort': '-begin_at',
    'page[size]': 100,
    'filter[league_id]': ALLOWED_LEAGUES.join(','),
    ...filters
  }, 6000);
}

export async function getTeams(filters = {}) {
  return fetchWithCache('/lol/teams', filters, 600);
}

export async function getTeamById(teamId) {
  return fetchWithCache(`/lol/teams/${teamId}`, {}, 600);
}

export async function getMatchById(matchId) {
  return fetchWithCache(`/lol/matches/${matchId}`, {}, 60);
}

export async function getPastMatches(limit = 20) {
  return fetchWithCache('/lol/matches', {
    'filter[status]': 'finished',
    'filter[league_id]': ALLOWED_LEAGUES.join(','),
    'sort': '-begin_at',
    'page[size]': limit
  }, 300);
}

export async function getUpcomingMatches(limit = 20) {
  return fetchWithCache('/lol/matches', {
    'filter[status]': 'upcoming',
    'filter[league_id]': ALLOWED_LEAGUES.join(','),
    'sort': 'begin_at',
    'page[size]': limit
  }, 120);
}

export async function getMatchesByDate(date, limit = 50) {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  return fetchWithCache('/lol/matches', {
    'filter[begin_at]': `${startOfDay.toISOString()},${endOfDay.toISOString()}`,
    'filter[league_id]': ALLOWED_LEAGUES.join(','),
    'sort': 'begin_at',
    'page[size]': limit
  }, 300);
}

export function clearCache() {
  cache.flushAll();
  console.log('🗑️ Cache limpiado');
}

export function getCacheStats() {
  return cache.getStats();
}

export async function getTournamentStandings(tournamentId) {
  return fetchWithCache(`/lol/tournaments/${tournamentId}/standings`, {}, 300);
}

export async function getRunningTournaments() {
  return fetchWithCache('/lol/tournaments/running', {}, 120);
}