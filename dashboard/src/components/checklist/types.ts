// Shared types for the modular checklist system

export type ChecklistType = {
    id: string
    title: string
    description: string | null
    icon: string | null
    created_at: string
}

export type ChecklistSection = {
    id: string
    checklist_type_id: string
    title: string
    description: string | null
    icon: string | null
    sort_order: number
    created_at: string
    updated_at: string
}

export type ChecklistStep = {
    id: string
    section_id: string
    title: string
    description: string | null
    sort_order: number
    created_at: string
    updated_at: string
}

export type ChecklistProgress = {
    sub_account_id: string
    step_id: string
    is_done: boolean
    updated_at: string
}

// Enriched types for UI rendering
export type SectionWithProgress = ChecklistSection & {
    steps: StepWithProgress[]
    totalSteps: number
    completedSteps: number
    percentage: number
}

export type StepWithProgress = ChecklistStep & {
    is_done: boolean
}

export type ChecklistData = {
    checklistType: ChecklistType
    sections: SectionWithProgress[]
    totalSteps: number
    completedSteps: number
    percentage: number
}
