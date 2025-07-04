import { DomAltApplier } from "../../lib/services/domAltApplier"
import { DomFixApplier } from "../../lib/services/domFixApplier"

let jsPermissionGranted = false

export const setupMessageHandler = (altApplier: DomAltApplier, fixApplier: DomFixApplier) => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Handler para aplicar alt text quando concluído
    if (message.type === "IMAGE_ALT_COMPLETED") {
      console.log(
        "VIX: Aplicando alt text para",
        message.data.results.length,
        "imagens"
      )

      const appliedCount = altApplier.applyMultipleAltTexts(message.data.results)

      console.log(`VIX: Alt text aplicado a ${appliedCount} imagens`)
      sendResponse({ success: true, appliedCount })
      return
    }

    // Handler para executar JavaScript do chat
    if (message.type === "EXECUTE_JS") {
      console.log("VIX: Executando comando JS:", message.command)
      console.log("#TODEBUG: Content script recebeu comando:", message.command)

      /**
       * Sanitiza o comando removendo espaços e quebras de linha desnecessárias
       * @param cmd - Comando JavaScript a ser sanitizado
       * @returns Comando sanitizado
       */
      const sanitizeCommand = (cmd: string) => cmd.trim()
      
      /**
       * Verifica se o comando é seguro para execução
       * @param cmd - Comando a ser verificado
       * @returns true se seguro, false caso contrário
       */
      const isCommandSafe = (cmd: string) => {
        const blocked = [
          "chrome.runtime",       // Bloqueiar APIs do Chrome
          "fetch(",               // Bloquear requisições HTTP
          "XMLHttpRequest",       // Bloquear AJAX
          "localStorage",         // Bloquear acesso a localStorage
          "sessionStorage",       // Bloquear acesso a sessionStorage
          "document.cookie",      // Bloquear acesso a cookies
          "window.location",      // Bloquear mudança de URL
          "eval(",                // Bloquear eval
          "Function(",            // Bloquear criação de Function
          "setTimeout",           // Bloquear timers
          "setInterval",          // Bloquear intervalos
          "import(",              // Bloquear imports dinâmicos
          "require(",             // Bloquear require (Node.js)
        ]
        return !blocked.some((b) => cmd.includes(b))
      }

      /**
       * Valida se o comando usa seletores data-vix como esperado
       * @param cmd - Comando a ser validado
       * @returns true se válido, false caso contrário
       */
      const isValidVixCommand = (cmd: string) => {
        // Permitir apenas comandos que usam data-vix ou comandos DOM básicos
        const allowedPatterns = [
          /document\.querySelector\(\s*['"][^'"]*data-vix[^'"]*['"]\s*\)/,
          /document\.querySelectorAll\(\s*['"][^'"]*data-vix[^'"]*['"]\s*\)/,
          /\.click\(\s*\)/,
          /\.focus\(\s*\)/,
          /\.value\s*=/,                    // Para inputs: element.value = "texto"
          /\.textContent\s*=/,              // Para elementos: element.textContent = "texto"
          /\.innerText\s*=/,                // Para elementos: element.innerText = "texto"
          /\.innerHTML\s*=/,                // Para elementos: element.innerHTML = "html"
          /\.placeholder\s*=/,              // Para inputs: element.placeholder = "texto"
          /\.style\./,                      // Para estilos: element.style.display = "block"
          /\.setAttribute\(/,               // Para atributos: element.setAttribute("attr", "value")
          /\.removeAttribute\(/,            // Para remover atributos
          /\.classList\./,                  // Para classes: element.classList.add/remove/toggle
          /\.scrollIntoView\(/,             // Para scroll: element.scrollIntoView()
          /\.select\(\s*\)/,               // Para inputs: element.select()
          /\.blur\(\s*\)/,                 // Para inputs: element.blur()
          /\.submit\(\s*\)/,               // Para forms: element.submit()
          /\.reset\(\s*\)/,                // Para forms: element.reset()
          /\.checked\s*=/,                 // Para checkboxes: element.checked = true/false
          /\.disabled\s*=/,                // Para elementos: element.disabled = true/false
          /\.selectedIndex\s*=/,           // Para selects: element.selectedIndex = 0
        ]
        
        return allowedPatterns.some(pattern => pattern.test(cmd))
      }

      const sanitized = sanitizeCommand(message.command)

      // Verificar se o comando é seguro
      if (!isCommandSafe(sanitized)) {
        console.warn("VIX: Comando bloqueado por segurança:", sanitized)
        console.log("#TODEBUG: BLOQUEADO - Comando não seguro:", sanitized)
        sendResponse({ success: false, error: "Comando não permitido por segurança" })
        return
      }

      // Verificar se o comando usa padrões válidos do VIX
      if (!isValidVixCommand(sanitized)) {
        console.warn("VIX: Comando não usa padrões VIX válidos:", sanitized)
        console.log("#TODEBUG: BLOQUEADO - Comando não usa padrões VIX:", sanitized)
        sendResponse({ success: false, error: "Comando deve usar seletores data-vix ou métodos DOM básicos" })
        return
      }

      // Solicitar permissão do usuário (apenas uma vez por sessão)
      if (!jsPermissionGranted) {
        console.log("#TODEBUG: Solicitando permissão do usuário para:", sanitized)
        jsPermissionGranted = window.confirm(
          `VIX Extension deseja executar este comando:\n\n${sanitized}\n\nPermitir execução?`
        )
        console.log("#TODEBUG: Permissão do usuário:", jsPermissionGranted ? "CONCEDIDA" : "NEGADA")
      }

      if (!jsPermissionGranted) {
        console.log("#TODEBUG: Execução cancelada - sem permissão")
        sendResponse({ success: false, error: "Permissão negada pelo usuário" })
        return
      }

      try {
        console.log("#TODEBUG: Executando comando:", sanitized)
        
        // Verificar se é um comando de click e se o elemento existe
        if (sanitized.includes("querySelector") && sanitized.includes("data-vix")) {
          const match = sanitized.match(/\['data-vix="([^"]+)"\]/);
          if (match) {
            const vixId = match[1];
            const element = document.querySelector(`[data-vix="${vixId}"]`);
            console.log(`#TODEBUG: Procurando elemento data-vix="${vixId}":`, element);
            
            if (!element) {
              console.log("#TODEBUG: ELEMENTO NÃO ENCONTRADO! Procurando por:", vixId);
              const allVixElements = document.querySelectorAll('[data-vix]');
              console.log("#TODEBUG: Total de elementos com data-vix:", allVixElements.length);
              console.log("#TODEBUG: Primeiros 20 elementos encontrados:", Array.from(allVixElements).slice(0, 20).map(el => ({
                id: el.getAttribute('data-vix'),
                tag: el.tagName,
                text: el.textContent?.substring(0, 50),
                visible: el.offsetParent !== null
              })));
              
              // Procurar IDs similares
              const similarIds = Array.from(allVixElements)
                .map(el => el.getAttribute('data-vix'))
                .filter(id => id?.includes(vixId.substring(-5)) || vixId.includes(id?.substring(-5) || ''));
              console.log("#TODEBUG: IDs similares encontrados:", similarIds);
            } else {
              console.log("#TODEBUG: Elemento encontrado!", {
                tag: element.tagName,
                text: element.textContent?.substring(0, 50),
                visible: element.offsetParent !== null,
                rect: element.getBoundingClientRect(),
                clickable: element.offsetParent !== null && element.getBoundingClientRect().width > 0
              });
              
              // Verificar se elemento é realmente clicável
              if (element.offsetParent === null) {
                console.log("#TODEBUG: AVISO - Elemento está invisível!");
              }
              if (element.getBoundingClientRect().width === 0) {
                console.log("#TODEBUG: AVISO - Elemento tem largura zero!");
              }
            }
          }
        }
        
        // Executar o comando em um contexto seguro
        const result = new Function(sanitized)()
        console.log("#TODEBUG: Comando executado com sucesso:", result)
        console.log("VIX: Comando executado com sucesso:", result)
        
        // Se é um comando de click, verificar se realmente aconteceu
        if (sanitized.includes(".click()")) {
          console.log("#TODEBUG: Comando de click executado! Verificando se elemento ainda existe/mudou:")
          const match = sanitized.match(/\['data-vix="([^"]+)"\]/);
          if (match) {
            const vixId = match[1];
            const element = document.querySelector(`[data-vix="${vixId}"]`);
            if (element) {
              console.log("#TODEBUG: Elemento ainda existe após click:", {
                tag: element.tagName,
                text: element.textContent?.substring(0, 50),
                classes: element.className,
                visible: element.offsetParent !== null
              });
            }
          }
        }
        
        sendResponse({ success: true, result: String(result || 'OK') })
      } catch (error) {
        console.error("#TODEBUG: ERRO na execução:", error)
        console.error("VIX: Erro ao executar comando JS:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Erro na execução"
        })
      }
    }

    if (message.type === "WCAG_APPLY_FIXES") {
      const applied = fixApplier.applyFixes(message.data.fixes)
      sendResponse({ success: true, applied })
      return
    }

    // Handler para reset (útil para debugging)
    if (message.type === "RESET_ALT_APPLIER") {
      altApplier.reset()
      sendResponse({ success: true })
    }
  })
}