import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

/**
 * GET /api/admin/openrouter-models — Fetch available models from OpenRouter.
 * Filters for vision/multimodal models that can process PDFs.
 * Caches result for 1 hour.
 */

let cachedModels: any[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }

        // Return cached if still fresh
        if (cachedModels && Date.now() - cacheTime < CACHE_DURATION) {
            return NextResponse.json({ models: cachedModels });
        }

        const res = await fetch('https://openrouter.ai/api/v1/models');
        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch models' }, { status: 502 });
        }

        const data = await res.json();
        const allModels = data.data || [];

        // Filter for vision/multimodal models (can process images/PDFs)
        const visionModels = allModels.filter((m: any) => {
            const modality = m.architecture?.modality || '';
            return modality.includes('image') || modality.includes('file') || modality.includes('multi');
        });

        // Format for frontend
        const formatted = visionModels
            .map((m: any) => ({
                id: m.id,
                name: m.name,
                contextLength: m.context_length,
                modality: m.architecture?.modality || '',
                promptPrice: parseFloat(m.pricing?.prompt || '0'),
                completionPrice: parseFloat(m.pricing?.completion || '0'),
                description: (m.description || '').substring(0, 200),
            }))
            .sort((a: any, b: any) => a.promptPrice - b.promptPrice);

        cachedModels = formatted;
        cacheTime = Date.now();

        return NextResponse.json({ models: formatted });
    } catch (error) {
        console.error('Error fetching OpenRouter models:', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
