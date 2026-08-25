import { LoginCredentials, RegisterCredentials, AuthTokens, User } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('agritrace_access_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = 'An error occurred during the request.';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  public async login(credentials: LoginCredentials): Promise<AuthTokens> {
    return this.request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  public async register(credentials: RegisterCredentials): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  public async getMe(): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'GET',
    });
  }

  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return this.request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  public async listUsers(): Promise<User[]> {
    return this.request<User[]>('/auth/users', {
      method: 'GET',
    });
  }
}

export const api = new ApiService();
