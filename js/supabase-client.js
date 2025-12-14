/**
 * Supabase Client Module for Elevate Media Invoice Portal
 */

const SUPABASE_URL = 'https://lmuhkvjjougawkcfznrn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtdWhrdmpqb3VnYXdrY2Z6bnJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTA3NzMsImV4cCI6MjA4MTI2Njc3M30.qjlgSOkHdWFvhMMMUyvz9kvgiFX7t8SdC2GrIcvcJo4';

/**
 * Simple Supabase REST API client
 * Using fetch instead of the full Supabase JS client for simplicity
 */
const SupabaseClient = {
  /**
   * Make a request to the Supabase REST API
   * @param {string} endpoint - The API endpoint (e.g., '/rest/v1/clients')
   * @param {object} options - Fetch options
   * @returns {Promise<object>} - Response data
   */
  async request(endpoint, options = {}) {
    const url = `${SUPABASE_URL}${endpoint}`;

    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  },

  /**
   * Fetch all clients from the database
   * @param {object} filters - Optional filters
   * @returns {Promise<Array>} - Array of client objects
   */
  async getClients(filters = {}) {
    let endpoint = '/rest/v1/clients?select=*&order=name.asc';

    if (filters.invoice_type) {
      endpoint += `&invoice_type=eq.${filters.invoice_type}`;
    }

    return this.request(endpoint);
  },

  /**
   * Fetch a single client by ID
   * @param {string} id - Client UUID
   * @returns {Promise<object>} - Client object
   */
  async getClient(id) {
    const endpoint = `/rest/v1/clients?id=eq.${id}&select=*`;
    const results = await this.request(endpoint);
    return results && results.length > 0 ? results[0] : null;
  },

  /**
   * Create a new client
   * @param {object} clientData - Client data to insert
   * @returns {Promise<object>} - Created client object
   */
  async createClient(clientData) {
    const endpoint = '/rest/v1/clients';

    // Add timestamps
    const now = new Date().toISOString();
    const data = {
      ...clientData,
      created_at: now,
      updated_at: now
    };

    const results = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    return results && results.length > 0 ? results[0] : null;
  },

  /**
   * Update an existing client
   * @param {string} id - Client UUID
   * @param {object} clientData - Client data to update
   * @returns {Promise<object>} - Updated client object
   */
  async updateClient(id, clientData) {
    const endpoint = `/rest/v1/clients?id=eq.${id}`;

    // Update timestamp
    const data = {
      ...clientData,
      updated_at: new Date().toISOString()
    };

    const results = await this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });

    return results && results.length > 0 ? results[0] : null;
  },

  /**
   * Delete a client
   * @param {string} id - Client UUID
   * @returns {Promise<void>}
   */
  async deleteClient(id) {
    const endpoint = `/rest/v1/clients?id=eq.${id}`;

    await this.request(endpoint, {
      method: 'DELETE'
    });
  }
};

// Export for use in other modules
window.SupabaseClient = SupabaseClient;
