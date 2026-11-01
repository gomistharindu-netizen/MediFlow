export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export class ApiClient {
  private static tenantId: string = 'arogya';
  private static authToken: string | null = null;

  public static setTenant(tenantId: string) {
    this.tenantId = tenantId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mediflow_tenant_id', tenantId);
      document.cookie = `mediflow_tenant=${tenantId}; path=/; max-age=86400; SameSite=Lax`;
    }
  }

  public static getTenant(): string {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mediflow_tenant_id');
      if (stored) return stored;
    }
    return this.tenantId;
  }

  public static setToken(token: string | null, tenantId?: string, role?: string) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('mediflow_token', token);
        document.cookie = `mediflow_token=${token}; path=/; max-age=86400; SameSite=Lax`;
        if (tenantId) {
          document.cookie = `mediflow_tenant=${tenantId}; path=/; max-age=86400; SameSite=Lax`;
        }
        if (role) {
          localStorage.setItem('mediflow_role', role);
          document.cookie = `mediflow_role=${role}; path=/; max-age=86400; SameSite=Lax`;
        }
      } else {
        localStorage.removeItem('mediflow_token');
        localStorage.removeItem('mediflow_role');
        document.cookie = `mediflow_token=; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `mediflow_role=; path=/; max-age=0; SameSite=Lax`;
      }
    }
  }

  public static clearSession() {
    this.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mediflow_user');
      localStorage.removeItem('mediflow_role');
      document.cookie = `mediflow_token=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `mediflow_role=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `mediflow_tenant=; path=/; max-age=0; SameSite=Lax`;
    }
  }

  public static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mediflow_token') || this.authToken;
    }
    return this.authToken;
  }

  private static getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Tenant': this.getTenant(),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  public static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  }

  public static get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public static post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static put<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static patch<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  public static async upload<T = any>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Tenant': this.getTenant(),
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || `Upload failed with status ${response.status}`);
    }
    return data;
  }
}
