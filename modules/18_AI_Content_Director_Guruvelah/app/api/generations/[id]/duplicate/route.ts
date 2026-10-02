import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/lib/db/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    const { id: generationId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: original } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generationId)
      .eq('user_id', user.id)
      .single();

    if (!original) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Generation not found' } }, { status: 404 });
    }

    const { id, created_at, updated_at, ...rest } = original;

    const { data: copyRow, error } = await supabase
      .from('generations')
      .insert({
        ...rest,
        input_topic: `${original.input_topic} (Copy)`,
        is_saved: false,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ newGenerationId: copyRow.id });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: err.message } }, { status: 500 });
  }
}
