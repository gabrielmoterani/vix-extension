import "~style.css"
import { useState, useRef, useEffect } from "react"
import { useLocale } from "../../lib/i18n"
import type { ChatMessage } from "../../lib/types/messaging"

interface ChatInterfaceProps {
  isReady: boolean
  disabled?: boolean
}

export function ChatInterface({ isReady, disabled = false }: ChatInterfaceProps) {
  const { t } = useLocale()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const conversationId = useRef(Math.random().toString(36).substr(2, 9))

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Listener para respostas do background
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === "CHAT_RESPONSE" && message.data.conversationId === conversationId.current) {
        console.log('VIX: Resposta do chat recebida:', message.data)
        console.log("#TODEBUG: Mensagem completa recebida:", JSON.stringify(message, null, 2))
        console.log("#TODEBUG: jsCommands recebidos:", message.data.jsCommands)
        
        const assistantMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          content: message.data.message,
          role: 'assistant',
          timestamp: Date.now()
        }

        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)

        // Executar comandos JS se houver
        if (message.data.jsCommands?.length > 0) {
          console.log("#TODEBUG: Executando comandos JS:", message.data.jsCommands)
          executeJsCommands(message.data.jsCommands)
        } else {
          console.log("#TODEBUG: NENHUM COMANDO JS PARA EXECUTAR!")
        }
      }

      if (message.type === "EXECUTE_JS_RESULT") {
        const resultMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          content: message.data.success
            ? `Comando executado: ${message.data.result ?? 'OK'}`
            : `Erro ao executar comando: ${message.data.error}`,
          role: 'assistant',
          timestamp: Date.now()
        }

        setMessages(prev => [...prev, resultMessage])
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [])

  const executeJsCommands = async (commands: string[]) => {
    console.log('VIX: Executando comandos JS:', commands)
    console.log("#TODEBUG: Iniciando execução de", commands.length, "comandos")

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      console.log(`#TODEBUG: Executando comando ${i + 1}/${commands.length}:`, command)
      
      try {
        // Enviar comando para content script executar
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        console.log("#TODEBUG: Tab ativa encontrada:", tab?.id)
        
        if (tab.id) {
          chrome.tabs.sendMessage(
            tab.id,
            { type: "EXECUTE_JS", command },
            (response) => {
              console.log(`#TODEBUG: Resposta do comando ${i + 1}:`, response)
              if (response?.success) {
                console.log("#TODEBUG: Comando executado com SUCESSO!")
              } else {
                console.log("#TODEBUG: Comando FALHOU:", response?.error)
              }
              chrome.runtime.sendMessage({
                type: "EXECUTE_JS_RESULT",
                data: {
                  command,
                  success: response?.success,
                  result: response?.result,
                  error: response?.error
                }
              })
            }
          )
        } else {
          console.log("#TODEBUG: ERRO - Nenhuma tab ativa encontrada!")
        }
      } catch (error) {
        console.error('#TODEBUG: Erro ao executar comando:', error)
      }
    }
  }

  const sendMessage = () => {
    if (!inputValue.trim() || isLoading || !isReady) return

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      content: inputValue.trim(),
      role: 'user',
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setInputValue("")

    // Enviar para background
    console.log("#TODEBUG: CHAT INTERFACE - Enviando mensagem para background")
    console.log("#TODEBUG: CHAT INTERFACE - Mensagem:", userMessage.content)
    console.log("#TODEBUG: CHAT INTERFACE - ConversationId:", conversationId.current)
    
    chrome.runtime.sendMessage({
      type: "CHAT_REQUEST",
      body: {
        message: userMessage.content,
        conversationId: conversationId.current
      }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <section 
      className="vix-border vix-border-gray-200 vix-rounded-lg vix-bg-white"
      role="region"
      aria-labelledby="chat-heading"
    >
      <header className="vix-p-3 vix-border-b vix-border-gray-200 vix-bg-gray-50 vix-rounded-t-lg">
        <h3 
          id="chat-heading"
          className="vix-font-medium vix-text-gray-800 vix-flex vix-items-center vix-gap-2"
        >
          <span role="img" aria-label="Chat">💬</span>
          {t("chat_title")}
        </h3>
        <p className="vix-text-xs vix-text-gray-600 vix-mt-1">
          {t("chat_subtitle")}
        </p>
      </header>

      <div className="vix-h-64 vix-overflow-y-auto vix-p-3 vix-space-y-3">
        {messages.length === 0 ? (
          <div className="vix-text-center vix-text-gray-500 vix-text-sm vix-py-8">
            <p>{t("chat_welcome")}</p>
            <p className="vix-text-xs vix-mt-2">{t("chat_examples")}</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`vix-p-3 vix-rounded-lg vix-max-w-[85%] ${
                message.role === 'user'
                  ? 'vix-bg-blue-50 vix-border vix-border-blue-200 vix-ml-auto vix-text-right'
                  : 'vix-bg-gray-50 vix-border vix-border-gray-200 vix-mr-auto'
              }`}
              role="article"
              aria-label={`Mensagem de ${message.role === 'user' ? t('user') : t('assistant')}`}
            >
              <p className="vix-text-sm vix-whitespace-pre-wrap">{message.content}</p>
              <time 
                className="vix-text-xs vix-text-gray-500 vix-mt-1 vix-block"
                dateTime={new Date(message.timestamp).toISOString()}
              >
                {new Date(message.timestamp).toLocaleTimeString()}
              </time>
            </div>
          ))
        )}

        {isLoading && (
          <div className="vix-bg-gray-50 vix-border vix-border-gray-200 vix-p-3 vix-rounded-lg vix-max-w-[85%] vix-mr-auto">
            <div className="vix-flex vix-items-center vix-gap-2">
              <div 
                className="vix-animate-spin vix-rounded-full vix-h-4 vix-w-4 vix-border-b-2 vix-border-blue-600"
                aria-hidden="true"
              ></div>
              <span className="vix-text-sm vix-text-gray-600">{t("thinking")}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <footer className="vix-p-3 vix-border-t vix-border-gray-200">
        <div className="vix-flex vix-gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isReady ? t("chat_placeholder_ready") : t("chat_placeholder_wait")}
            disabled={disabled || !isReady || isLoading}
            className="vix-flex-1 vix-px-3 vix-py-2 vix-border vix-border-gray-300 vix-rounded-md vix-text-sm focus:vix-ring-2 focus:vix-ring-blue-500 focus:vix-border-blue-500 disabled:vix-bg-gray-100"
            aria-label={t("chat_input_label")}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading || !isReady}
            className="vix-px-4 vix-py-2 vix-bg-blue-600 vix-text-white vix-rounded-md vix-text-sm vix-font-medium hover:vix-bg-blue-700 focus:vix-ring-2 focus:vix-ring-blue-500 disabled:vix-bg-gray-300 disabled:vix-cursor-not-allowed"
            aria-label={t("send_message_label")}
          >
            {isLoading ? "..." : t("send")}
          </button>
        </div>
      </footer>
    </section>
  )
}