import { useState, useRef, useEffect } from "react"
import type { ChatMessage } from "../../lib/types/messaging"

interface ChatInterfaceProps {
  isReady: boolean
  disabled?: boolean
}

export function ChatInterface({ isReady, disabled = false }: ChatInterfaceProps) {
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
          executeJsCommands(message.data.jsCommands)
        }
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [])

  const executeJsCommands = async (commands: string[]) => {
    console.log('VIX: Executando comandos JS:', commands)
    
    for (const command of commands) {
      try {
        // Enviar comando para content script executar
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "EXECUTE_JS",
            command
          })
        }
      } catch (error) {
        console.error('VIX: Erro ao executar comando:', error)
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
      className="border border-gray-200 rounded-lg bg-white"
      role="region"
      aria-labelledby="chat-heading"
    >
      <header className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 
          id="chat-heading"
          className="font-medium text-gray-800 flex items-center gap-2"
        >
          <span role="img" aria-label="Chat">💬</span>
          Assistente Conversacional
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Faça perguntas sobre a página ou solicite ações
        </p>
      </header>

      <div className="h-64 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <p>Olá! Como posso ajudá-lo com esta página?</p>
            <p className="text-xs mt-2">
              Exemplos: "Resumir este artigo", "Clicar no botão de login"
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg max-w-[85%] ${
                message.role === 'user'
                  ? 'bg-blue-50 border border-blue-200 ml-auto text-right'
                  : 'bg-gray-50 border border-gray-200 mr-auto'
              }`}
              role="article"
              aria-label={`Mensagem de ${message.role === 'user' ? 'usuário' : 'assistente'}`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <time 
                className="text-xs text-gray-500 mt-1 block"
                dateTime={new Date(message.timestamp).toISOString()}
              >
                {new Date(message.timestamp).toLocaleTimeString()}
              </time>
            </div>
          ))
        )}

        {isLoading && (
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg max-w-[85%] mr-auto">
            <div className="flex items-center gap-2">
              <div 
                className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"
                aria-hidden="true"
              ></div>
              <span className="text-sm text-gray-600">Pensando...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <footer className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isReady ? "Digite sua pergunta ou comando..." : "Aguarde a página carregar..."}
            disabled={disabled || !isReady || isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            aria-label="Campo de mensagem do chat"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading || !isReady}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            aria-label="Enviar mensagem"
          >
            {isLoading ? "..." : "Enviar"}
          </button>
        </div>
      </footer>
    </section>
  )
}