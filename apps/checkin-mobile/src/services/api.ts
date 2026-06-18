/**
 * API Service
 * Wrapper around fetch with standardized response format
 * TicketBox Check-in Mobile App
 */

import { API_BASE_URL, API_TIMEOUT } from '../constants/api';
import type { ApiResponse } from '../types';

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /** Set auth token */
  setToken(token: string | null): void {
    this.token = token;
  }

  /** Generic request method with timeout and response formatting */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(options.headers || {}),
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await response.json();

      // Standardize response format
      if (json.success !== undefined) {
        return json as ApiResponse<T>;
      }

      return {
        success: response.ok,
        data: json.data !== undefined ? json.data : json,
        message: response.ok ? undefined : 'Request failed',
      };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`[API Error] request to ${endpoint} failed:`, error);

      const message =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'Request timeout'
            : error.message
          : 'Unknown error';

      return {
        success: false,
        data: null as T,
        message,
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /** Upload multipart form data */
  async upload<T>(
    endpoint: string,
    formData: FormData,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT * 3);

    try {
      const headers: HeadersInit = {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const json = await response.json();

      return {
        success: response.ok,
        data: json.data || json,
        message: json.message,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        success: false,
        data: null as T,
        message: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }
}

/** Singleton API instance */
export const apiService = new ApiService();
