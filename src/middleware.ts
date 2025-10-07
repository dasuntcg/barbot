
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const header = req.headers.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || token !== process.env.BARTENDER_API_KEY) {
      return new NextResponse('Unauthorised', { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
