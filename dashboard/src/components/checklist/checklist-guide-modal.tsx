'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react'
import { toggleStepCompletion } from './actions'
import type { SectionWithProgress } from './types'
import { DynamicStepsWidget } from './widgets/dynamic-steps-widget'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    sections: SectionWithProgress[]
    initialSectionId: string
    subAccountId: string
    basePath: string
    credentials: Record<string, string>
}

export default function ChecklistGuideModal({
    open,
    onOpenChange,
    sections,
    initialSectionId,
    subAccountId,
    basePath,
    credentials,
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

    const prevOpenRef = React.useRef(open)

    // Sync state only when modal goes from closed -> open
    useEffect(() => {
        if (open && !prevOpenRef.current) {
            setActiveSectionId(initialSectionId)
            const section = sections.find(s => s.id === initialSectionId)
            setActiveStepId(section?.steps?.[0]?.id || null)
            setExpandedSections(new Set([initialSectionId]))
        }
        prevOpenRef.current = open
    }, [open, initialSectionId, sections])

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none w-[95vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
                <DialogTitle className="sr-only">Checklist Guide</DialogTitle>
                {/* Header */}
                <div className="px-6 py-4 border-b flex-shrink-0">
                    <h2 className="text-lg font-semibold">
                        {activeSection?.title || 'Setup Guide'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Follow everything step-by-step not skipping any single action.
                    </p>
                </div>

                {/* Body */}
                <div className="flex flex-1 min-h-0">
                    {/* Left sidebar */}
                    <div className="w-80 border-r overflow-y-auto flex-shrink-0 bg-muted/30">
                        <div className="p-3 space-y-1">
                            {sections.map((section) => (
                                <div key={section.id}>
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-base font-bold tracking-wide transition-colors border-2 cursor-pointer ${section.completedSteps === section.totalSteps && section.totalSteps > 0
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
                                                        {done
                                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                            : <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 border-muted-foreground/60 text-[10px] text-muted-foreground font-semibold">{index + 1}</div>
                                                        }
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

                    {/* Main content */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex-1 overflow-y-auto p-8">
                            {activeStep ? (
                                <div>
                                    <h3 className="text-2xl font-bold tracking-wide mb-6 text-foreground">
                                        {activeStep.title}
                                    </h3>
                                    <div className="prose prose-base whitespace-pre-line max-w-none text-muted-foreground leading-relaxed prose-p:leading-relaxed prose-a:text-primary prose-a:underline prose-ul:list-disc prose-ol:list-decimal prose-ul:ml-4 prose-ol:ml-4">
                                        {activeStep.description ? (
                                            <div dangerouslySetInnerHTML={{ __html: activeStep.description }} />
                                        ) : (
                                            <p className="text-muted-foreground/60 italic">
                                                No description provided for this step yet.
                                            </p>
                                        )}
                                    </div>

                                    {activeStep.widget_config && (
                                        <div className="mt-8 border-t pt-2">
                                            <DynamicStepsWidget
                                                subAccountId={subAccountId}
                                                config={activeStep.widget_config}
                                                existingCredentials={credentials}
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

                        {/* Bottom bar */}
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
                                <Button
                                    size="sm"
                                    onClick={handleToggleDone}
                                    disabled={!activeStepId || isPending}
                                    className={`gap-2 min-w-[120px] text-white border-0 ${isStepDone
                                        ? 'bg-slate-500 hover:bg-slate-600'
                                        : 'bg-violet-500 hover:bg-violet-600'
                                        }`}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {isStepDone ? 'Undone' : 'Done'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
