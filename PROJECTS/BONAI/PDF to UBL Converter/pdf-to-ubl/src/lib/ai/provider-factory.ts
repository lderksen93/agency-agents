import {
    ExtractionResult,
    OrgAiConfig,
} from '@/types/extraction';

/**
 * AI Provider interface — abstract over Document AI and OpenRouter
 */
export interface AiProvider {
    extract(pdfBuffer: Buffer): Promise<ExtractionResult>;
}

/**
 * Factory for AI provider selection based on organization config.
 * Uses dynamic imports to avoid loading unused providers at build time.
 */
export async function createAiProvider(config: OrgAiConfig): Promise<AiProvider> {
    if (config.aiProvider === 'document_ai') {
        const { DocumentAiProvider } = await import('./document-ai-client');
        return new DocumentAiProvider(config);
    } else {
        const { OpenRouterProvider } = await import('./openrouter-client');
        return new OpenRouterProvider(config);
    }
}
