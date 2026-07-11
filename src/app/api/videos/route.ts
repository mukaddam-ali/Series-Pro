import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const VIDEOS_ROOT = path.join(process.cwd(), '..', 'Videos');
const LEGACY_DIR = path.join(process.cwd(), '..', 'ExampleVideos');

const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm']);

function getSeries(): string[] {
  const series: string[] = [];

  // New multi-series Videos folder
  if (fs.existsSync(VIDEOS_ROOT)) {
    const entries = fs.readdirSync(VIDEOS_ROOT, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) series.push(e.name);
    }
  }

  // Legacy ExampleVideos folder (kept for backwards compatibility)
  if (fs.existsSync(LEGACY_DIR)) {
    series.push('ExampleVideos');
  }

  return series;
}

function getVideos(seriesName: string): string[] {
  const dir =
    seriesName === 'ExampleVideos'
      ? LEGACY_DIR
      : path.join(VIDEOS_ROOT, seriesName);

  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter(f => VIDEO_EXTS.has(path.extname(f).toLowerCase()));
}

export async function GET(request: NextRequest) {
  try {
    const series = request.nextUrl.searchParams.get('series');

    if (series) {
      // Return video list for a specific series
      const videos = getVideos(series);
      return NextResponse.json({ videos });
    } else {
      // Return list of all series
      const seriesList = getSeries();
      return NextResponse.json({ series: seriesList });
    }
  } catch (error) {
    console.error('API /videos error:', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
