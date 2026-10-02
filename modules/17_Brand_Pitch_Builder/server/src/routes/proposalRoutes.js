const express = require('express');
const router = express.Router();
const db = require('../db');

// GET pipeline statistics
router.get('/stats/pipeline', (req, res) => {
  try {
    const proposals = db.getProposals();

    const counts = {
      total: proposals.length,
      draft: 0,
      sent: 0,
      replied: 0,
      won: 0,
      lost: 0,
      totalWonValue: 0,
      totalPipelineValue: 0
    };

    proposals.forEach(p => {
      const status = (p.status || 'Draft').toLowerCase();
      if (counts[status] !== undefined) {
        counts[status]++;
      }

      // Calculate approximate deal value from packages (use middle tier or tier 1)
      let dealVal = 0;
      if (p.content?.sections?.pricingPackages?.packages) {
        const pkgs = p.content.sections.pricingPackages.packages;
        const middlePkg = pkgs.length > 1 ? pkgs[1] : pkgs[0];
        dealVal = typeof middlePkg?.price === 'number' ? middlePkg.price : (parseInt(middlePkg?.price) || 0);
      }

      if (status === 'won') {
        counts.totalWonValue += dealVal;
      }
      if (['sent', 'replied'].includes(status)) {
        counts.totalPipelineValue += dealVal;
      }
    });

    const finishedDeals = counts.won + counts.lost;
    const winRate = finishedDeals > 0 ? Math.round((counts.won / finishedDeals) * 100) : (counts.won > 0 ? 100 : 0);

    res.json({
      success: true,
      data: {
        ...counts,
        winRate
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all proposals with search and status filter
router.get('/', (req, res) => {
  try {
    const { search, status } = req.query;
    const proposals = db.getProposals({ search, status });
    res.json({ success: true, data: proposals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single proposal by id
router.get('/:id', (req, res) => {
  try {
    const proposal = db.getProposalById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.json({ success: true, data: proposal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create proposal
router.post('/', (req, res) => {
  try {
    const saved = db.saveProposal(req.body);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update proposal
router.put('/:id', (req, res) => {
  try {
    const updated = db.updateProposal(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // If changeNote provided, record a version snapshot
    if (req.body.recordVersion && req.body.content) {
      db.addVersion(req.params.id, req.body.content, req.body.changeNote || 'Manual update');
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST duplicate proposal
router.post('/:id/duplicate', (req, res) => {
  try {
    const existing = db.getProposalById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const duplicate = {
      ...existing,
      id: undefined,
      title: `[Copy] ${existing.title}`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveProposal(duplicate);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE proposal
router.delete('/:id', (req, res) => {
  try {
    db.deleteProposal(req.params.id);
    res.json({ success: true, message: 'Proposal deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET version history
router.get('/:id/versions', (req, res) => {
  try {
    const versions = db.getVersions(req.params.id);
    res.json({ success: true, data: versions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST record new version snapshot
router.post('/:id/versions', (req, res) => {
  try {
    const { content, changeNote } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Version content is required' });
    }
    const version = db.addVersion(req.params.id, content, changeNote);
    res.json({ success: true, data: version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
