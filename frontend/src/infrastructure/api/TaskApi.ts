import { injectable, inject } from 'tsyringe';
import { APIEndpoints } from '../../core/config/api';
import { HttpClient } from '../http/HttpClient';
import { TOKENS } from '../../core/container/tokens';
import type { ITaskAPI } from '~src/core/interfaces/ITaskAPI';
import type { APIResponse } from '~src/core/types/api';

@injectable()
export class TaskAPI implements ITaskAPI {
  constructor(
    @inject(TOKENS.HttpClient) private httpClient: HttpClient
  ) {}

  async requestPageTask(
    taskPrompt: string,
    actions: Record<string, any>,
    summary: string
  ): Promise<APIResponse> {
    console.log("VIX: REQUESTING PAGE TASK", actions, summary);
    
    return this.httpClient.post(APIEndpoints.EXECUTE_PAGE_TASK, {
      html_content: JSON.stringify(actions),
      task_prompt: taskPrompt,
      page_summary: summary
    });
  }
}