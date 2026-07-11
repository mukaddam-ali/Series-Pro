import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const VIDEOS_ROOT = path.join(process.cwd(), '..', 'Videos');
const LEGACY_DIR = path.join(process.cwd(), '..', 'ExampleVideos');

function resolveVideoPath(segments: string[]): string | null {
    if (segments.length < 2) return null;

    const series = decodeURIComponent(segments[0]);
    const filename = decodeURIComponent(segments.slice(1).join('/'));

    const dir =
        series === 'ExampleVideos'
            ? LEGACY_DIR
            : path.join(VIDEOS_ROOT, series);

    const fullPath = path.join(dir, filename);

    // Security: make sure path stays within the expected directory
    if (!fullPath.startsWith(dir)) return null;

    return fullPath;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string[] }> }
) {
    const resolvedParams = await params;
    const segments = resolvedParams.filename;
    const videoPath = resolveVideoPath(segments);

    if (!videoPath || !fs.existsSync(videoPath)) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    try {
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = request.headers.get('range');

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize) {
                return new NextResponse('', {
                    status: 416,
                    headers: { 'Content-Range': `bytes */${fileSize}` },
                });
            }

            const chunksize = end - start + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const stream = new ReadableStream({
                start(controller) {
                    file.on('data', (chunk: Buffer | string) => controller.enqueue(chunk));
                    file.on('end', () => controller.close());
                    file.on('error', (err: Error) => controller.error(err));
                },
                cancel() { file.destroy(); }
            });

            return new NextResponse(stream, {
                status: 206,
                headers: {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize.toString(),
                    'Content-Type': 'video/mp4',
                },
            });
        } else {
            const file = fs.createReadStream(videoPath);
            const stream = new ReadableStream({
                start(controller) {
                    file.on('data', (chunk: Buffer | string) => controller.enqueue(chunk));
                    file.on('end', () => controller.close());
                    file.on('error', (err: Error) => controller.error(err));
                },
                cancel() { file.destroy(); }
            });

            return new NextResponse(stream, {
                status: 200,
                headers: {
                    'Content-Length': fileSize.toString(),
                    'Content-Type': 'video/mp4',
                },
            });
        }
    } catch (error) {
        console.error('Stream error:', error);
        return NextResponse.json({ error: 'Stream failed' }, { status: 500 });
    }
}
