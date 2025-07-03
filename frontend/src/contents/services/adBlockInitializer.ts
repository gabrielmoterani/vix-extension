import { AdBlockService } from "../../lib/services/adBlockService"

export const initializeAdBlock = async (adBlockService: AdBlockService): Promise<boolean> => {
  console.log("VIX: Removendo anúncios da página...")
  
  try {
    const adBlockResult = await adBlockService.removeAdsFromDOM(document)
    console.log(`VIX: Anúncios removidos: ${adBlockResult.removedCount} elementos`)
    
    if (adBlockResult.processedSelectors.length > 0) {
      console.log("VIX: Seletores processados:", adBlockResult.processedSelectors)
    }
    
    return true
  } catch (error) {
    console.error("VIX: Erro ao remover anúncios:", error)
    return false
  }
}