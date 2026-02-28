import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import Link from 'next/link'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Users, PhoneCall, Building2 } from 'lucide-react'

export default async function DashboardOverview({
    searchParams,
}: {
    searchParams: Promise<{ agency_id?: string }>
}) {
    const params = await searchParams
    const agencyIdFilter = params.agency_id

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = createAdminClient()

    const { data: roleData } = await admin
        .from('user_roles')
        .select('*')
        .eq('user_id', user?.id)
        .single()

    const isPlatformAdmin = roleData?.role === 'platform_admin'
    const isAgencyAdmin = roleData?.role === 'agency_admin'
    const subAccountId = roleData?.sub_account_id

    // Determine effective agency filter
    const effectiveAgencyId = agencyIdFilter || roleData?.agency_id || null

    let totalAgencies = 0
    let totalSubAccounts = 0
    let totalCalls = 0
    let totalBookings = 0
    let viewLabel = 'Your AI agent overview'

    if (isPlatformAdmin && !agencyIdFilter) {
        // Super Admin View — all data
        viewLabel = 'Platform-wide overview'
        const { count: agencyCount } = await admin.from('agencies').select('*', { count: 'exact', head: true })
        totalAgencies = agencyCount || 0
        const { count: subAccountCount } = await admin.from('sub_accounts').select('*', { count: 'exact', head: true })
        totalSubAccounts = subAccountCount || 0
        const { count: callCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true })
        totalCalls = callCount || 0
        const { count: bookingCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true }).eq('was_booked', true)
        totalBookings = bookingCount || 0
    } else if (effectiveAgencyId) {
        // Agency-scoped view
        const { data: agencyInfo } = await admin.from('agencies').select('name').eq('id', effectiveAgencyId).single()
        viewLabel = agencyInfo ? `Viewing: ${agencyInfo.name}` : 'Agency overview'

        const { count: subAccountCount } = await admin.from('sub_accounts').select('*', { count: 'exact', head: true }).eq('agency_id', effectiveAgencyId)
        totalSubAccounts = subAccountCount || 0

        // Get sub-account IDs for this agency to filter call logs
        const { data: agencySubAccounts } = await admin.from('sub_accounts').select('id').eq('agency_id', effectiveAgencyId)
        const subIds = agencySubAccounts?.map((sa: any) => sa.id) || []

        if (subIds.length > 0) {
            const { count: callCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true }).in('sub_account_id', subIds)
            totalCalls = callCount || 0
            const { count: bookingCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true }).in('sub_account_id', subIds).eq('was_booked', true)
            totalBookings = bookingCount || 0
        }
    } else if (subAccountId) {
        // Sub-account user view
        const { count: callCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true }).eq('sub_account_id', subAccountId)
        totalCalls = callCount || 0
        const { count: bookingCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true }).eq('sub_account_id', subAccountId).eq('was_booked', true)
        totalBookings = bookingCount || 0
    }

    // Fetch recent calls — scoped by context
    let recentQuery = admin.from('call_logs').select('*, sub_accounts(name)').order('created_at', { ascending: false }).limit(5)
    if (effectiveAgencyId && !isPlatformAdmin || (isPlatformAdmin && agencyIdFilter)) {
        const { data: agencySubAccounts } = await admin.from('sub_accounts').select('id').eq('agency_id', effectiveAgencyId!)
        const subIds = agencySubAccounts?.map((sa: any) => sa.id) || []
        if (subIds.length > 0) {
            recentQuery = recentQuery.in('sub_account_id', subIds)
        }
    } else if (subAccountId) {
        recentQuery = recentQuery.eq('sub_account_id', subAccountId)
    }
    const { data: recentCalls } = await recentQuery

    const agencyParam = agencyIdFilter ? `?agency_id=${agencyIdFilter}` : ''

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div>
                <h1 className="text-3xl font-semibold">Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">{viewLabel}</p>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                {isPlatformAdmin && !agencyIdFilter && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Agencies</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalAgencies}</div>
                            <p className="text-xs text-muted-foreground">
                                <Link href="/dashboard/agencies" className="hover:underline">Manage agencies →</Link>
                            </p>
                        </CardContent>
                    </Card>
                )}

                {(isPlatformAdmin || isAgencyAdmin || agencyIdFilter) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Sub-Accounts</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalSubAccounts}</div>
                            <p className="text-xs text-muted-foreground">
                                <Link href={`/dashboard/sub-accounts${agencyParam}`} className="hover:underline">Manage sub-accounts →</Link>
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total AI Calls</CardTitle>
                        <PhoneCall className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCalls}</div>
                        <p className="text-xs text-muted-foreground">
                            {subAccountId ? <Link href={`/dashboard/${subAccountId}/logs`} className="hover:underline">View call logs →</Link> : 'Across sub-accounts'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bookings Made</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalBookings}</div>
                        <p className="text-xs text-muted-foreground">
                            {totalCalls > 0 ? `${Math.round((totalBookings / totalCalls) * 100)}% conversion rate` : 'No calls yet'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Latest calls handled by the AI agents.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentCalls && recentCalls.length > 0 ? (
                            <div className="space-y-4">
                                {recentCalls.map((call: any) => (
                                    <div key={call.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{call.phone_number}</span>
                                                {call.caller_name && <span className="text-xs text-muted-foreground">({call.caller_name})</span>}
                                                {call.was_booked && <Badge variant="default" className="text-xs">Booked</Badge>}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{call.summary || 'No summary'}</p>
                                        </div>
                                        <div className="text-right text-xs text-muted-foreground whitespace-nowrap ml-4">
                                            <div>{call.duration_seconds}s</div>
                                            <div>{new Date(call.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground py-4 text-center">
                                No calls logged yet. Activity will appear here once AI agents handle calls.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Links */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        {(isPlatformAdmin && !agencyIdFilter) && (
                            <>
                                <Link href="/dashboard/agencies" className="block rounded-lg border p-3 hover:bg-accent transition-colors">
                                    <div className="font-medium text-sm">Manage Agencies</div>
                                    <div className="text-xs text-muted-foreground">Add, edit, or remove agencies</div>
                                </Link>
                                <Link href="/dashboard/sub-accounts" className="block rounded-lg border p-3 hover:bg-accent transition-colors">
                                    <div className="font-medium text-sm">Manage Sub-Accounts</div>
                                    <div className="text-xs text-muted-foreground">Configure AI agents and settings</div>
                                </Link>
                            </>
                        )}
                        {agencyIdFilter && (
                            <Link href={`/dashboard/sub-accounts${agencyParam}`} className="block rounded-lg border p-3 hover:bg-accent transition-colors">
                                <div className="font-medium text-sm">Manage Sub-Accounts</div>
                                <div className="text-xs text-muted-foreground">View sub-accounts for this agency</div>
                            </Link>
                        )}
                        {subAccountId && (
                            <>
                                <Link href={`/dashboard/${subAccountId}/settings`} className="block rounded-lg border p-3 hover:bg-accent transition-colors">
                                    <div className="font-medium text-sm">AI Settings</div>
                                    <div className="text-xs text-muted-foreground">Edit prompts, model, and voice</div>
                                </Link>
                                <Link href={`/dashboard/${subAccountId}/logs`} className="block rounded-lg border p-3 hover:bg-accent transition-colors">
                                    <div className="font-medium text-sm">Call Logs</div>
                                    <div className="text-xs text-muted-foreground">View call history and transcripts</div>
                                </Link>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
