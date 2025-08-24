const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

console.log('🔧 API Configuration:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL,
  VITE_GITHUB_CLIENT_ID: import.meta.env.VITE_GITHUB_CLIENT_ID,
  NODE_ENV: import.meta.env.NODE_ENV
});

class ApiClient {
  private token: string | null = null;

  private getValidToken(): string | null {
    // secureStorage 시스템과 일관성 있게 토큰 가져오기
    try {
      const storagePrefix = 'vibetorch_';
      let itemStr = localStorage.getItem(`${storagePrefix}auth_token`);
      if (!itemStr) {
        itemStr = sessionStorage.getItem(`${storagePrefix}auth_token`);
      }
      
      if (itemStr) {
        const item = JSON.parse(itemStr);
        if (Date.now() <= item.expiry) {
          return item.value;
        } else {
          // 만료된 토큰 정리
          localStorage.removeItem(`${storagePrefix}auth_token`);
          sessionStorage.removeItem(`${storagePrefix}auth_token`);
        }
      }
    } catch (error) {
      console.error('Error getting valid token:', error);
    }
    
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const currentToken = this.getValidToken();
    if (currentToken) {
      headers.Authorization = `Bearer ${currentToken}`;
    }

    console.log('🌐 API Request:', {
      url,
      method: options.method || 'GET',
      headers,
      body: options.body
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('📡 API Response:', {
        url,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.removeToken();
          throw new Error('Authentication required');
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('❌ Fetch Error:', {
        url,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async get<T>(endpoint: string, options?: { headers?: HeadersInit }): Promise<T> {
    return this.request<T>(endpoint, { 
      method: 'GET',
      headers: options?.headers 
    });
  }

  async post<T>(endpoint: string, data?: any, options?: { headers?: HeadersInit }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: options?.headers
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  setToken(token: string): void {
    this.token = token;
    // secureStorage에서 관리하므로 여기서는 직접 저장하지 않음
  }

  removeToken(): void {
    this.token = null;
    // secureStorage에서 관리하므로 여기서는 직접 제거하지 않음
  }
}

export const apiClient = new ApiClient();