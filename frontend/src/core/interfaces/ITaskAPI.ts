import type { APIResponse } from '../types/api';

export interface PageTaskRequest {
  taskPrompt: string;
  actions: Record<string, any>;
  summary: string;
}

export interface ITaskAPI {
  requestPageTask(taskPrompt: string, actions: Record<string, any>, summary: string): Promise<APIResponse>;
}