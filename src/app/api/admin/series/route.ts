import { NextResponse, NextRequest } from 'next/server';
import { put, list, del } from '@vercel/blob';

// POST /api/admin/series — create a new series
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid series name' }, { status: 400 });
    }
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return NextResponse.json({ error: 'Invalid series name' }, { status: 400 });
    }

    const trimmed = name.trim();
    const { blobs } = await list({ prefix: `videos/${trimmed}/` });
    if (blobs.length > 0) {
      return NextResponse.json({ error: 'Series already exists' }, { status: 409 });
    }

    // Create a placeholder blob to mark the series as existing
    await put(`videos/${trimmed}/.keep`, '', { access: 'public' });
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

    const pathname = `videos/${series}/${filename}`;
    const { blobs } = await list({ prefix: pathname });
    const blob = blobs.find(b => b.pathname === pathname);

    if (!blob) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await del(blob.url);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
