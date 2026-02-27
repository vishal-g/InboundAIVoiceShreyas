import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    const { pathname } = request.nextUrl

    // ── SKIP expensive auth checks on public / login paths ──────────────
    // This drastically reduces concurrent Supabase getUser() calls which
    // can exhaust the GoTrue DB pool on local Docker.
    const isPublicPath =
        pathname.startsWith('/login') ||
        pathname.startsWith('/auth') ||
        pathname === '/' ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon')

    if (isPublicPath) {
        return NextResponse.next()
    }

    // ── Only run full auth check for /dashboard/* routes ────────────────
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        if (process.env.NODE_ENV === 'development') {
                            delete options.domain
                            options.secure = false
                        }
                        request.cookies.set(name, value)
                    })
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        if (process.env.NODE_ENV === 'development') {
                            delete options.domain
                            options.secure = false
                        }
                        supabaseResponse.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
