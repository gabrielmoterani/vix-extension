import { injectable, inject } from 'tsyringe';
import { APIEndpoints } from '../../core/config/api';
import { HttpClient } from '../http/HttpClient';
import { TOKENS } from '../../core/container/tokens';
import type { IContentAPI } from '~src/core/interfaces/IContentAPI';
import type { APIResponse } from '~src/core/types/api';

@injectable()
export class ContentAPI implements IContentAPI {
  
  constructor(@inject(TOKENS.HttpClient) private httpClient: HttpClient) {}

  async requestImageAltText(
    imageUrl: string, 
    summary: string, 
    model?: string
  ): Promise<APIResponse> {
    return this.httpClient.post(APIEndpoints.PARSE_IMAGE, {
      content: { imageUrl, summary, model }
    });
  }

  async requestSummary(
    texts: string[], 
    model?: string
  ): Promise<APIResponse> {
    return this.httpClient.post(APIEndpoints.SUMMARIZE_PAGE, {
      content: texts,
      model
    });
  }

  async requestWCAGCheck(
    jsonContent: Record<string, any>
  ): Promise<APIResponse> {
    return this.httpClient.post(APIEndpoints.WCAG_CHECK, {
      content: JSON.stringify(jsonContent)
    });
  }
}