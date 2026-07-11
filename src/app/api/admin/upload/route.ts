import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const VIDEOS_ROOT = path.join(process.cwd(), '..', 'Videos');

export const config = {
    api: { bodyParser: false },
};

// POST /api/admin/upload — upload a video file to a series
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const series = formData.get('series') as string | null;
        const file = formData.get('file') as File | null;

        if (!series || !file) {
            return NextResponse.json({ error: 'Missing series or file' }, { status: 400 });
        }

        // Security: disallow path traversal
        if (series.includes('..') || series.includes('/') || series.includes('\\')) {
            return NextResponse.json({ error: 'Invalid series name' }, { status: 400 });
        }

        const seriesDir = path.join(VIDEOS_ROOT, series);
        fs.mkdirSync(seriesDir, { recursive: true });

        const filename = path.basename(file.name); // strip any path from the name
        const destPath = path.join(seriesDir, filename);

        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(destPath, buffer);

        return NextResponse.json({ success: true, filename });
    } catch (err) {
        console.error('Upload error:', err);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
