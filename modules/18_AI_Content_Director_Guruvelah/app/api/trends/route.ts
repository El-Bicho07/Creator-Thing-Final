import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/lib/db/server';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const supabase = await createServerSupabaseClient();

    // Fetch global trends (user_id IS NULL) + user's own trends
    let query = supabase
      .from('trends')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(30);

    if (user) {
      query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
    } else {
      query = query.is('user_id', null);
    }

    const { data: trends, error } = await query;
    if (error) {
      return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ trends: trends || [] });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: err.message } }, { status: 500 });
  }
}
