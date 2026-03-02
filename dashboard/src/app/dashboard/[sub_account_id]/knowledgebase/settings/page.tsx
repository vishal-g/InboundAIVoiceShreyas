import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import KBSettingsForm from './settings-form'

type Props = {
    params: Promise<{ sub_account_id: string }>
    searchParams: Promise<{ tab?: string }>
}

export default async function KnowledgebaseSettingsPage({ params, searchParams }: Props) {
    const { sub_account_id } = await params
    const { tab = 'rag' } = await searchParams
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const admin = createAdminClient()

    // Fetch or Initialize Settings
    let { data: settings, error } = await admin
        .from('kb_settings')
        .select('*')
        .eq('sub_account_id', sub_account_id)
        .single()

    if (error && error.code === 'PGRST116') {
        // Not found, initialize with defaults
        const { data: newSettings, error: insertError } = await admin
            .from('kb_settings')
            .insert({ sub_account_id })
            .select('*')
            .single()

        if (insertError) {
            console.error('Error initializing KB settings:', insertError)
        } else {
            settings = newSettings
        }
    }

    const navItems = [
        { id: 'rag', label: 'RAG Configuration' },
        { id: 'fine-tuning', label: 'Advanced Fine-tuning' },
        { id: 'retention', label: 'Data Retention' }
    ]

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="mx-auto grid w-full max-w-6xl gap-2">
                <h1 className="text-3xl font-semibold">Knowledgebase Settings</h1>
                <p className="text-muted-foreground">
                    Configure how your documents and URLs are processed for RAG (Retrieval-Augmented Generation).
                </p>
            </div>

            <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
                <nav className="grid gap-4 text-sm text-muted-foreground">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            href={`?tab=${item.id}`}
                            className={`transition-colors hover:text-primary ${tab === item.id
                                    ? "font-semibold text-primary underline underline-offset-4"
                                    : ""
                                }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="grid gap-6">
                    <KBSettingsForm
                        subAccountId={sub_account_id}
                        settings={settings}
                        activeTab={tab}
                    />
                </div>
            </div>
        </div>
    )
}
