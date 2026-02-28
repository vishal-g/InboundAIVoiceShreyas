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

// Types for the dynamic JSON form builder
export type WidgetField = {
    key: string
    label: string
    type: 'text' | 'password' | 'url' | 'number'
    required?: boolean
    placeholder?: string
}

export type WidgetConfig = {
    title: string
    fields: WidgetField[]
}

export type MultiStepSlide = {
    title: string
    content: string
    video_url?: string
}

export type MultiStepConfig = {
    slides: MultiStepSlide[]
}

export type QuizQuestion = {
    id: string
    text: string
    options: string[]
    correct_index: number
}

export type QuizConfig = {
    title: string
    threshold: number
    questions: QuizQuestion[]
}

export type ChecklistStep = {
    id: string
    section_id: string
    title: string
    description: string | null
    sort_order: number
    widget_type: 'credentials' | 'prompt' | null
    widget_title: string | null
    widget_config: WidgetConfig | null
    multi_step_config: MultiStepConfig | null
    quiz_config: QuizConfig | null
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
    credentials: Record<string, string>
    prompts: Record<string, { id?: string, description: string, content: string }>
}
