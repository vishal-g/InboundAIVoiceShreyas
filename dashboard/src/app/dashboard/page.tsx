import { createClient } from '@/utils/supabase/server'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Activity, Users, PhoneCall, Calendar } from 'lucide-react'

export default async function DashboardOverview() {
    const supabase = await createClient()

    // In a real app, we'd fetch actual aggregates based on the user's role/sub_account
    // For this prototype, we'll fetch direct counts if platform admin, or filter by sub_account

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { data: roleData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user?.id)
        .single()

    const isPlatformAdmin = roleData?.role === 'platform_admin'
    const subAccountId = roleData?.sub_account_id

    // Fetch quick stats
    let totalAgencies = 0
    let totalSubAccounts = 0
    let totalCalls = 0

    if (isPlatformAdmin) {
        const { count: agencyCount } = await supabase.from('agencies').select('*', { count: 'exact', head: true })
        totalAgencies = agencyCount || 0

        const { count: subAccountCount } = await supabase.from('sub_accounts').select('*', { count: 'exact', head: true })
        totalSubAccounts = subAccountCount || 0
    }

    // Count call logs
    let callQuery = supabase.from('call_logs').select('*', { count: 'exact', head: true })
    if (!isPlatformAdmin && subAccountId) {
        callQuery = callQuery.eq('sub_account_id', subAccountId)
    }
    const { count: callCount } = await callQuery
    totalCalls = callCount || 0

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                {isPlatformAdmin && (
                    <>
                        <Card x-chunk="dashboard-01-chunk-0">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Agencies</CardTitle>
                                <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalAgencies}</div>
                            </CardContent>
                        </Card>
                        <Card x-chunk="dashboard-01-chunk-1">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Sub-Accounts</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalSubAccounts}</div>
                            </CardContent>
                        </Card>
                    </>
                )}
                <Card x-chunk="dashboard-01-chunk-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total AI Calls</CardTitle>
                        <PhoneCall className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCalls}</div>
                        <p className="text-xs text-muted-foreground">+19% from last month</p>
                    </CardContent>
                </Card>
                <Card x-chunk="dashboard-01-chunk-3">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Live</div>
                    </CardContent>
                </Card>
            </div>

            {/* Placeholder for Recharts or Recent Activity Table */}
            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Latest calls and pipeline movements handled by the AI.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">Activity logs will populate here once calls are made.</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function BuildingIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M12 6h.01" />
            <path d="M12 10h.01" />
            <path d="M12 14h.01" />
            <path d="M16 10h.01" />
            <path d="M16 14h.01" />
            <path d="M8 10h.01" />
            <path d="M8 14h.01" />
        </svg>
    )
}
