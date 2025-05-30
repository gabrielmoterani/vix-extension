export const API_CONFIG = {
  BASE_URL: 'https://vix-monorepo.fly.dev/api',
  TIMEOUT: 30000,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }
} as const;

export enum APIEndpoints {
  PARSE_IMAGE = '/parse_image',
  SUMMARIZE_PAGE = '/summarize_page',
  WCAG_CHECK = '/wcag_check',
  EXECUTE_PAGE_TASK = '/execute_page_task'
}