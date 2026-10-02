
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/app')) {
     const session = request.cookies.get('better-auth.session_token');
     if (!session) {
        return NextResponse.redirect(new URL('/login', request.url));
     }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
