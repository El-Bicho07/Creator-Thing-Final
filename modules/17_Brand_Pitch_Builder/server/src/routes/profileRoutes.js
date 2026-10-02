const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all profiles
router.get('/', (req, res) => {
  try {
    const profiles = db.getProfiles();
    res.json({ success: true, data: profiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single profile by ID
router.get('/:id', (req, res) => {
  try {
    const profile = db.getProfileById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save / update profile
router.post('/', (req, res) => {
  try {
    const saved = db.saveProfile(req.body);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE profile
router.delete('/:id', (req, res) => {
  try {
    db.deleteProfile(req.params.id);
    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
