import type { APIResponse } from '../types/api';

export interface ImageAltTextRequest {
  imageUrl: string;
  summary: string;
}

export interface SummaryRequest {
  texts: string[];
}

export interface WCAGCheckRequest {
  jsonContent: Record<string, any>;
}


export interface IContentAPI {
  requestImageAltText(imageUrl: string, summary: string, model?: string): Promise<APIResponse>;
  requestSummary(texts: string[], model?: string): Promise<APIResponse>;
  requestWCAGCheck(jsonContent: Record<string, any>): Promise<APIResponse>;
}