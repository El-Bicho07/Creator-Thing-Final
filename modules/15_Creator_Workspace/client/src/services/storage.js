/**
 * Storage Service for CreatorSpace AI
 * Handles localStorage persistence for saved content, bookmarks, preferences, and activity.
 * Modularized so it can easily swap to a cloud database/REST API later.
 */

const STORAGE_KEYS = {
  SAVED_CONTENT: 'creatorspace_saved_content',
  BOOKMARKED_TRENDS: 'creatorspace_bookmarked_trends',
  PREFERENCES: 'creatorspace_user_preferences',
  RECENT_ACTIVITY: 'creatorspace_recent_activity',
};

const DEFAULT_PREFERENCES = {
  preferredTone: 'Educational',
  preferredAudience: 'Content Creators',
  defaultFormat: 'Instagram Reel',
  aiProvider: 'gemini',
};

// Safe JSON parser helper
function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

// ----------------- SAVED CONTENT -----------------
export function getSavedContent() {
  return safeGet(STORAGE_KEYS.SAVED_CONTENT, []);
}

export function saveContentItem(item) {
  const list = getSavedContent();
  const newItem = {
    id: item.id || `cs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    topic: item.topic || 'Untitled',
    format: item.format || 'Caption',
    audience: item.audience || 'General audience',
    tone: item.tone || 'Engaging',
    content: item.content || '',
    provider: item.provider || 'unknown',
    model: item.model || '',
    createdAt: item.createdAt || new Date().toISOString(),
  };

  const updated = [newItem, ...list];
  safeSet(STORAGE_KEYS.SAVED_CONTENT, updated);
  addRecentActivity({
    type: 'saved',
    title: newItem.topic,
    format: newItem.format,
    targetId: newItem.id,
    timestamp: newItem.createdAt,
  });
  return newItem;
}

export function deleteSavedItem(id) {
  const list = getSavedContent();
  const filtered = list.filter((item) => item.id !== id);
  safeSet(STORAGE_KEYS.SAVED_CONTENT, filtered);
  return filtered;
}

// ----------------- BOOKMARKED TRENDS -----------------
export function getBookmarkedTrendIds() {
  return safeGet(STORAGE_KEYS.BOOKMARKED_TRENDS, []);
}

export function toggleTrendBookmark(trendId) {
  const current = getBookmarkedTrendIds();
  let updated;
  if (current.includes(trendId)) {
    updated = current.filter((id) => id !== trendId);
  } else {
    updated = [...current, trendId];
  }
  safeSet(STORAGE_KEYS.BOOKMARKED_TRENDS, updated);
  return updated;
}

export function isTrendBookmarked(trendId) {
  const current = getBookmarkedTrendIds();
  return current.includes(trendId);
}

// ----------------- USER PREFERENCES -----------------
export function getUserPreferences() {
  const stored = safeGet(STORAGE_KEYS.PREFERENCES, {});
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export function saveUserPreferences(prefs) {
  const current = getUserPreferences();
  const updated = { ...current, ...prefs };
  safeSet(STORAGE_KEYS.PREFERENCES, updated);
  return updated;
}

// ----------------- RECENT ACTIVITY -----------------
export function getRecentActivity() {
  return safeGet(STORAGE_KEYS.RECENT_ACTIVITY, []);
}

export function addRecentActivity(entry) {
  const current = getRecentActivity();
  const item = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  const updated = [item, ...current.slice(0, 19)]; // Keep latest 20
  safeSet(STORAGE_KEYS.RECENT_ACTIVITY, updated);
  return updated;
}

export function clearRecentActivity() {
  safeSet(STORAGE_KEYS.RECENT_ACTIVITY, []);
}
