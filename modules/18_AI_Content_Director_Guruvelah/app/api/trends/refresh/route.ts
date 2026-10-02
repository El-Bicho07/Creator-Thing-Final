import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/admin';
import { getAuthenticatedUser } from '@/lib/db/server';
import { ingestLiveTrends } from '@/lib/trends/ingest';

// Cron Endpoint (Vercel Cron Sends GET)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret token' } }, { status: 401 });
  }

  try {
    const adminSupabase = createAdminClient();
    const region = process.env.TREND_REGION || 'IN';
    const count = await ingestLiveTrends(adminSupabase, region);

    return NextResponse.json({ success: true, count });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'CRON_ERROR', message: err.message } }, { status: 500 });
  }
}

// Authenticated User On-demand Refresh Endpoint
export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const region = process.env.TREND_REGION || 'IN';
    const count = await ingestLiveTrends(adminSupabase, region);

    return NextResponse.json({ success: true, count });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'REFRESH_ERROR', message: err.message } }, { status: 500 });
  }
}
