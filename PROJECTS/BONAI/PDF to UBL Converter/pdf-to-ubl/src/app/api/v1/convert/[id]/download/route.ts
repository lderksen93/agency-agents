import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { validateApiKey } from '@/lib/auth/api-key-auth';
import Database from 'better-sqlite3';
import path from 'path';

/**
 * GET /api/v1/convert/[id]/download?index=0 — Download UBL XML as .xml file.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const apiKeyAuth = await validateApiKey(request);
        if (!apiKeyAuth) {
            const session = await getServerSession(authOptions);
            if (!session?.user) {
                return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
            }
        }

        const db = new Database(path.resolve(process.cwd(), 'prisma/dev.db'), { readonly: true });

        const conversion = db.prepare('SELECT * FROM Conversion WHERE id = ?').get(params.id) as any;
        if (!conversion) {
            db.close();
            return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const index = parseInt(searchParams.get('index') || '0', 10);

        const results = db.prepare(
            'SELECT ublXml FROM ConversionResult WHERE conversionId = ? ORDER BY invoiceIndex ASC'
        ).all(params.id) as any[];

        db.close();

        if (!results[index] || !results[index].ublXml) {
            return NextResponse.json({ error: 'no_xml_found' }, { status: 404 });
        }

        const xml = results[index].ublXml;
        const baseName = (conversion.originalFilename || 'factuur').replace(/\.pdf$/i, '');
        const filename = `${baseName}_ubl_${index}.xml`;

        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
