import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 });

const PANDASCORE_BASE_URL = 'https://api.pandascore.co';
const API_KEY = process.env.PANDASCORE_API_KEY;

const pandaScoreClient = axios.create({
  baseURL: PANDASCORE_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/json'
  }
});

async function fetchWithCache(endpoint, params = {}, ttl = 300) {
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`📦 Cache hit: ${cacheKey}`);
    return cached;
  }

  console.log(`🌐 API call: ${endpoint}`);
  const response = await pandaScoreClient.get(endpoint, { params });
  const data = response.data;

  cache.set(cacheKey, data, ttl);
  return data;
}

export async function getLeagues() {
  return fetchWithCache('/leagues', { videogame: 'league-of-legends' }, 600);
}

export async function getTournaments(leagueId) {
  return fetchWithCache('/tournaments', { league_id: leagueId }, 300);
}

export async function getMatches(filters = {}) {
  return fetchWithCache('/matches', { videogame: 'league-of-legends', ...filters }, 120);
}

export async function getTeams(filters = {}) {
  return fetchWithCache('/teams', { videogame: 'league-of-legends', ...filters }, 600);
}

export async function getTeamById(teamId) {
  return fetchWithCache(`/teams/${teamId}`, {}, 600);
}

export async function getMatchById(matchId) {
  return fetchWithCache(`/matches/${matchId}`, {}, 60);
}

export async function getPastMatches(limit = 20) {
  const now = new Date().toISOString();
  return fetchWithCache('/matches', {
    videogame: 'league-of-legends',
    'begin_at.lte': now,
    'status': 'finished',
    'sort': '-begin_at',
    per_page: limit
  }, 300);
}

export async function getUpcomingMatches(limit = 20) {
  const now = new Date().toISOString();
  return fetchWithCache('/matches', {
    videogame: 'league-of-legends',
    'begin_at.gte': now,
    'status': 'upcoming',
    'sort': 'begin_at',
    per_page: limit
  }, 120);
}

export function clearCache() {
  cache.flushAll();
  console.log('🗑️ Cache limpiado');
}