import { injectable } from 'tsyringe';
import { API_CONFIG } from '../../core/config/api';
import type { APIErrorContext, APIResponse, RequestConfig } from '~src/core/types/api';

@injectable()
export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = API_CONFIG.DEFAULT_HEADERS;
  }

  private handleNetworkError(error: any, context: APIErrorContext): never {
    let errorType = 'Unknown error';
    let errorDetails = '';

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      if (error.message.includes('Failed to fetch')) {
        errorType = 'NetworkError';
        errorDetails = 'Unable to reach the server. Please check your internet connection and server availability.';
      } else if (error.message.includes('CORS')) {
        errorType = 'CORS Error';
        errorDetails = 'Cross-Origin Request Blocked. The server needs to allow requests from this origin.';
      }
    } else if (error.name === 'AbortError') {
      errorType = 'RequestTimeout';
      errorDetails = 'The request took too long and was aborted.';
    }

    const errorInfo = {
      type: errorType,
      message: error.message,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      ...context
    };

    console.error(`${context.operation} failed:`, errorInfo);
    throw new Error(`${context.operation} failed: ${errorType} - ${errorDetails}`);
  }

  async post<T>(
    endpoint: string, 
    data: any, 
    config: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(), 
        config.timeout || API_CONFIG.TIMEOUT
      );

      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { ...this.defaultHeaders, ...config.headers },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = (Date.now() - startTime) / 1000;

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `HTTP ${response.status} - ${response.statusText}\n` +
          `Response: ${errorBody}`
        );
      }

      const result = await response.json();
      
      return {
        data: result,
        success: true,
        status: response.status,
        duration
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.handleNetworkError(error, {
        operation: `POST ${endpoint}`,
        url,
        duration,
        payload: data
      });
    }
  }
}