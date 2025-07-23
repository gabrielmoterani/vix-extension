# Image Filter Service

O `ImageFilterService` é um sistema inteligente de filtragem de imagens que remove automaticamente logos, ícones e imagens decorativas do processamento de alt text, economizando recursos e melhorando a experiência do usuário.

## Funcionalidades

### Filtros Implementados

1. **Filtro por Dimensões**
   - Remove imagens muito pequenas (< 100x100px por padrão)
   - Identifica possíveis logos por dimensões quadradas pequenas

2. **Filtro por URL**
   - Detecta padrões comuns em URLs: `logo`, `icon`, `brand`, etc.
   - Configurável através de arrays de padrões

3. **Filtro por Localização no DOM**
   - Remove imagens em áreas de navegação (`nav`, `header`, `footer`)
   - Detecta sidebars e widgets
   - Analisa classes e IDs dos ancestrais

4. **Filtro por Atributos**
   - Respeita `role="presentation"` e `aria-hidden="true"`
   - Analisa classes decorativas existentes

5. **Filtro Específico para Background Images**
   - Identifica elementos com texto significativo (background decorativo)
   - Detecta banners/hero images importantes
   - Analise contextual do propósito da imagem

## Uso

### Filtragem de Imagens Normais

```typescript
import { ImageFilterService } from '~/lib/services/imageFilterService'

// Filtrar uma imagem individual
const result = ImageFilterService.shouldProcessImage(image, element)

if (result.shouldProcess) {
  // Processar imagem
} else {
  console.log(`Imagem filtrada: ${result.reason} (${result.category})`)
}

// Filtrar lista de imagens
const { processable, filtered } = ImageFilterService.filterImages(images)
```

### Filtragem de Background Images

```typescript
// Filtrar background images
const { processable, filtered } = ImageFilterService.filterBackgroundImages(backgroundImages)
```

### Configuração Personalizada

```typescript
const customCriteria = {
  minWidth: 150,
  minHeight: 150,
  excludeNavigation: false, // Processar imagens em navegação
  logoUrlPatterns: ['logo', 'brand', 'trademark']
}

const result = ImageFilterService.shouldProcessImage(image, element, customCriteria)
```

## Critérios de Filtro

### Padrões de URL Padrão

**Logos:**
- `logo`, `brand`, `company`, `trademark`, `emblem`

**Ícones:**
- `icon`, `favicon`, `sprite`, `symbol`, `bullet`, `arrow`
- `check`, `close`, `menu`, `search`, `star`, `heart`

**Decorativos:**
- `decoration`, `ornament`, `divider`, `separator`, `border`
- `pattern`, `texture`, `gradient`, `shadow`

### Áreas Excluídas por Padrão

- **Navegação:** `nav`, `navbar`, `navigation`, `menu`
- **Header:** `header`, `masthead`, `top-bar`, `site-header`
- **Footer:** `footer`, `site-footer`, `page-footer`, `bottom-bar`
- **Sidebar:** `sidebar`, `aside`, `widget`, `side-nav`

## Estatísticas do Filtro

```typescript
const stats = ImageFilterService.getFilterStats(
  totalImages,
  processableImages,
  filteredByCategory
)

console.log(`Taxa de filtro: ${stats.filterRate}`)
console.log('Breakdown por categoria:', stats.categoryBreakdown)
```

## Categorias de Filtro

- **`content`**: Imagem de conteúdo que deve ser processada
- **`logo`**: Logo ou marca identificada
- **`icon`**: Ícone ou símbolo pequeno
- **`decorative`**: Imagem decorativa
- **`navigation`**: Imagem em área de navegação
- **`small`**: Imagem muito pequena

## Integração no Projeto

O filtro está integrado automaticamente no `imageDetectionService.ts` e é aplicado antes do envio das imagens para processamento no backend, resultando em:

- ✅ Menor consumo de recursos do backend
- ✅ Processamento mais rápido
- ✅ Melhor qualidade dos alt texts gerados
- ✅ Logs detalhados para debugging

## Logs de Debug

O sistema gera logs detalhados para facilitar o debugging:

```
VIX: Aplicando filtro inteligente...
VIX: Resultados do filtro: {
  totalDetected: 15,
  totalFiltered: 8,
  totalProcessable: 7,
  filterRate: '53.3%',
  categoryBreakdown: { logo: 3, icon: 2, small: 2, navigation: 1 }
}
VIX: Imagens normais filtradas: [
  { src: 'logo.png...', reason: 'URL contém padrão de logo: "logo"', category: 'logo' }
]
```

## Performance

- **Processamento local**: Toda filtragem é feita no cliente
- **Cache-friendly**: Não interfere no sistema de cache existente  
- **Non-blocking**: Processamento síncrono e rápido
- **Memory efficient**: Não mantém referências desnecessárias

## Testes

O serviço possui cobertura completa de testes unitários:

```bash
pnpm test src/lib/services/__tests__/imageFilterService.test.ts
```

Testa todos os cenários de filtro e casos extremos.