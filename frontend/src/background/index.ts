import { setupExtensionConfig } from "./services/extensionConfig"
import { setupMessageRouter } from "./services/messageRouter"
import { setupTabMonitor } from "./services/tabMonitor"

// Inicializar todos os serviços
setupExtensionConfig()
setupMessageRouter()
setupTabMonitor()

export {}
