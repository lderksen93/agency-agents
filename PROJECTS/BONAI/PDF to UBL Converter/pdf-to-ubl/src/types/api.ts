// API request/response types

export interface ConvertRequest {
    file: File;
    adminName?: string;
    adminAddress?: string;
    adminKvk?: string;
    adminIban?: string;
}

export interface ConvertResponse {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'flagged';
    estimatedTimeMs?: number;
    pollUrl: string;
}

export interface ConversionResultResponse {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'flagged';
    documentType: string;
    invoiceCount: number;
    creditsUsed: number;
    creditsRemaining: number;
    results: ConversionResultItem[];
    zeroDataRetention: boolean;
    processedOnEuServers: boolean;
}

export interface ConversionResultItem {
    invoiceIndex: number;
    overallConfidence: number;
    flaggedForReview: boolean;
    flaggedFields: string[];
    extractedData: Record<string, {
        value: string | number | null;
        confidence: number;
        needsReview: boolean;
    }>;
    ublXml?: string;
    validationResult: {
        isValid: boolean;
        errors: { code: string; message: string }[];
        warnings: { code: string; message: string }[];
    };
}

export interface CreditResult {
    allowed: boolean;
    message?: string;
    remaining: number;
}

export interface CreditBalanceResponse {
    balance: number;
    totalUsed: number;
    limit: number;
}

export interface ApiKeyResponse {
    id: string;
    name: string;
    keyPreview: string;
    lastUsedAt: string | null;
    createdAt: string;
    isActive: boolean;
}

export interface CreateApiKeyRequest {
    name: string;
}

export interface CreateApiKeyResponse {
    id: string;
    name: string;
    key: string; // Full key, only shown once
}

export interface ErrorResponse {
    error: string;
    message: string;
    contactEmail?: string;
    creditsUsed?: number;
    creditsRemaining?: number;
}
