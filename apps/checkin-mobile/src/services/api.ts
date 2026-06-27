/**
 * API Service
 * Wrapper around fetch with standardized response format
 * TicketBox Check-in Mobile App
 */

import { API_BASE_URL, API_TIMEOUT } from "../constants/api";
import type { ApiResponse } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AUTH_STORAGE_KEYS = {
  accessToken: "auth_token",
  refreshToken: "auth_refresh_token",
  user: "auth_user",
} as const;

const CHECKIN_CLIENT_HEADER = "checkin-mobile";

class ApiService {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /** Set auth token */
  setToken(token: string | null): void {
    this.token = token;
  }

  /** Set refresh token for native clients */
  setRefreshToken(token: string | null): void {
    this.refreshToken = token;
  }

  /** Generic request method with timeout and response formatting */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const currentToken = await this.getAccessToken();
      let result = await this.sendRequest(endpoint, options, currentToken);

      if (this.shouldAttemptRefresh(endpoint, result.response)) {
        const newAccessToken = await this.refreshAccessToken();
        if (newAccessToken) {
          result = await this.sendRequest(endpoint, options, newAccessToken);
        } else {
          await this.clearAuthState();
        }
      }

      return this.toApiResponse<T>(result.response, result.json);
    } catch (error) {
      console.error(`[API Error] request to ${endpoint} failed:`, error);

      return {
        success: false,
        data: null as T,
        message: this.getErrorMessage(error),
      };
    }
  }

  private async sendRequest(
    endpoint: string,
    options: RequestInit,
    accessToken: string | null,
  ): Promise<{ response: Response; json: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: this.buildHeaders(options.headers, accessToken, options.body),
        credentials: "include",
        signal: controller.signal,
      });
      const json = await response.json().catch(() => ({}));

      return { response, json };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildHeaders(
    optionHeaders: RequestInit["headers"],
    accessToken: string | null,
    body?: RequestInit["body"] | null,
  ): Headers {
    const headers = new Headers(optionHeaders);

    if (!headers.has("Content-Type") && !(body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    headers.set("X-TicketBox-Client", CHECKIN_CLIENT_HEADER);

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }

    const storedToken = await AsyncStorage.getItem(
      AUTH_STORAGE_KEYS.accessToken,
    );
    if (storedToken) {
      this.token = storedToken;
    }

    return storedToken;
  }

  private async getRefreshToken(): Promise<string | null> {
    if (this.refreshToken) {
      return this.refreshToken;
    }

    const storedToken = await AsyncStorage.getItem(
      AUTH_STORAGE_KEYS.refreshToken,
    );
    if (storedToken) {
      this.refreshToken = storedToken;
    }

    return storedToken;
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  private async performRefresh(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    const body = refreshToken ? JSON.stringify({ refreshToken }) : undefined;
    const result = await this.sendRequest(
      "/auth/refresh",
      { method: "POST", body },
      null,
    );

    if (!result.response.ok) {
      await this.clearAuthState();
      return null;
    }

    const data = result.json?.data ?? result.json;
    const accessToken = data?.accessToken;
    const nextRefreshToken = data?.refreshToken;

    if (typeof accessToken !== "string" || !accessToken) {
      await this.clearAuthState();
      return null;
    }

    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
    this.token = accessToken;

    if (typeof nextRefreshToken === "string" && nextRefreshToken) {
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEYS.refreshToken,
        nextRefreshToken,
      );
      this.refreshToken = nextRefreshToken;
    }

    return accessToken;
  }

  private async clearAuthState(): Promise<void> {
    this.token = null;
    this.refreshToken = null;
    await AsyncStorage.multiRemove([
      AUTH_STORAGE_KEYS.accessToken,
      AUTH_STORAGE_KEYS.refreshToken,
      AUTH_STORAGE_KEYS.user,
    ]);
  }

  private shouldAttemptRefresh(endpoint: string, response: Response): boolean {
    return (
      response.status === 401 &&
      endpoint !== "/auth/refresh" &&
      endpoint !== "/auth/login" &&
      endpoint !== "/auth/register"
    );
  }

  private toApiResponse<T>(response: Response, json: any): ApiResponse<T> {
    if (json?.success !== undefined) {
      return json as ApiResponse<T>;
    }

    return {
      success: response.ok,
      data: json?.data !== undefined ? json.data : json,
      message: response.ok ? undefined : json?.message || "Request failed",
    };
  }

  private getErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
      return "Unknown error";
    }

    return error.name === "AbortError" ? "Request timeout" : error.message;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  /** Upload multipart form data */
  async upload<T>(
    endpoint: string,
    formData: FormData,
  ): Promise<ApiResponse<T>> {
    try {
      const currentToken = await this.getAccessToken();
      let result = await this.sendUploadRequest(
        endpoint,
        formData,
        currentToken,
      );

      if (result.response.status === 401) {
        const newAccessToken = await this.refreshAccessToken();
        if (newAccessToken) {
          result = await this.sendUploadRequest(
            endpoint,
            formData,
            newAccessToken,
          );
        } else {
          await this.clearAuthState();
        }
      }

      return this.toApiResponse<T>(result.response, result.json);
    } catch (error) {
      return {
        success: false,
        data: null as T,
        message: this.getErrorMessage(error),
      };
    }
  }

  private async sendUploadRequest(
    endpoint: string,
    formData: FormData,
    accessToken: string | null,
  ): Promise<{ response: Response; json: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT * 3);

    try {
      const headers = new Headers();
      headers.set("X-TicketBox-Client", CHECKIN_CLIENT_HEADER);

      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
        signal: controller.signal,
      });
      const json = await response.json().catch(() => ({}));

      return { response, json };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/** Singleton API instance */
export const apiService = new ApiService();
