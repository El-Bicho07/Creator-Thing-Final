/**
 * API Service for communicating with the CreatorSpace AI backend
 */

const API_BASE_URL = ''; // Relative path leverages Vite dev proxy to localhost:5000

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (error) {
    return { status: 'offline', error: error.message };
  }
}

export async function generateContent({
  topic,
  format,
  audience,
  tone,
  apiKey,
}) {
  const endpoint = `${API_BASE_URL}/api/gemini/generate`;

  const bodyPayload = {
    topic,
    format,
    audience,
    tone,
    apiKey,
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const error = new Error(data.message || 'Generation failed.');
      error.code = data.error || 'SERVER_ERROR';
      error.details = data;
      throw error;
    }

    return data.data;
  } catch (error) {
    if (!error.code) {
      error.message =
        'Failed to connect to backend server. Make sure the CreatorSpace backend is running on port 5000.';
      error.code = 'NETWORK_ERROR';
    }
    throw error;
  }
}

/**
 * Agent 1: Scout emerging trends
 */
export async function scoutTrends({
  niche,
  platform,
  audience,
  apiKey,
}) {
  const endpoint = `${API_BASE_URL}/api/gemini/trends/scout`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ niche, platform, audience, apiKey }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const error = new Error(data.message || 'Trend scouting failed.');
      error.code = data.error || 'SCOUT_FAILED';
      throw error;
    }

    return data.data;
  } catch (error) {
    if (!error.code) {
      error.message = 'Failed to connect to backend server for Trend Scout.';
      error.code = 'NETWORK_ERROR';
    }
    throw error;
  }
}

/**
 * Agent 3: Content Critic & Evaluator
 */
export async function evaluateContent({
  content,
  format,
  topic,
  audience,
  tone,
  apiKey,
}) {
  const endpoint = `${API_BASE_URL}/api/gemini/evaluate`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, format, topic, audience, tone, apiKey }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const error = new Error(data.message || 'Evaluation failed.');
      error.code = data.error || 'EVALUATION_FAILED';
      throw error;
    }

    return data.data;
  } catch (error) {
    if (!error.code) {
      error.message = 'Failed to connect to backend server for Content Evaluation.';
      error.code = 'NETWORK_ERROR';
    }
    throw error;
  }
}

/**
 * Autonomous 3-Agent Sequential Chain:
 * Agent 1 (Trend Scout) ➔ Agent 2 (Script Builder) ➔ Agent 3 (Content Critic)
 */
export async function runAutonomousChain({
  niche,
  format,
  audience,
  tone,
  apiKey,
}) {
  const endpoint = `${API_BASE_URL}/api/gemini/chain`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ niche, format, audience, tone, apiKey }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const error = new Error(data.message || 'Autonomous chain failed.');
      error.code = data.error || 'CHAIN_FAILED';
      throw error;
    }

    return data.data;
  } catch (error) {
    if (!error.code) {
      error.message = 'Failed to connect to backend server for Autonomous Chain.';
      error.code = 'NETWORK_ERROR';
    }
    throw error;
  }
}

