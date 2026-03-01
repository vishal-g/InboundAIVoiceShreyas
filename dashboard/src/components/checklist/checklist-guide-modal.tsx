'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react'
import { toggleStepCompletion } from './actions'
import type { SectionWithProgress, ChecklistType } from './types'
import { DynamicStepsWidget } from './widgets/dynamic-steps-widget'
import { PromptEditorWidget } from './widgets/prompt-editor-widget'
import { MultiStepProgress } from './multi-step-progress'
import { QuizWidget } from './quiz-widget'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    checklistType: ChecklistType
    sections: SectionWithProgress[]
    initialSectionId: string
    subAccountId: string
    basePath: string
    credentials: Record<string, string>
    prompts: Record<string, { id?: string, name: string, description: string, content: string }>
    isInline?: boolean
}

export default function ChecklistGuideModal({
    open,
    onOpenChange,
    checklistType,
    sections,
    initialSectionId,
    subAccountId,
    basePath,
    credentials,
    prompts,
    isInline = false
}: Props) {
    const [activeSectionId, setActiveSectionId] = useState(initialSectionId)
    const [activeStepId, setActiveStepId] = useState<string | null>(() => {
        const section = sections.find(s => s.id === initialSectionId)
        return section?.steps?.[0]?.id || null
    })
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set([initialSectionId])
    )
    const [isPending, startTransition] = useTransition()
    // Local state for optimistic updates
    const [localProgress, setLocalProgress] = useState<Map<string, boolean>>(() => {
        const map = new Map<string, boolean>()
        sections.forEach(s => s.steps.forEach(step => map.set(step.id, step.is_done)))
        return map
    })

    // Sub-step and Quiz state
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
    const [quizPassed, setQuizPassed] = useState(false)
    const [showQuiz, setShowQuiz] = useState(false)

    // Sync localProgress when sections prop changes (e.g. after server revalidation)
    useEffect(() => {
        const map = new Map<string, boolean>()
        sections.forEach(s => s.steps.forEach(step => map.set(step.id, step.is_done)))
        setLocalProgress(map)
    }, [sections])

    const prevOpenRef = React.useRef(open)

    // Sync state only when modal goes from closed -> open
    useEffect(() => {
        if (open && !prevOpenRef.current) {
            startTransition(() => {
                setActiveSectionId(initialSectionId)
                const section = sections.find(s => s.id === initialSectionId)
                const firstStep = section?.steps?.[0]?.id || null
                setActiveStepId(firstStep)
                setExpandedSections(new Set([initialSectionId]))
            })
        }
        prevOpenRef.current = open
    }, [open, initialSectionId, sections])

    // Reset sub-state when step changes
    useEffect(() => {
        startTransition(() => {
            setCurrentSlideIndex(0)
            setQuizPassed(false)
            setShowQuiz(false)
        })
    }, [activeStepId])

    const activeSection = sections.find(s => s.id === activeSectionId)
    const activeStep = activeSection?.steps.find(s => s.id === activeStepId)
    const isStepDone = activeStepId ? (localProgress.get(activeStepId) ?? false) : false

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev)
            if (next.has(sectionId)) {
                next.delete(sectionId)
            } else {
                next.add(sectionId)
            }
            return next
        })
    }

    const selectStep = (sectionId: string, stepId: string) => {
        setActiveSectionId(sectionId)
        setActiveStepId(stepId)
        if (!expandedSections.has(sectionId)) {
            setExpandedSections(prev => new Set([...prev, sectionId]))
        }
    }

    const handleToggleDone = () => {
        if (!activeStepId) return
        const newVal = !isStepDone
        setLocalProgress(prev => new Map(prev).set(activeStepId, newVal))
        startTransition(async () => {
            await toggleStepCompletion(subAccountId, activeStepId, newVal, basePath)
        })

        // Auto-advance if we just marked it as done
        if (newVal) {
            navigateToNextStep()
        }
    }

    const navigateToNextStep = () => {
        if (!activeSection || !activeStep) return

        // 1. Handle Slides
        const slides = activeStep.multi_step_config?.slides || []
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1)
            return
        }

        // 2. Handle Quiz trigger
        if (activeStep.quiz_config && !showQuiz) {
            setShowQuiz(true)
            return
        }

        const currentIdx = activeSection.steps.findIndex(s => s.id === activeStepId)
        if (currentIdx < activeSection.steps.length - 1) {
            // Next step in same section
            setActiveStepId(activeSection.steps[currentIdx + 1].id)
        } else {
            // Move to next section
            const sectionIdx = sections.findIndex(s => s.id === activeSectionId)
            if (sectionIdx < sections.length - 1) {
                const nextSection = sections[sectionIdx + 1]
                setActiveSectionId(nextSection.id)
                setActiveStepId(nextSection.steps[0]?.id || null)
                setExpandedSections(prev => new Set([...prev, nextSection.id]))
            }
        }
    }

    const navigateToPrevStep = () => {
        if (!activeSection || !activeStep) return

        if (showQuiz) {
            setShowQuiz(false)
            return
        }

        if (currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1)
            return
        }

        const currentIdx = activeSection.steps.findIndex(s => s.id === activeStepId)
        if (currentIdx > 0) {
            setActiveStepId(activeSection.steps[currentIdx - 1].id)
        } else {
            const sectionIdx = sections.findIndex(s => s.id === activeSectionId)
            if (sectionIdx > 0) {
                const prevSection = sections[sectionIdx - 1]
                setActiveSectionId(prevSection.id)
                setActiveStepId(prevSection.steps[prevSection.steps.length - 1]?.id || null)
                setExpandedSections(prev => new Set([...prev, prevSection.id]))
            }
        }
    }

    const content = (
        <div className={`w-full h-full p-0 gap-0 flex flex-col overflow-hidden ${isInline ? 'border rounded-xl bg-card shadow-sm' : ''}`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex-shrink-0 flex items-center justify-between ${isInline ? 'bg-muted/10' : ''}`}>
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <span>{checklistType.icon}</span>
                        {(isInline && checklistType.display_type === 'page') ? checklistType.title : (activeSection?.title || checklistType.title)}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {(isInline && checklistType.display_type === 'page') ? checklistType.description : (activeSection?.description || checklistType.description)}
                    </p>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0 bg-background">
                {/* Left sidebar - Hidden in Inline mode */}
                {!isInline && (
                    <div className="w-80 border-r overflow-y-auto flex-shrink-0 bg-muted/40">
                        <div className="p-3 space-y-1">
                            {sections.map((section) => (
                                <div key={section.id}>
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-base font-bold tracking-wide transition-colors border-2 cursor-pointer ${checklistType.display_type === 'page'
                                            ? 'border-slate-300 bg-background text-foreground'
                                            : section.completedSteps === section.totalSteps && section.totalSteps > 0
                                                ? 'border-emerald-500 bg-emerald-50/30 text-emerald-950'
                                                : 'border-red-500 bg-red-50/30 text-red-950'
                                            } ${activeSectionId === section.id ? 'ring-2 ring-primary/20' : ''}`}
                                    >
                                        <span className="truncate">{section.title}</span>
                                        {expandedSections.has(section.id)
                                            ? <ChevronDown className="w-4 h-4 flex-shrink-0" />
                                            : <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                        }
                                    </button>
                                    {expandedSections.has(section.id) && (
                                        <div className="ml-0 mt-2 space-y-1">
                                            {section.steps.map((step, index) => {
                                                const done = localProgress.get(step.id) ?? step.is_done
                                                return (
                                                    <button
                                                        key={step.id}
                                                        onClick={() => selectStep(section.id, step.id)}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-left border-l-2 cursor-pointer ${activeStepId === step.id
                                                            ? 'bg-slate-200 border-slate-400'
                                                            : 'border-transparent hover:bg-muted/30 text-muted-foreground'
                                                            } ${done && activeStepId !== step.id ? 'border-emerald-400' : ''}`}
                                                    >
                                                        {checklistType.display_type === 'page' ? (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                                                        ) : done ? (
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 border-muted-foreground/60 text-[10px] text-muted-foreground font-semibold">{index + 1}</div>
                                                        )}
                                                        <span className={`truncate tracking-tight text-[15px] font-medium leading-tight ${activeStepId === step.id ? 'text-slate-800' : ''}`}>{step.title}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main content */}
                <div className="flex-1 flex flex-col min-w-0 bg-background">
                    <div className="flex-1 overflow-y-auto p-8">
                        {isInline ? (
                            <div className="max-w-4xl mx-auto space-y-12 pb-12">
                                {sections.map((section) => {
                                    const isCompleted = section.percentage === 100
                                    return (
                                        <div
                                            key={section.id}
                                            className={`space-y-6 p-6 rounded-2xl border-2 transition-all duration-300 ${isCompleted
                                                ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-500/5 shadow-sm shadow-emerald-500/10'
                                                : 'border-slate-100 bg-background'
                                                }`}
                                        >
                                            <div className="border-b pb-4 flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                                                        <span className="text-2xl">{section.icon || '📋'}</span>
                                                        {section.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                                                </div>
                                                {isCompleted && (
                                                    <div className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300 shadow-sm shadow-emerald-500/20">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Completed
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-10">
                                                {section.steps.map((step) => (
                                                    <div key={step.id} className="space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-lg font-semibold text-foreground underline decoration-violet-500/30 underline-offset-4">{step.title}</h4>
                                                            {step.is_done && (
                                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-in fade-in zoom-in duration-500" />
                                                            )}
                                                        </div>
                                                        {step.description && (
                                                            <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed prose-p:leading-relaxed prose-a:text-primary prose-a:underline prose-ul:list-disc prose-ol:list-decimal"
                                                                dangerouslySetInnerHTML={{ __html: step.description }}
                                                            />
                                                        )}

                                                        {step.widget_config && step.widget_type !== 'prompt' && (
                                                            <div className="mt-4">
                                                                <DynamicStepsWidget
                                                                    subAccountId={subAccountId}
                                                                    config={step.widget_config}
                                                                    existingCredentials={credentials}
                                                                />
                                                            </div>
                                                        )}

                                                        {step.widget_type === 'prompt' && (
                                                            <div className="mt-4">
                                                                <PromptEditorWidget
                                                                    subAccountId={subAccountId}
                                                                    aiType={section.checklist_type_id?.includes('voice') ? 'voice' : 'text'}
                                                                    promptKey={step.widget_key || ''}
                                                                    existingPrompt={prompts[step.widget_key || ''] || { name: '', description: '', content: '' }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : activeStep ? (
                            <div>
                                <h3 className="text-2xl font-bold tracking-wide mb-6 text-foreground">
                                    {activeStep.title}
                                </h3>

                                {activeStep.multi_step_config?.slides && (
                                    <MultiStepProgress
                                        total={(activeStep.multi_step_config?.slides?.length || 0) + (activeStep.quiz_config ? 1 : 0)}
                                        current={showQuiz ? (activeStep.multi_step_config?.slides?.length || 0) : currentSlideIndex}
                                        onSelect={(i) => {
                                            if (i < (activeStep.multi_step_config?.slides?.length || 0)) {
                                                setCurrentSlideIndex(i)
                                                setShowQuiz(false)
                                            } else {
                                                setShowQuiz(true)
                                            }
                                        }}
                                    />
                                )}

                                {!showQuiz ? (
                                    <div className="prose prose-base whitespace-pre-line max-w-none text-muted-foreground leading-relaxed prose-p:leading-relaxed prose-a:text-primary prose-a:underline prose-ul:list-disc prose-ol:list-decimal prose-ul:ml-4 prose-ol:ml-4">
                                        {(activeStep.multi_step_config?.slides?.length ?? 0) > 0 ? (
                                            <div dangerouslySetInnerHTML={{ __html: activeStep.multi_step_config?.slides?.[currentSlideIndex]?.content || '' }} />
                                        ) : activeStep.description ? (
                                            <div dangerouslySetInnerHTML={{ __html: activeStep.description }} />
                                        ) : (
                                            <p className="text-muted-foreground/60 italic">
                                                No description provided for this step yet.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    activeStep.quiz_config && (
                                        <QuizWidget
                                            config={activeStep.quiz_config}
                                            onComplete={setQuizPassed}
                                        />
                                    )
                                )}

                                {activeStep.widget_config && !showQuiz && activeStep.widget_type !== 'prompt' && (
                                    <div className="mt-8 border-t pt-2">
                                        <DynamicStepsWidget
                                            subAccountId={subAccountId}
                                            config={activeStep.widget_config}
                                            existingCredentials={credentials}
                                        />
                                    </div>
                                )}

                                {activeStep.widget_type === 'prompt' && !showQuiz && (
                                    <div className="mt-8 border-t pt-2">
                                        <PromptEditorWidget
                                            subAccountId={subAccountId}
                                            aiType={activeSection?.checklist_type_id?.includes('voice') ? 'voice' : 'text'}
                                            promptKey={activeStep.widget_key || ''}
                                            existingPrompt={prompts[activeStep.widget_key || ''] || { name: '', description: '', content: '' }}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Select a step from the sidebar
                            </div>
                        )}
                    </div>

                    {/* Bottom bar - Hidden in Inline mode */}
                    {!isInline && (
                        <div className="border-t px-6 py-4 flex items-center justify-between flex-shrink-0 bg-card">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={navigateToPrevStep}
                                className="gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <div className="flex items-center gap-3">
                                {checklistType.display_type !== 'page' && (
                                    <>
                                        {!isStepDone && activeStep?.quiz_config && !quizPassed && (
                                            <span className="text-xs text-muted-foreground mr-2 italic">Pass quiz to continue</span>
                                        )}
                                        <Button
                                            size="sm"
                                            onClick={handleToggleDone}
                                            disabled={!activeStepId || isPending || !!(activeStep?.quiz_config && !quizPassed && !isStepDone)}
                                            className={`gap-2 min-w-[120px] text-white border-0 ${isStepDone
                                                ? 'bg-slate-500 hover:bg-slate-600'
                                                : 'bg-violet-500 hover:bg-violet-600'
                                                }`}
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            {isStepDone ? 'Undone' : 'Done'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    if (isInline) {
        return (
            <div className="h-[calc(100vh-210px)] min-h-[600px]">
                {content}
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden">
                <DialogTitle className="sr-only">{checklistType.title || 'Page View'}</DialogTitle>
                {content}
            </DialogContent>
        </Dialog>
    )
}
