import { NextResponse } from 'next/server';
import { getEnvStatus } from '@/lib/utils/env';

export async function GET() {
  const status = getEnvStatus();
  return NextResponse.json(status, { status: 200 });
}
