import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

export interface BackendTracker {
  id: number;
  task: string;
  start_time: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTrackerRequest {
  task: string;
  start_time: string;
  end_time?: string;
}

export interface UpdateTrackerRequest {
  task?: string;
  start_time?: string;
  end_time?: string;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // GET /trackers - Get all trackers
  async getAllTrackers(): Promise<BackendTracker[]> {
    try {
      const response = await fetch(`${this.baseURL}/trackers`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching trackers:', error);
      throw error;
    }
  }

  // GET /trackers/{id} - Find tracker by ID
  async getTrackerById(id: number): Promise<BackendTracker> {
    try {
      const response = await fetch(`${this.baseURL}/trackers/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tracker:', error);
      throw error;
    }
  }

  // POST /trackers - Create new tracker
  async createTracker(data: CreateTrackerRequest): Promise<BackendTracker> {
    try {
      const response = await fetch(`${this.baseURL}/trackers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating tracker:', error);
      throw error;
    }
  }

  // PUT /trackers/{id} - Update tracker
  async updateTracker(id: number, data: UpdateTrackerRequest): Promise<BackendTracker> {
    try {
      const response = await fetch(`${this.baseURL}/trackers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating tracker:', error);
      throw error;
    }
  }

  // DELETE /trackers/{id} - Delete tracker
  async deleteTracker(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/trackers/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting tracker:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
