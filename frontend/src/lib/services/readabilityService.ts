// src/lib/services/readabilityService.ts
import { Readability } from '@mozilla/readability';

export interface ArticleContent {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string | null;
  dir: string | null;
  siteName: string | null;
}

export interface ReadabilityOptions {
  debug?: boolean;
  maxElemsToParse?: number;
  nbTopCandidates?: number;
  charThreshold?: number;
  classesToPreserve?: string[];
  keepClasses?: boolean;
}

export interface ReadabilityResult {
  success: boolean;
  article?: ArticleContent;
  error?: string;
  processingTime: number;
  fallbackUsed: boolean;
}

export class ReadabilityService {
  private cache = new Map<string, ReadabilityResult>();
  private readonly defaultOptions: ReadabilityOptions = {
    debug: false,
    maxElemsToParse: 0,
    nbTopCandidates: 5,
    charThreshold: 500,
    classesToPreserve: ['img', 'figure', 'picture', 'video'],
    keepClasses: true
  };

  /**
   * Processa documento usando Readability com fallback
   */
  parseDocument(
    document: Document, 
    options: ReadabilityOptions = {}
  ): ReadabilityResult {
    const startTime = Date.now();
    const url = document.location?.href || 'unknown';
    
    // Verificar cache baseado na URL e conteúdo
    const cacheKey = this.generateCacheKey(url, document.title);
    if (this.cache.has(cacheKey)) {
      console.log('VIX: Using cached Readability result');
      return this.cache.get(cacheKey)!;
    }

    try {
      // Clonar documento para não modificar o original
      const clonedDoc = document.cloneNode(true) as Document;
      
      // Pré-processamento para melhorar resultados
      this.preprocessDocument(clonedDoc);
      
      // Configurar opções
      const finalOptions = { ...this.defaultOptions, ...options };
      
      // Criar instância do Readability
      const reader = new Readability(clonedDoc, finalOptions);
      
      // Tentar parsear
      const article = reader.parse();
      
      const processingTime = Date.now() - startTime;
      
      if (article && this.isValidArticle(article)) {
        const result: ReadabilityResult = {
          success: true,
          article: article as ArticleContent,
          processingTime,
          fallbackUsed: false
        };
        
        // Cache do resultado
        this.cache.set(cacheKey, result);
        
        console.log(`VIX: Readability success in ${processingTime}ms`);
        return result;
      } else {
        // Fallback para extração básica
        return this.fallbackExtraction(document, processingTime);
      }
      
    } catch (error) {
      console.warn('VIX: Readability parsing failed:', error);
      return this.fallbackExtraction(document, Date.now() - startTime);
    }
  }

  /**
   * Verifica se o artigo extraído é válido
   */
  private isValidArticle(article: any): boolean {
    return article && 
           article.textContent && 
           article.textContent.length > 200 &&
           article.content &&
           article.title;
  }

  /**
   * Fallback quando Readability falha
   */
  private fallbackExtraction(document: Document, processingTime: number): ReadabilityResult {
    console.log('VIX: Using fallback content extraction');
    
    try {
      const title = document.title || 
                   document.querySelector('h1')?.textContent || 
                   'Untitled';
      
      // Tentar encontrar conteúdo principal
      const contentSelectors = [
        'main', 'article', '.content', '.post', '.entry',
        '[role="main"]', '.main-content', '#content'
      ];
      
      let contentElement: Element | null = null;
      for (const selector of contentSelectors) {
        contentElement = document.querySelector(selector);
        if (contentElement) break;
      }
      
      // Se não encontrar, usar body excluindo navegação
      if (!contentElement) {
        contentElement = document.body;
      }
      
      // Limpar elementos indesejados
      const unwantedSelectors = [
        'nav', 'aside', 'footer', 'header', '.sidebar', 
        '.menu', '.ad', '.ads', '.advertisement', '.banner'
      ];
      
      const clonedContent = contentElement.cloneNode(true) as Element;
      unwantedSelectors.forEach(selector => {
        const elements = clonedContent.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
      
      const textContent = clonedContent.textContent || '';
      const content = clonedContent.innerHTML;
      
      const result: ReadabilityResult = {
        success: true,
        article: {
          title,
          content,
          textContent,
          length: textContent.length,
          excerpt: textContent.substring(0, 200) + '...',
          byline: this.extractByline(document),
          dir: document.documentElement.dir || null,
          siteName: this.extractSiteName(document)
        },
        processingTime,
        fallbackUsed: true
      };
      
      return result;
      
    } catch (error) {
      console.error('VIX: Fallback extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        fallbackUsed: true
      };
    }
  }

  /**
   * Pré-processamento do documento
   */
  private preprocessDocument(document: Document): void {
    // Remover elementos que atrapalham o Readability
    const problematicSelectors = [
      'script[src*="ads"]',
      'div[id*="ad"]',
      'div[class*="ad"]',
      '.popup',
      '.modal',
      '.overlay'
    ];
    
    problematicSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      } catch (error) {
        console.warn(`VIX: Error removing ${selector}:`, error);
      }
    });
  }

  /**
   * Extrair byline (autor)
   */
  private extractByline(document: Document): string | null {
    const bylineSelectors = [
      '.byline', '.author', '.writer', '.by-author',
      '[rel="author"]', '.post-author', '.article-author'
    ];
    
    for (const selector of bylineSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }
    
    return null;
  }

  /**
   * Extrair nome do site
   */
  private extractSiteName(document: Document): string | null {
    // Tentar meta property
    const siteName = document.querySelector('meta[property="og:site_name"]');
    if (siteName) {
      return siteName.getAttribute('content');
    }
    
    // Fallback para hostname
    return document.location?.hostname || null;
  }

  /**
   * Gerar chave de cache
   */
  private generateCacheKey(url: string, title: string): string {
    return `${url}:${title}`.substring(0, 100);
  }

  /**
   * Limpar cache (útil para desenvolvimento)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('VIX: Readability cache cleared');
  }

  /**
   * Estatísticas do cache
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Método simplificado para extrair apenas o texto
   */
  extractTextContent(document: Document): string {
    const result = this.parseDocument(document);
    return result.article?.textContent || '';
  }

  /**
   * Verificar se uma página é adequada para Readability
   */
  isReadabilityCandidate(document: Document): boolean {
  try {
    // 1. Verificar se tem conteúdo suficiente
    const bodyText = document.body.textContent || '';
    const textLength = bodyText.trim().length;
    
    if (textLength < 100) {
      console.log('VIX: Not a readability candidate - insufficient text:', textLength);
      return false;
    }
    
    // 2. Verificar estrutura semântica
    const structureChecks = [
      // Elementos semânticos HTML5
      { selector: 'article', name: 'article' },
      { selector: 'main', name: 'main' },
      // Headings
      { selector: 'h1', name: 'h1' },
      { selector: 'h2', name: 'h2' },
      // Parágrafos
      { selector: 'p', name: 'paragraphs' },
      // Classes comuns de conteúdo
      { selector: '.post', name: 'post class' },
      { selector: '.entry', name: 'entry class' },
      { selector: '.content', name: 'content class' }
    ];
    
    let foundStructures = 0;
    const structureResults: any[] = [];
    
    for (const check of structureChecks) {
      const elements = document.querySelectorAll(check.selector);
      const count = elements.length;
      
      structureResults.push({
        selector: check.selector,
        name: check.name,
        count
      });
      
      if (count > 0) {
        foundStructures++;
      }
    }
    
    // 3. Verificar se tem pelo menos alguma estrutura semântica
    const hasGoodStructure = foundStructures >= 1;
    
    // 4. Verificar densidade de texto vs elementos
    const allElements = document.querySelectorAll('*').length;
    const textDensity = textLength / Math.max(allElements, 1);
    const hasGoodDensity = textDensity > 5; // Pelo menos 5 caracteres por elemento
    
    const isCandidate = hasGoodStructure && hasGoodDensity;
    
    console.log('VIX: Readability candidate analysis:', {
      textLength,
      foundStructures,
      totalElements: allElements,
      textDensity: Math.round(textDensity * 100) / 100,
      hasGoodStructure,
      hasGoodDensity,
      isCandidate,
      structures: structureResults.filter(s => s.count > 0)
    });
    
    return isCandidate;
    
  } catch (error) {
    console.warn('VIX: Error in readability candidate check:', error);
    return false;
  }
}
}