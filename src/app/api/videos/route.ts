import { NextResponse, NextRequest } from 'next/server';
import { list } from '@vercel/blob';
import path from 'path';

const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm']);

async function getSeries(): Promise<string[]> {
  const { blobs } = await list({ prefix: 'videos/' });
  const series = new Set<string>();
  for (const blob of blobs) {
    const rel = blob.pathname.replace(/^videos\//, '');
    const folder = rel.split('/')[0];
    if (folder) series.add(folder);
  }
  return [...series].sort();
}

async function getVideos(seriesName: string): Promise<string[]> {
  const { blobs } = await list({ prefix: `videos/${seriesName}/` });
  return blobs
    .map(b => b.pathname.split('/').pop()!)
    .filter(f => f && f !== '.keep' && VIDEO_EXTS.has(path.extname(f).toLowerCase()));
}

export async function GET(request: NextRequest) {
  try {
    const series = request.nextUrl.searchParams.get('series');

    if (series) {
      const videos = await getVideos(series);
      return NextResponse.json({ videos });
    } else {
      const seriesList = await getSeries();
      return NextResponse.json({ series: seriesList });
    }
  } catch (error) {
    console.error('API /videos error:', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
