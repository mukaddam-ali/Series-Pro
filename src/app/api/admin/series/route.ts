import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const VIDEOS_ROOT = path.join(process.cwd(), '..', 'Videos');
const LEGACY_DIR = path.join(process.cwd(), '..', 'ExampleVideos');

// POST /api/admin/series — create a new series folder
export async function POST(request: NextRequest) {
    try {
        const { name } = await request.json();
        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Invalid series name' }, { status: 400 });
        }
        if (name.includes('..') || name.includes('/') || name.includes('\\')) {
            return NextResponse.json({ error: 'Invalid series name' }, { status: 400 });
        }

        const seriesDir = path.join(VIDEOS_ROOT, name.trim());
        if (fs.existsSync(seriesDir)) {
            return NextResponse.json({ error: 'Series already exists' }, { status: 409 });
        }
        fs.mkdirSync(seriesDir, { recursive: true });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Create series error:', err);
        return NextResponse.json({ error: 'Failed to create series' }, { status: 500 });
    }
}

// DELETE /api/admin/series — delete a video from a series
export async function DELETE(request: NextRequest) {
    try {
        const { series, filename } = await request.json();
        if (!series || !filename) {
            return NextResponse.json({ error: 'Missing params' }, { status: 400 });
        }

        const dir = series === 'ExampleVideos' ? LEGACY_DIR : path.join(VIDEOS_ROOT, series);
        const fullPath = path.join(dir, filename);

        // Security check: ensure path stays within expected directory
        if (!fullPath.startsWith(dir)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        if (!fs.existsSync(fullPath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        fs.unlinkSync(fullPath);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
