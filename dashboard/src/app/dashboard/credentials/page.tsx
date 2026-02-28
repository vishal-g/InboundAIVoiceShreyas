import { getChecklistData } from '@/components/checklist/actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CredentialsPage from '@/components/credentials/credentials-page'

type Props = {
    searchParams: Promise<{ sub_account_id?: string }>
}

export default async function Page({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { sub_account_id: querySubAccountId } = await searchParams

    // 1. Get user role and assignment
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, sub_account_id, agency_id')
        .eq('user_id', user.id)
        .single()

    const userRole = roleData?.role || 'sub_account_user'
    let subAccountId = querySubAccountId || roleData?.sub_account_id

    if (!subAccountId) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">No Sub-Account Found</h1>
                <p className="text-muted-foreground">You need to be assigned to a sub-account to manage credentials.</p>
                <p className="text-sm text-muted-foreground mt-4 italic">
                    (Try selecting a sub-account from the sidebar or ensure at least one exists in your agency.)
                </p>
            </div>
        )
    }

    const data = await getChecklistData('credentials_page', subAccountId)

    if (!data) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Page Error</h1>
                <p className="text-muted-foreground">Could not load the Credentials Page data. Please ensure it is seeded in the database.</p>
            </div>
        )
    }

    return <CredentialsPage data={data} subAccountId={subAccountId} />
}
