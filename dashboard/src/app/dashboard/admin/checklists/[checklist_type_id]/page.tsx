import { createAdminClient } from '@/utils/supabase/admin'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ChecklistSectionManager from './section-manager'

type Props = {
    params: Promise<{ checklist_type_id: string }>
}

export default async function ChecklistTypeManagePage({ params }: Props) {
    const { checklist_type_id } = await params
    const admin = createAdminClient()

    // Fetch checklist type
    const { data: checklistType } = await admin
        .from('checklist_types')
        .select('*')
        .eq('id', checklist_type_id)
        .single()

    if (!checklistType) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Checklist type not found.</p>
                <Link href="/dashboard/admin/checklists">
                    <Button variant="outline" size="sm" className="mt-4 gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                </Link>
            </div>
        )
    }

    // Fetch sections with their steps
    const { data: sections } = await admin
        .from('checklist_sections')
        .select('*')
        .eq('checklist_type_id', checklist_type_id)
        .order('sort_order')

    const sectionIds = (sections || []).map(s => s.id)
    const { data: steps } = sectionIds.length > 0
        ? await admin
            .from('checklist_steps')
            .select('*')
            .in('section_id', sectionIds)
            .order('sort_order')
        : { data: [] }

    // Group steps by section
    const sectionsWithSteps = (sections || []).map(section => ({
        ...section,
        steps: (steps || []).filter(step => step.section_id === section.id),
    }))

    return (
        <div className="p-6 max-w-[1400px] mx-auto w-full">
            <div className="mb-6">
                <Link href="/dashboard/admin/checklists" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Checklists
                </Link>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{checklistType.icon || '📋'}</span>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{checklistType.title}</h1>
                        <p className="text-sm text-muted-foreground">{checklistType.description}</p>
                    </div>
                </div>
            </div>

            <ChecklistSectionManager
                checklistTypeId={checklist_type_id}
                initialSections={sectionsWithSteps}
            />
        </div>
    )
}
