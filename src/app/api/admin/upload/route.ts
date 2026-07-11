import { handleUpload, type HandleUploadBody } from '@vercel/blob/multipart';
import { NextResponse, NextRequest } from 'next/server';

// POST /api/admin/upload — handles token generation for client-side Vercel Blob uploads
// The client calls upload() from @vercel/blob/client, which calls this endpoint for auth tokens
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Allow video file uploads up to 5GB
        return {
          allowedContentTypes: [
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-matroska',
            'video/*',
          ],
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024, // 5 GB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload completed:', blob.url, blob.pathname);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
