const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.message || `HTTP error! status: ${response.status}` };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  }



  // Poll endpoints
  async getPolls(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/polls${queryString ? `?${queryString}` : ''}`);
  }

  async getPollHistory(params = {}) {
    // Use the same endpoint as getPolls for poll history
    return this.getPolls(params);
  }

  async getPoll(pollId) {
    return this.request(`/polls/${pollId}`);
  }

  async createPoll(pollData) {
    return this.request('/polls', {
      method: 'POST',
      body: pollData,
    });
  }

  async updatePoll(pollId, pollData) {
    return this.request(`/polls/${pollId}`, {
      method: 'PUT',
      body: pollData,
    });
  }

  async deletePoll(pollId) {
    return this.request(`/polls/${pollId}`, {
      method: 'DELETE',
    });
  }

  async startPoll(pollId) {
    return this.request(`/polls/${pollId}/start`, {
      method: 'POST',
    });
  }

  async endPoll(pollId) {
    return this.request(`/polls/${pollId}/end`, {
      method: 'POST',
    });
  }

  async votePoll(pollId, voteData) {
    return this.request(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: voteData,
    });
  }

  async getPollResults(pollId) {
    return this.request(`/polls/${pollId}/results`);
  }

  // Chat endpoints
  async getMessages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/chat/messages${queryString ? `?${queryString}` : ''}`);
  }

  async getRecentMessages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/chat/messages/recent${queryString ? `?${queryString}` : ''}`);
  }

  async editMessage(messageId, messageData) {
    return this.request(`/chat/messages/${messageId}`, {
      method: 'PUT',
      body: messageData,
    });
  }

  async deleteMessage(messageId) {
    return this.request(`/chat/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async addReaction(messageId, reactionData) {
    return this.request(`/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      body: reactionData,
    });
  }

  async removeReaction(messageId, emoji) {
    return this.request(`/chat/messages/${messageId}/reactions/${emoji}`, {
      method: 'DELETE',
    });
  }

  async getChatStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/chat/stats${queryString ? `?${queryString}` : ''}`);
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;