import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const admin = createAdminClient()

    // Fetch user role
    const { data: roleData } = await admin
        .from('user_roles')
        .select('role, sub_account_id, agency_id')
        .eq('user_id', user.id)
        .single()

    const userRole = roleData?.role || 'sub_account_user'
    const subAccountId = roleData?.sub_account_id
    const agencyId = roleData?.agency_id

    // Fetch agencies and sub-accounts for context switcher
    const { data: agencies } = await admin
        .from('agencies')
        .select('id, name')
        .order('name')

    const { data: subAccounts } = await admin
        .from('sub_accounts')
        .select('id, name, agency_id')
        .order('name')

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <Sidebar
                userRole={userRole}
                subAccountId={subAccountId}
                agencyId={agencyId}
                agencies={agencies || []}
                subAccounts={subAccounts || []}
                userEmail={user.email}
            />
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-56">
                <Header userEmail={user.email} />
                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
