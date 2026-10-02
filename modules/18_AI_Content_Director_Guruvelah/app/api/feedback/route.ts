import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/lib/db/server';
import { FeedbackInputSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    const body = await request.json();
    const input = FeedbackInputSchema.parse(body);

    const supabase = await createServerSupabaseClient();

    // Verify user owns the generation
    const { data: gen } = await supabase
      .from('generations')
      .select('id')
      .eq('id', input.generationId)
      .eq('user_id', user.id)
      .single();

    if (!gen) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Generation not found or access denied' } }, { status: 404 });
    }

    const { error } = await supabase.from('generation_feedback').upsert(
      {
        generation_id: input.generationId,
        user_id: user.id,
        rating: input.rating,
        feedback: input.feedback || null,
      },
      { onConflict: 'generation_id,user_id' }
    );

    if (error) {
      return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: err.message } }, { status: 500 });
  }
}
