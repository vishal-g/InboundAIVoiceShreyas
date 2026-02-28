import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import SettingsForm from './settings-form'

export default async function SettingsPage(props: { params: Promise<{ sub_account_id: string }> }) {
    const params = await props.params;
    const subAccountId = params.sub_account_id
    const supabase = await createClient()

    // Protect route
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch the actual settings using admin client
    const admin = createAdminClient()
    const { data: settings } = await admin
        .from('sub_account_settings')
        .select('*')
        .eq('sub_account_id', subAccountId)
        .single()

    if (!settings) {
        return <div className="p-8">No configuration found for this sub-account. Please initialize it first.</div>
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="mx-auto grid w-full max-w-6xl gap-2">
                <h1 className="text-3xl font-semibold">AI Settings</h1>
            </div>
            <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
                <nav className="grid gap-4 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Core Configuration</span>
                    <span className="cursor-pointer">Integrations</span>
                    <span className="cursor-pointer">Billing</span>
                </nav>
                <div className="grid gap-6">
                    <SettingsForm subAccountId={subAccountId} settings={settings} />
                </div>
            </div>
        </div>
    )
}
