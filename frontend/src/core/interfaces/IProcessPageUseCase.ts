import type { ProcessPageUseCase } from '~src/use-cases/ProcessPageUseCase';

export interface IProcessPageUseCase {
  summary: string;
  htmlContent: any;
  actions: any[];
  execute(document: Document): Promise<ProcessPageUseCase>;
}