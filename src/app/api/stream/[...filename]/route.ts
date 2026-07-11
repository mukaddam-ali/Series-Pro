import { NextResponse, NextRequest } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string[] }> }
) {
    const resolvedParams = await params;
    const segments = resolvedParams.filename;

    if (segments.length < 2) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const series = decodeURIComponent(segments[0]);
    const filename = decodeURIComponent(segments.slice(1).join('/'));
    const pathname = `videos/${series}/${filename}`;

    try {
        const { blobs } = await list({ prefix: pathname });
        const blob = blobs.find(b => b.pathname === pathname);

        if (!blob) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        // Redirect to Vercel Blob CDN URL — it supports HTTP Range requests natively
        return NextResponse.redirect(blob.url);
    } catch (error) {
        console.error('Stream error:', error);
        return NextResponse.json({ error: 'Stream failed' }, { status: 500 });
    }
}
