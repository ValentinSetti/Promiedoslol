import express from 'express';
import * as pandaScore from '../services/pandaScoreService.js';

const router = express.Router();

router.get('/leagues', async (req, res) => {
  try {
    const data = await pandaScore.getLeagues();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/tournaments', async (req, res) => {
  try {
    const { league_id } = req.query;
    if (!league_id) {
      return res.status(400).json({ error: 'Se requiere league_id' });
    }
    const data = await pandaScore.getTournaments(league_id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/matches', async (req, res) => {
  try {
    const { status, league_id, limit, page, date, tournament_id } = req.query;
    const filters = {};

    if (status) filters['filter[status]'] = status;
    if (league_id) filters['filter[league_id]'] = league_id;
    if (tournament_id) filters['filter[tournament_id]'] = tournament_id;
    if (limit) filters['page[size]'] = parseInt(limit);
    if (page) filters['page[number]'] = parseInt(page);
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      filters['range[begin_at]'] = `${startOfDay.toISOString()},${endOfDay.toISOString()}`;
    }

    if (!filters['page[size]']) {
      filters['page[size]'] = 10;
    }

    const data = await pandaScore.getAllMatches(filters);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/matches/past', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await pandaScore.getPastMatches(limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/matches/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await pandaScore.getUpcomingMatches(limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/matches/by-date', async (req, res) => {
  try {
    const { date, limit } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Se requiere el parámetro date (YYYY-MM-DD)' });
    }
    const data = await pandaScore.getMatchesByDate(date, parseInt(limit) || 50);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/matches/:id', async (req, res) => {
  try {
    const data = await pandaScore.getMatchById(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/teams', async (req, res) => {
  try {
    const { search } = req.query;
    const filters = {};
    if (search) filters.search = search;
    const data = await pandaScore.getTeams(filters);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/teams/:id', async (req, res) => {
  try {
    const data = await pandaScore.getTeamById(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.post('/cache/clear', (req, res) => {
  pandaScore.clearCache();
  res.json({ message: 'Cache limpiado' });
});

router.get('/cache/stats', (req, res) => {
  const stats = pandaScore.getCacheStats();
  res.json(stats);
});

router.get('/tournaments/running', async (req, res) => {
  try {
    const data = await pandaScore.getRunningTournaments();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/tournaments/:id/standings', async (req, res) => {
  try {
    const data = await pandaScore.getTournamentStandings(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

export default router;