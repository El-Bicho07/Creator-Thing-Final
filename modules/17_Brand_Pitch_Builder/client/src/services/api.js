const BASE_URL = '/api';

async function fetchJson(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Profiles
  async getProfiles() {
    return fetchJson('/profiles');
  },
  async getProfile(id) {
    return fetchJson(`/profiles/${id}`);
  },
  async saveProfile(profile) {
    return fetchJson('/profiles', {
      method: 'POST',
      body: JSON.stringify(profile)
    });
  },
  async deleteProfile(id) {
    return fetchJson(`/profiles/${id}`, {
      method: 'DELETE'
    });
  },

  // Proposals
  async getProposals(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson(`/proposals${qs}`);
  },
  async getProposal(id) {
    return fetchJson(`/proposals/${id}`);
  },
  async saveProposal(proposal) {
    return fetchJson('/proposals', {
      method: 'POST',
      body: JSON.stringify(proposal)
    });
  },
  async updateProposal(id, updates) {
    return fetchJson(`/proposals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  async duplicateProposal(id) {
    return fetchJson(`/proposals/${id}/duplicate`, {
      method: 'POST'
    });
  },
  async deleteProposal(id) {
    return fetchJson(`/proposals/${id}`, {
      method: 'DELETE'
    });
  },
  async getVersions(proposalId) {
    return fetchJson(`/proposals/${proposalId}/versions`);
  },
  async addVersion(proposalId, content, changeNote) {
    return fetchJson(`/proposals/${proposalId}/versions`, {
      method: 'POST',
      body: JSON.stringify({ content, changeNote })
    });
  },
  async getPipelineStats() {
    return fetchJson('/proposals/stats/pipeline');
  },

  // AI
  async generateProposal(payload) {
    return fetchJson('/ai/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async regenerateSection(payload) {
    return fetchJson('/ai/regenerate-section', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async extractBrand(input) {
    return fetchJson('/ai/extract-brand', {
      method: 'POST',
      body: JSON.stringify({ input })
    });
  },
  async getAiStatus() {
    return fetchJson('/ai/status');
  },
  async updateAiConfig(config) {
    return fetchJson('/ai/config', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }
};
