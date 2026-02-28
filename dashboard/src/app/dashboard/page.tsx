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
    searchParams: Promise<{ agency_id?: string; sub_account_id?: string }>
}) {
    const params = await searchParams
    const agencyIdFilter = params.agency_id
    const subAccountIdFilter = params.sub_account_id

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
    const userSubAccountId = roleData?.sub_account_id

    // Determine effective view mode
    const effectiveSubAccountId = subAccountIdFilter || userSubAccountId
    const isSubAccountView = !!subAccountIdFilter || !!userSubAccountId
    const isAgencyView = !!agencyIdFilter && !subAccountIdFilter
    const isSuperAdminView = isPlatformAdmin && !agencyIdFilter && !subAccountIdFilter

    let totalAgencies = 0
    let totalSubAccounts = 0
    let totalCalls = 0
    let totalBookings = 0
    let viewLabel = 'Overview'
    let subAccountName = ''

    if (isSubAccountView && effectiveSubAccountId) {
        // SUB-ACCOUNT VIEW — show only this sub-account's data
        const { data: saInfo } = await admin.from('sub_accounts').select('name').eq('id', effectiveSubAccountId).single()
        subAccountName = saInfo?.name || ''
        viewLabel = subAccountName ? `Viewing: ${subAccountName}` : 'Sub-account overview'

        const { count: callCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true }).eq('sub_account_id', effectiveSubAccountId)
        totalCalls = callCount || 0
        const { count: bookingCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true }).eq('sub_account_id', effectiveSubAccountId).eq('was_booked', true)
        totalBookings = bookingCount || 0
    } else if (isAgencyView && agencyIdFilter) {
        // AGENCY VIEW — show this agency's data
        const { data: agencyInfo } = await admin.from('agencies').select('name').eq('id', agencyIdFilter).single()
        viewLabel = agencyInfo ? `Viewing: ${agencyInfo.name}` : 'Agency overview'

        const { count: subAccountCount } = await admin.from('sub_accounts').select('*', { count: 'exact', head: true }).eq('agency_id', agencyIdFilter)
        totalSubAccounts = subAccountCount || 0

        const { data: agencySubAccounts } = await admin.from('sub_accounts').select('id').eq('agency_id', agencyIdFilter)
        const subIds = agencySubAccounts?.map((sa: any) => sa.id) || []
        if (subIds.length > 0) {
            const { count: callCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true }).in('sub_account_id', subIds)
            totalCalls = callCount || 0
            const { count: bookingCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true }).in('sub_account_id', subIds).eq('was_booked', true)
            totalBookings = bookingCount || 0
        }
    } else if (isSuperAdminView) {
        // SUPER ADMIN VIEW — all data
        viewLabel = 'Platform-wide overview'
        const { count: agencyCount } = await admin.from('agencies').select('*', { count: 'exact', head: true })
        totalAgencies = agencyCount || 0
        const { count: subAccountCount } = await admin.from('sub_accounts').select('*', { count: 'exact', head: true })
        totalSubAccounts = subAccountCount || 0
        const { count: callCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true })
        totalCalls = callCount || 0
        const { count: bookingCount } = await admin.from('call_logs').select('*', { count: 'exact', head: true }).eq('was_booked', true)
        totalBookings = bookingCount || 0
    }

    // Fetch recent calls — scoped by context
    let recentQuery = admin.from('call_logs').select('*, sub_accounts(name)').order('created_at', { ascending: false }).limit(5)
    if (isSubAccountView && effectiveSubAccountId) {
        recentQuery = recentQuery.eq('sub_account_id', effectiveSubAccountId)
    } else if (isAgencyView && agencyIdFilter) {
        const { data: agencySubAccounts } = await admin.from('sub_accounts').select('id').eq('agency_id', agencyIdFilter)
        const subIds = agencySubAccounts?.map((sa: any) => sa.id) || []
        if (subIds.length > 0) {
            recentQuery = recentQuery.in('sub_account_id', subIds)
        }
    }
    const { data: recentCalls } = await recentQuery

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div>
                <h1 className="text-3xl font-semibold">Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">{viewLabel}</p>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                {/* Agencies card — ONLY in super admin view */}
                {isSuperAdminView && (
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

                {/* Sub-Accounts card — in super admin and agency view, NOT sub-account view */}
                {!isSubAccountView && (isSuperAdminView || isAgencyView) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Sub-Accounts</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalSubAccounts}</div>
                            <p className="text-xs text-muted-foreground">
                                <Link href={`/dashboard/sub-accounts${agencyIdFilter ? `?agency_id=${agencyIdFilter}` : ''}`} className="hover:underline">Manage sub-accounts →</Link>
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
                            {isSubAccountView && effectiveSubAccountId
                                ? <Link href={`/dashboard/${effectiveSubAccountId}/logs`} className="hover:underline">View call logs →</Link>
                                : 'Across sub-accounts'}
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
                                No calls logged yet.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions — context-aware */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        {isSuperAdminView && (
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
                        {isAgencyView && (
                            <Link href={`/dashboard/sub-accounts?agency_id=${agencyIdFilter}`} className="block rounded-lg border p-3 hover:bg-accent transition-colors">
                                <div className="font-medium text-sm">Manage Sub-Accounts</div>
                                <div className="text-xs text-muted-foreground">View sub-accounts for this agency</div>
                            </Link>
                        )}
                        {isSubAccountView && effectiveSubAccountId && (
                            <>
                                <Link href={`/dashboard/${effectiveSubAccountId}/settings`} className="block rounded-lg border p-3 hover:bg-accent transition-colors">
                                    <div className="font-medium text-sm">AI Settings</div>
                                    <div className="text-xs text-muted-foreground">Edit prompts, model, and voice</div>
                                </Link>
                                <Link href={`/dashboard/${effectiveSubAccountId}/logs`} className="block rounded-lg border p-3 hover:bg-accent transition-colors">
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
