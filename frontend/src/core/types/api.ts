export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  status: number;
  duration?: number;
}

export interface APIErrorContext {
  operation: string;
  url: string;
  duration: number;
  [key: string]: any;
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}