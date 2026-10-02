const fs = require('fs');
const path = require('path');
const config = require('../config');
const { sampleCreators } = require('../data/sampleData');

let db = null;

function initDatabase() {
  const dataDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(config.dbPath);
    console.log(`[DB] Connected to SQLite database at ${config.dbPath}`);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        niche TEXT,
        bio TEXT,
        platforms TEXT,
        metrics TEXT,
        demographics TEXT,
        content_style TEXT,
        past_brands TEXT,
        notable_wins TEXT,
        rate_card TEXT,
        contact_info TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        brand_info TEXT,
        creator_profile_id TEXT,
        status TEXT DEFAULT 'Draft',
        tone TEXT,
        format TEXT,
        content_json TEXT,
        subject_lines_json TEXT,
        alignment_score INTEGER,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS proposal_versions (
        id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        content_json TEXT NOT NULL,
        change_note TEXT,
        created_at TEXT
      );
    `);

    // No auto-seeding: User starts with empty profiles
    return db;
  } catch (err) {
    console.error('[DB] Error initializing SQLite database:', err);
    throw err;
  }
}

function getDb() {
  if (!db) {
    initDatabase();
  }
  return db;
}

// Profile helpers
function formatProfileOut(row) {
  if (!row) return null;
  return {
    ...row,
    platforms: row.platforms ? JSON.parse(row.platforms) : [],
    metrics: row.metrics ? JSON.parse(row.metrics) : {},
    demographics: row.demographics ? JSON.parse(row.demographics) : {},
    notableWins: row.notable_wins ? JSON.parse(row.notable_wins) : [],
    rateCard: row.rate_card ? JSON.parse(row.rate_card) : {},
    contactInfo: row.contact_info ? JSON.parse(row.contact_info) : {},
    contentStyle: row.content_style || '',
    pastBrands: row.past_brands || ''
  };
}

function saveProfileSync(profile) {
  const d = getDb();
  const id = profile.id || `creator_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const stmt = d.prepare(`
    INSERT INTO profiles (
      id, name, niche, bio, platforms, metrics, demographics,
      content_style, past_brands, notable_wins, rate_card, contact_info, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      niche=excluded.niche,
      bio=excluded.bio,
      platforms=excluded.platforms,
      metrics=excluded.metrics,
      demographics=excluded.demographics,
      content_style=excluded.content_style,
      past_brands=excluded.past_brands,
      notable_wins=excluded.notable_wins,
      rate_card=excluded.rate_card,
      contact_info=excluded.contact_info,
      updated_at=excluded.updated_at
  `);

  stmt.run(
    id,
    profile.name || 'Untitled Creator',
    profile.niche || '',
    profile.bio || '',
    JSON.stringify(profile.platforms || []),
    JSON.stringify(profile.metrics || {}),
    JSON.stringify(profile.demographics || {}),
    profile.contentStyle || profile.content_style || '',
    profile.pastBrands || profile.past_brands || '',
    JSON.stringify(profile.notableWins || profile.notable_wins || []),
    JSON.stringify(profile.rateCard || profile.rate_card || {}),
    JSON.stringify(profile.contactInfo || profile.contact_info || {}),
    profile.created_at || now,
    now
  );

  return getProfileById(id);
}

function getProfiles() {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM profiles ORDER BY updated_at DESC').all();
  return rows.map(formatProfileOut);
}

function getProfileById(id) {
  const d = getDb();
  const row = d.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
  return formatProfileOut(row);
}

function deleteProfile(id) {
  const d = getDb();
  d.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  return true;
}

// Proposal helpers
function formatProposalOut(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    brandName: row.brand_name,
    brandInfo: row.brand_info ? JSON.parse(row.brand_info) : {},
    creatorProfileId: row.creator_profile_id,
    status: row.status || 'Draft',
    tone: row.tone || 'professional',
    format: row.format || 'deck',
    content: row.content_json ? JSON.parse(row.content_json) : null,
    subjectLines: row.subject_lines_json ? JSON.parse(row.subject_lines_json) : [],
    alignmentScore: row.alignment_score || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getProposals({ search, status } = {}) {
  const d = getDb();
  let query = 'SELECT * FROM proposals';
  const conditions = [];
  const params = [];

  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(title LIKE ? OR brand_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY updated_at DESC';

  const rows = d.prepare(query).all(...params);
  return rows.map(formatProposalOut);
}

function getProposalById(id) {
  const d = getDb();
  const row = d.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
  return formatProposalOut(row);
}

function saveProposal(data) {
  const d = getDb();
  const id = data.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const title = data.title || `${data.creatorName || 'Creator'} x ${data.brandName || 'Brand'} Collaboration Pitch`;

  const stmt = d.prepare(`
    INSERT INTO proposals (
      id, title, brand_name, brand_info, creator_profile_id, status,
      tone, format, content_json, subject_lines_json, alignment_score, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      brand_name=excluded.brand_name,
      brand_info=excluded.brand_info,
      creator_profile_id=excluded.creator_profile_id,
      status=excluded.status,
      tone=excluded.tone,
      format=excluded.format,
      content_json=excluded.content_json,
      subject_lines_json=excluded.subject_lines_json,
      alignment_score=excluded.alignment_score,
      updated_at=excluded.updated_at
  `);

  stmt.run(
    id,
    title,
    data.brandName || data.brand_name || 'Brand',
    JSON.stringify(data.brandInfo || data.brand_info || {}),
    data.creatorProfileId || data.creator_profile_id || '',
    data.status || 'Draft',
    data.tone || 'professional',
    data.format || 'deck',
    JSON.stringify(data.content || data.content_json || {}),
    JSON.stringify(data.subjectLines || data.subject_lines || []),
    data.alignmentScore || data.alignment_score || 0,
    data.createdAt || data.created_at || now,
    now
  );

  // Automatically record initial version if it doesn't have one
  const existingVersions = getVersions(id);
  if (existingVersions.length === 0 && data.content) {
    addVersion(id, data.content, 'Initial generation');
  }

  return getProposalById(id);
}

function updateProposal(id, updates) {
  const existing = getProposalById(id);
  if (!existing) return null;

  const merged = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString()
  };

  return saveProposal(merged);
}

function deleteProposal(id) {
  const d = getDb();
  d.prepare('DELETE FROM proposal_versions WHERE proposal_id = ?').run(id);
  d.prepare('DELETE FROM proposals WHERE id = ?').run(id);
  return true;
}

// Version management
function getVersions(proposalId) {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM proposal_versions WHERE proposal_id = ? ORDER BY version_number DESC').all(proposalId);
  return rows.map(r => ({
    id: r.id,
    proposalId: r.proposal_id,
    versionNumber: r.version_number,
    content: JSON.parse(r.content_json),
    changeNote: r.change_note,
    createdAt: r.created_at
  }));
}

function addVersion(proposalId, content, changeNote = 'Updated section content') {
  const d = getDb();
  const versions = getVersions(proposalId);
  const nextVersion = versions.length > 0 ? versions[0].versionNumber + 1 : 1;
  const versionId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  d.prepare(`
    INSERT INTO proposal_versions (id, proposal_id, version_number, content_json, change_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    versionId,
    proposalId,
    nextVersion,
    JSON.stringify(content),
    changeNote,
    now
  );

  return {
    id: versionId,
    proposalId,
    versionNumber: nextVersion,
    content,
    changeNote,
    createdAt: now
  };
}

module.exports = {
  initDatabase,
  getDb,
  getProfiles,
  getProfileById,
  saveProfile: saveProfileSync,
  deleteProfile,
  getProposals,
  getProposalById,
  saveProposal,
  updateProposal,
  deleteProposal,
  getVersions,
  addVersion
};
