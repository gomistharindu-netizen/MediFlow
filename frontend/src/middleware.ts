import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes accessible without staff login:
const PUBLIC_PATHS = [
  '/login',
  '/tv',            // Waiting room public TV display
  '/api',           // Laravel API proxy / endpoints
  '/_next',
  '/favicon.ico',
];

const VALID_TENANTS = ['nawaloka', 'asiri', 'arogya', 'suwapiyasa'];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Extract requested tenant safely (matches known tenants only, ignoring deployment suffixes like medi-flow-indol.vercel.app)
  let requestedTenant: string | null = null;
  const hostParts = hostname.split(':')[0].toLowerCase().split('.');
  
  if (VALID_TENANTS.includes(hostParts[0])) {
    requestedTenant = hostParts[0];
  } else if (searchParams.get('clinic') && VALID_TENANTS.includes(searchParams.get('clinic')!.toLowerCase())) {
    requestedTenant = searchParams.get('clinic')!.toLowerCase();
  } else if (searchParams.get('tenant') && VALID_TENANTS.includes(searchParams.get('tenant')!.toLowerCase())) {
    requestedTenant = searchParams.get('tenant')!.toLowerCase();
  }

  // 1. Allow public paths and dynamic patient mobile tracker (/q/[token])
  if (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/')) ||
    pathname.startsWith('/q/')
  ) {
    return NextResponse.next();
  }

  // 2. Check for staff auth token in cookies
  const token = request.cookies.get('mediflow_token')?.value;

  // 3. If unauthenticated, redirect directly to /login with return URL & clinic param
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    if (requestedTenant) {
      loginUrl.searchParams.set('clinic', requestedTenant);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. Strict Cross-Tenant Cookie Check:
  // If the user is logged into clinic 'arogya' and tries to open clinic 'nawaloka',
  // prevent cross-tenant session bleeding and force login for that clinic.
  const loggedInTenant = request.cookies.get('mediflow_tenant')?.value;
  if (requestedTenant && loggedInTenant && loggedInTenant !== requestedTenant && pathname !== '/admin') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('clinic', requestedTenant);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Strict Role-Based Workstation Access Control (RBAC):
  // Staff members can ONLY access their specific authorized workstation.
  const role = request.cookies.get('mediflow_role')?.value;

  const getWorkstation = (userRole?: string): string => {
    switch (userRole) {
      case 'Doctor':
        return '/doctor';
      case 'Receptionist':
        return '/reception';
      case 'Cashier':
        return '/cashier';
      case 'Pharmacist':
        return '/pharmacy';
      case 'SuperAdmin':
        return '/admin';
      case 'ClinicAdmin':
      case 'Admin':
        return '/';
      default:
        return '/login';
    }
  };

  // If user navigates to root '/', redirect them directly to their dedicated workstation:
  if (pathname === '/') {
    const targetDesk = getWorkstation(role);
    if (targetDesk !== '/') {
      return NextResponse.redirect(new URL(targetDesk, request.url));
    }
  }

  // Doctor Workstation: Only Doctor and Clinic Admin
  if (pathname.startsWith('/doctor') && role !== 'Doctor' && role !== 'Admin' && role !== 'ClinicAdmin') {
    return NextResponse.redirect(new URL(getWorkstation(role), request.url));
  }

  // Reception Desk: Only Receptionist and Clinic Admin
  if (pathname.startsWith('/reception') && role !== 'Receptionist' && role !== 'Admin' && role !== 'ClinicAdmin') {
    return NextResponse.redirect(new URL(getWorkstation(role), request.url));
  }

  // Cashier & Billing: Only Cashier and Clinic Admin
  if (pathname.startsWith('/cashier') && role !== 'Cashier' && role !== 'Admin' && role !== 'ClinicAdmin') {
    return NextResponse.redirect(new URL(getWorkstation(role), request.url));
  }

  // Pharmacy Dispensary: Only Pharmacist and Clinic Admin
  if (pathname.startsWith('/pharmacy') && role !== 'Pharmacist' && role !== 'Admin' && role !== 'ClinicAdmin') {
    return NextResponse.redirect(new URL(getWorkstation(role), request.url));
  }

  // Platform Landlord Admin: Only SuperAdmin
  if (pathname.startsWith('/admin') && role !== 'SuperAdmin') {
    const targetDesk = getWorkstation(role);
    if (targetDesk !== '/login' && targetDesk !== '/admin') {
      return NextResponse.redirect(new URL(targetDesk, request.url));
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except Next.js static files and images
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
