import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch the user's role and sub-account access
    // For the sake of this UI, if they don't have a specific role entry, we default to a basic view
    // In production, we'd strictly enforce this via RLS as well.
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, sub_account_id, agency_id')
        .eq('user_id', user.id)
        .single()

    const userRole = roleData?.role || 'sub_account_user'
    const subAccountId = roleData?.sub_account_id

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <Sidebar userRole={userRole} subAccountId={subAccountId} />
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                <Header userEmail={user.email} />
                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
