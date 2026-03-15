import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { validateApiKey } from '@/lib/auth/api-key-auth';
import { ConversionPipeline } from '@/lib/processing/conversion-pipeline';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '20') * 1024 * 1024;

/**
 * POST /api/v1/convert
 * Upload a PDF and start conversion to UBL XML.
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate via session or API key
        let organizationId: string;
        let userId: string | undefined;

        const apiKeyAuth = await validateApiKey(request);
        if (apiKeyAuth) {
            organizationId = apiKeyAuth.organizationId;
        } else {
            const session = await getServerSession(authOptions);
            if (!session?.user) {
                return NextResponse.json(
                    { error: 'unauthorized', message: 'Authenticatie vereist' },
                    { status: 401 }
                );
            }
            organizationId = (session.user as any).organizationId;
            userId = (session.user as any).id;
        }

        // Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'no_file', message: 'Geen PDF bestand meegegeven' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'file_too_large', message: `Bestand is te groot. Maximum is ${process.env.MAX_FILE_SIZE_MB || 20}MB.` },
                { status: 400 }
            );
        }

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json(
                { error: 'invalid_format', message: 'Alleen PDF bestanden worden ondersteund' },
                { status: 400 }
            );
        }

        const pdfBuffer = Buffer.from(await file.arrayBuffer());

        const adminContext = {
            name: formData.get('adminName') as string || undefined,
            address: formData.get('adminAddress') as string || undefined,
            kvk: formData.get('adminKvk') as string || undefined,
            iban: formData.get('adminIban') as string || undefined,
        };

        // Process conversion
        const pipeline = new ConversionPipeline();
        const result = await pipeline.process({
            pdfBuffer,
            filename: file.name,
            organizationId,
            userId,
            adminContext,
        });

        // Check if client wants raw XML response
        const acceptHeader = request.headers.get('accept') || '';
        if (acceptHeader.includes('application/xml') || acceptHeader.includes('text/xml')) {
            // Return raw UBL XML directly
            const xml = result.results?.[0]?.ublXml;
            if (xml) {
                const filename = file.name.replace(/\.pdf$/i, '') + '_ubl.xml';
                return new NextResponse(xml, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/xml; charset=utf-8',
                        'Content-Disposition': `attachment; filename="${filename}"`,
                        'X-Conversion-Id': result.conversionId,
                        'X-Credits-Used': String(result.creditsUsed || 0),
                        'X-Credits-Remaining': String(result.creditsRemaining || 0),
                        'X-Document-Type': result.documentType || 'invoice',
                        'X-Invoice-Count': String(result.invoiceCount || 1),
                        'X-Zero-Data-Retention': 'true',
                        'X-Processed-On-EU-Servers': 'true',
                    },
                });
            }
        }

        return NextResponse.json({
            ...result,
            zeroDataRetention: true,
            processedOnEuServers: true,
        });

    } catch (error: any) {
        if (error.message?.includes('Credit limiet')) {
            return NextResponse.json(
                {
                    error: 'credit_limit_reached',
                    message: error.message,
                    contactEmail: process.env.CONTACT_EMAIL || 'info@procai.nl',
                },
                { status: 402 }
            );
        }

        console.error('Conversion error:', error);
        console.error('Stack:', error instanceof Error ? error.stack : 'no stack');
        return NextResponse.json(
            { error: 'processing_error', message: error instanceof Error ? error.message : 'Er is een fout opgetreden bij de verwerking.' },
            { status: 500 }
        );
    }
}
