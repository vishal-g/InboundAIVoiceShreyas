import { getChecklistData } from '@/components/checklist/actions'
import ChecklistProgressHeader from '@/components/checklist/checklist-progress-header'
import ChecklistSectionCards from '@/components/checklist/checklist-section-cards'

type Props = {
    params: Promise<{ sub_account_id: string }>
}

export default async function TextAIConfigPage({ params }: Props) {
    const { sub_account_id } = await params
    const data = await getChecklistData('text_ai_config', sub_account_id)

    if (!data) {
        return (
            <div className="p-6">
                <div className="rounded-xl border bg-card p-8 text-center">
                    <h2 className="text-lg font-semibold mb-2">Checklist Not Found</h2>
                    <p className="text-muted-foreground">
                        The Text AI Rep setup checklist has not been configured yet.
                        A platform admin needs to set up the checklist sections and steps.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <ChecklistProgressHeader data={data} />
            <ChecklistSectionCards
                data={data}
                subAccountId={sub_account_id}
                basePath={`/dashboard/${sub_account_id}/text-ai/config`}
            />
        </div>
    )
}
