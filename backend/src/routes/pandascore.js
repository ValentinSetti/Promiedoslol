import express from 'express';
import * as pandaScore from '../services/pandaScoreService.js';

const router = express.Router();

router.get('/leagues', async (req, res) => {
  try {
    const data = await pandaScore.getLeagues();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tournaments/:leagueId', async (req, res) => {
  try {
    const data = await pandaScore.getTournaments(req.params.leagueId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/matches', async (req, res) => {
  try {
    const { limit, status, league_id } = req.query;
    const filters = {};
    if (limit) filters.per_page = limit;
    if (status) filters.status = status;
    if (league_id) filters.league_id = league_id;

    const data = await pandaScore.getMatches(filters);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/matches/past', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await pandaScore.getPastMatches(limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/matches/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await pandaScore.getUpcomingMatches(limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/matches/:id', async (req, res) => {
  try {
    const data = await pandaScore.getMatchById(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/teams', async (req, res) => {
  try {
    const { search } = req.query;
    const filters = search ? { search } : {};
    const data = await pandaScore.getTeams(filters);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/teams/:id', async (req, res) => {
  try {
    const data = await pandaScore.getTeamById(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cache/clear', (req, res) => {
  pandaScore.clearCache();
  res.json({ message: 'Cache limpiado' });
});

export default router;