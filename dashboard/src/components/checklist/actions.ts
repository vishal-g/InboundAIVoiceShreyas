'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ChecklistData, SectionWithProgress, StepWithProgress, ChecklistType, ChecklistSection, ChecklistStep, WidgetConfig, MultiStepConfig, QuizConfig } from './types'

// ─── Read Operations ────────────────────────────────────────────────────────

export async function getChecklistData(
    checklistTypeId: string,
    subAccountId: string
): Promise<ChecklistData | null> {
    const admin = createAdminClient()

    // 1. Get checklist type
    const { data: checklistType, error: typeError } = await admin
        .from('checklist_types')
        .select('*')
        .eq('id', checklistTypeId)
        .single()

    if (typeError || !checklistType) return null

    // 2. Get sections ordered
    const { data: sections } = await admin
        .from('checklist_sections')
        .select('*')
        .eq('checklist_type_id', checklistTypeId)
        .order('sort_order')

    if (!sections) return null

    // 3. Get all steps for these sections
    const sectionIds = sections.map(s => s.id)
    const { data: steps } = await admin
        .from('checklist_steps')
        .select('*')
        .in('section_id', sectionIds)
        .order('sort_order')

    // 4. Get progress for this sub-account
    const stepIds = (steps || []).map(s => s.id)
    const { data: progress } = stepIds.length > 0
        ? await admin
            .from('checklist_progress')
            .select('*')
            .eq('sub_account_id', subAccountId)
            .in('step_id', stepIds)
        : { data: [] }

    const progressMap = new Map((progress || []).map(p => [p.step_id, p.is_done]))

    // 5. Build enriched sections
    const enrichedSections: SectionWithProgress[] = sections.map(section => {
        const sectionSteps: StepWithProgress[] = (steps || [])
            .filter(step => step.section_id === section.id)
            .map(step => ({
                ...step,
                is_done: progressMap.get(step.id) || false,
            }))

        const totalSteps = sectionSteps.length
        const completedSteps = sectionSteps.filter(s => s.is_done).length

        return {
            ...section,
            steps: sectionSteps,
            totalSteps,
            completedSteps,
            percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
        }
    })

    const totalSteps = enrichedSections.reduce((sum, s) => sum + s.totalSteps, 0)
    const completedSteps = enrichedSections.reduce((sum, s) => sum + s.completedSteps, 0)


    // 6. Fetch existing dynamic credentials
    const { data: settingsData } = await admin
        .from('sub_account_settings')
        .select('credentials')
        .eq('sub_account_id', subAccountId)
        .single()

    const credentials = settingsData?.credentials || {}

    return {
        checklistType: checklistType as ChecklistType,
        sections: enrichedSections,
        totalSteps,
        completedSteps,
        percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
        credentials
    }
}

// ─── Step Toggle (Sub-Account Users) ────────────────────────────────────────

export async function toggleStepCompletion(
    subAccountId: string,
    stepId: string,
    isDone: boolean,
    pathToRevalidate: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const admin = createAdminClient()

    const { error } = await admin
        .from('checklist_progress')
        .upsert(
            {
                sub_account_id: subAccountId,
                step_id: stepId,
                is_done: isDone,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'sub_account_id,step_id' }
        )

    if (error) {
        console.error('Failed to toggle step', error)
        return { success: false, error: error.message }
    }

    revalidatePath(pathToRevalidate)
    return { success: true, error: null }
}

// ─── Admin CRUD (Platform Admin Only) ───────────────────────────────────────

async function requirePlatformAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const admin = createAdminClient()
    const { data: roleData } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (roleData?.role !== 'platform_admin') throw new Error('Platform admin access required')
    return admin
}

// Checklist Types CRUD
export async function createChecklistType(id: string, title: string, description: string, icon: string) {
    const admin = await requirePlatformAdmin()
    const { error } = await admin.from('checklist_types').insert({ id, title, description, icon })
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/admin/checklists')
    return { success: true, error: null }
}

export async function updateChecklistType(id: string, updates: Partial<ChecklistType>) {
    const admin = await requirePlatformAdmin()
    const { error } = await admin.from('checklist_types').update(updates).eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/admin/checklists')
    return { success: true, error: null }
}

export async function deleteChecklistType(id: string) {
    const admin = await requirePlatformAdmin()
    const { error } = await admin.from('checklist_types').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/admin/checklists')
    return { success: true, error: null }
}

// Sections CRUD
export async function createSection(checklistTypeId: string, title: string, description: string, icon: string) {
    const admin = await requirePlatformAdmin()

    // Get max sort_order
    const { data: existing } = await admin
        .from('checklist_sections')
        .select('sort_order')
        .eq('checklist_type_id', checklistTypeId)
        .order('sort_order', { ascending: false })
        .limit(1)

    const nextOrder = (existing?.[0]?.sort_order || 0) + 1

    const { data, error } = await admin
        .from('checklist_sections')
        .insert({ checklist_type_id: checklistTypeId, title, description, icon, sort_order: nextOrder })
        .select()
        .single()

    if (error) return { success: false, error: error.message, data: null }
    revalidatePath('/dashboard/admin/checklists')
    return { success: true, error: null, data }
}

export async function updateSection(sectionId: string, updates: Partial<ChecklistSection>) {
    const admin = await requirePlatformAdmin()
    const { error } = await admin
        .from('checklist_sections')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', sectionId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/admin/checklists')
    return { success: true, error: null }
}

export async function deleteSection(sectionId: string) {
    const admin = await requirePlatformAdmin()
    const { error } = await admin.from('checklist_sections').delete().eq('id', sectionId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/admin/checklists')
    return { success: true, error: null }
}

// Steps CRUD
export async function createStep(
    sectionId: string,
    title: string,
    description: string,
    widgetConfig: WidgetConfig | null = null,
    multiStepConfig: MultiStepConfig | null = null,
    quizConfig: QuizConfig | null = null
) {
    const admin = await requirePlatformAdmin()

    const { data: existing } = await admin
        .from('checklist_steps')
        .select('sort_order')
        .eq('section_id', sectionId)
        .order('sort_order', { ascending: false })
        .limit(1)

    const nextOrder = (existing?.[0]?.sort_order || 0) + 1

    const { data, error } = await admin
        .from('checklist_steps')
        .insert({
            section_id: sectionId,
            title,
            description,
            widget_config: widgetConfig,
            multi_step_config: multiStepConfig,
            quiz_config: quizConfig,
            sort_order: nextOrder
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message, data: null }
    revalidatePath('/dashboard/admin/checklists')
    return { success: true, error: null, data }
}

export async function updateStep(stepId: string, updates: Partial<ChecklistStep>) {
    const admin = await requirePlatformAdmin()
    const { error } = await admin
        .from('checklist_steps')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', stepId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/admin/checklists')
    return { success: true, error: null }
}

export async function deleteStep(stepId: string) {
    const admin = await requirePlatformAdmin()
    const { error } = await admin.from('checklist_steps').delete().eq('id', stepId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/admin/checklists')
    return { success: true, error: null }
}

// Get all checklist types (for admin listing)
export async function getAllChecklistTypes(): Promise<ChecklistType[]> {
    const admin = createAdminClient()
    const { data } = await admin.from('checklist_types').select('*').order('created_at')
    return (data || []) as ChecklistType[]
}

export async function reorderSections(sectionIds: string[], checklistTypeId: string) {
    const admin = createAdminClient()
    try {
        const updates = sectionIds.map((id, index) => ({
            id,
            checklist_type_id: checklistTypeId,
            sort_order: index,
        }))
        const { error } = await admin.from('checklist_sections').upsert(updates)
        if (error) throw error
        revalidatePath('/dashboard/admin/checklists')
        revalidatePath(`/dashboard/admin/checklists/${checklistTypeId}`)
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function reorderSteps(steps: { id: string; section_id: string; title: string, description: string | null, sort_order: number }[]) {
    const admin = createAdminClient()
    try {
        const { error } = await admin.from('checklist_steps').upsert(steps)
        if (error) throw error
        revalidatePath('/dashboard/admin/checklists')
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
