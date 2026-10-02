import { GET as getGenerations } from '../generations/route';

export async function GET(request: Request) {
  return getGenerations(request);
}
