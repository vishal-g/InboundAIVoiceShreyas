import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import KnowledgebaseClient from './knowledgebase-client'

type Props = {
    params: Promise<{ sub_account_id: string }>
}

export default async function KnowledgebasePage({ params }: Props) {
    const { sub_account_id } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-3xl font-semibold">Knowledgebase</h1>
                    <p className="text-muted-foreground">
                        Manage your documents and URLs to build a powerful AI brain.
                    </p>
                </div>
            </div>

            <KnowledgebaseClient subAccountId={sub_account_id} />
        </div>
    )
}
