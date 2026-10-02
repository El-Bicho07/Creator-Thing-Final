import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/lib/db/server';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const goal = searchParams.get('goal');
    const savedOnly = searchParams.get('saved') === 'true';
    const query = searchParams.get('q')?.toLowerCase();

    const supabase = await createServerSupabaseClient();
    let dbQuery = supabase
      .from('generations')
      .select('id, input_topic, platform, content_goal, creator_angle, is_saved, created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (platform) dbQuery = dbQuery.eq('platform', platform);
    if (goal) dbQuery = dbQuery.eq('content_goal', goal);
    if (savedOnly) dbQuery = dbQuery.eq('is_saved', true);

    const { data, error } = await dbQuery;
    if (error) {
      return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
    }

    let filtered = data || [];
    if (query) {
      filtered = filtered.filter(
        (g) =>
          g.input_topic.toLowerCase().includes(query) ||
          (g.creator_angle && g.creator_angle.toLowerCase().includes(query))
      );
    }

    return NextResponse.json({ generations: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: err.message } }, { status: 500 });
  }
}
