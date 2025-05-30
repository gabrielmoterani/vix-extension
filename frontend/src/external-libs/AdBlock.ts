import { AD_BLOCK_RULES } from './AdBlockRules';

export class AdBlock {
  private rules: string[] = [];
  
  constructor() {
    // Regras básicas de ad blocking
    this.rules = AD_BLOCK_RULES 
  }
  
  parse(rule: string): void {
    this.rules.push(rule.replace(/\|\||\^/g, ''));
  }
  
  matches(url: string): boolean {
    if (!url) return false;
    
    const lowercaseUrl = url.toLowerCase();
    return this.rules.some(rule => 
      lowercaseUrl.includes(rule.toLowerCase())
    );
  }
  
  // Método para carregar regras customizadas
  loadRules(rules: string[]): void {
    this.rules = [...this.rules, ...rules];
  }
}