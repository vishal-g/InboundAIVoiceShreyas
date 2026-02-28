'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
    createSection,
    updateSection,
    deleteSection,
    createStep,
    updateStep,
    deleteStep,
    reorderSections,
    reorderSteps,
} from '@/components/checklist/actions'
import { toast } from 'sonner'

type Step = {
    id: string
    section_id: string
    title: string
    description: string | null
    sort_order: number
    widget_config?: any
}

type Section = {
    id: string
    checklist_type_id: string
    title: string
    description: string | null
    icon: string | null
    sort_order: number
    steps: Step[]
}

type Props = {
    checklistTypeId: string
    initialSections: Section[]
}

export default function ChecklistSectionManager({ checklistTypeId, initialSections }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Local state for optimistic UI updates during drag and drop
    const [sections, setSections] = useState<Section[]>(initialSections)
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

    // Update local state when props change (from server actions)
    useEffect(() => {
        setSections(initialSections)
    }, [initialSections])

    // Section dialog
    const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
    const [editingSection, setEditingSection] = useState<Section | null>(null)

    // Step dialog
    const [stepDialogOpen, setStepDialogOpen] = useState(false)
    const [editingStep, setEditingStep] = useState<Step | null>(null)
    const [stepSectionId, setStepSectionId] = useState<string>('')
    const [stepDescription, setStepDescription] = useState('')
    const [stepWidgetConfig, setStepWidgetConfig] = useState('')

    // Delete confirmation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'section' | 'step'; id: string; name: string } | null>(null)

    const toggleExpanded = (id: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    // ── Drag & Drop Handlers ──────────────────────────
    const handleDragEnd = (result: DropResult) => {
        const { destination, source, type } = result

        if (!destination) return

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return
        }

        if (type === 'section') {
            const newSections = Array.from(sections)
            const [moved] = newSections.splice(source.index, 1)
            newSections.splice(destination.index, 0, moved)

            // Update local state optimistically
            setSections(newSections)

            // Persist
            const sectionIds = newSections.map(s => s.id)
            startTransition(async () => {
                const res = await reorderSections(sectionIds, checklistTypeId)
                if (!res.success) {
                    toast.error('Failed to save section order')
                    setSections(initialSections) // revert
                }
            })
            return
        }

        if (type === 'step') {
            const sourceSectionIdx = sections.findIndex(s => s.id === source.droppableId)
            const destSectionIdx = sections.findIndex(s => s.id === destination.droppableId)

            if (sourceSectionIdx === -1 || destSectionIdx === -1) return

            const newSections = [...sections]
            const sourceSection = { ...newSections[sourceSectionIdx], steps: [...newSections[sourceSectionIdx].steps] }
            const destSection = sourceSectionIdx === destSectionIdx
                ? sourceSection
                : { ...newSections[destSectionIdx], steps: [...newSections[destSectionIdx].steps] }

            const [movedStep] = sourceSection.steps.splice(source.index, 1)
            // Update the step's section_id if moved to a different section
            movedStep.section_id = destSection.id

            destSection.steps.splice(destination.index, 0, movedStep)

            newSections[sourceSectionIdx] = sourceSection
            if (sourceSectionIdx !== destSectionIdx) {
                newSections[destSectionIdx] = destSection
            }

            // Update local state optimistically
            setSections(newSections)

            // Persist the destination section's new step order
            // (If moved between sections, we should ideally update both, but updating the destination is crucial)
            const updatedSteps = destSection.steps.map((step, index) => ({
                id: step.id,
                section_id: destSection.id,
                title: step.title,
                description: step.description,
                sort_order: index
            }))

            startTransition(async () => {
                const res = await reorderSteps(updatedSteps)
                if (!res.success) {
                    toast.error('Failed to save step order')
                    setSections(initialSections) // revert
                }
            })
        }
    }

    // ── Section CRUD ─────────────────────────────────
    const handleSaveSection = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const title = fd.get('title') as string
        const description = fd.get('description') as string
        const icon = fd.get('icon') as string

        startTransition(async () => {
            if (editingSection) {
                const res = await updateSection(editingSection.id, { title, description, icon })
                res.success ? toast.success('Section updated') : toast.error(res.error || 'Failed')
            } else {
                const res = await createSection(checklistTypeId, title, description, icon)
                res.success ? toast.success('Section created') : toast.error(res.error || 'Failed')
            }
            setSectionDialogOpen(false)
            setEditingSection(null)
            router.refresh()
        })
    }

    // ── Step CRUD ────────────────────────────────────
    const handleSaveStep = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const title = fd.get('title') as string

        let parsedWidgetConfig = null
        if (stepWidgetConfig.trim()) {
            try {
                parsedWidgetConfig = JSON.parse(stepWidgetConfig)
            } catch (err) {
                toast.error('Invalid JSON in Widget Config')
                return
            }
        }

        startTransition(async () => {
            if (editingStep) {
                const res = await updateStep(editingStep.id, { title, description: stepDescription, widget_config: parsedWidgetConfig })
                res.success ? toast.success('Step updated') : toast.error(res.error || 'Failed')
            } else {
                const res = await createStep(stepSectionId, title, stepDescription, parsedWidgetConfig)
                res.success ? toast.success('Step created') : toast.error(res.error || 'Failed')
            }
            setStepDialogOpen(false)
            setEditingStep(null)
            setStepDescription('')
            setStepWidgetConfig('')
            router.refresh()
        })
    }

    const openAddStep = (sectionId: string) => {
        setEditingStep(null)
        setStepSectionId(sectionId)
        setStepDescription('')
        setStepWidgetConfig('')
        setStepDialogOpen(true)
    }

    const openEditStep = (step: Step, sectionId: string) => {
        setEditingStep(step)
        setStepSectionId(sectionId)
        setStepDescription(step.description || '')
        setStepWidgetConfig(step.widget_config ? JSON.stringify(step.widget_config, null, 2) : '')
        setStepDialogOpen(true)
    }

    // ── Delete handler ──────────────────────────────
    const handleDelete = () => {
        if (!deleteTarget) return
        startTransition(async () => {
            const res = deleteTarget.type === 'section'
                ? await deleteSection(deleteTarget.id)
                : await deleteStep(deleteTarget.id)
            res.success ? toast.success(`${deleteTarget.type === 'section' ? 'Section' : 'Step'} deleted`) : toast.error(res.error || 'Failed')
            setDeleteDialogOpen(false)
            setDeleteTarget(null)
            router.refresh()
        })
    }

    return (
        <div>
            {/* Add Section button */}
            <div className="flex justify-end mb-4">
                <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                        setEditingSection(null)
                        setSectionDialogOpen(true)
                    }}
                >
                    <Plus className="w-4 h-4" /> Add Section
                </Button>
            </div>

            {/* Sections list */}
            {sections.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No sections yet. Click &quot;Add Section&quot; to get started.
                    </CardContent>
                </Card>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="sections" type="section">
                        {(provided) => (
                            <div
                                className="space-y-3"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {sections.map((section, sIdx) => (
                                    <Draggable key={section.id} draggableId={section.id} index={sIdx}>
                                        {(provided, snapshot) => (
                                            <Card
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`${snapshot.isDragging ? 'shadow-lg border-primary/50 ring-1 ring-primary/20' : ''}`}
                                            >
                                                <CardHeader
                                                    className="cursor-pointer py-3 px-4"
                                                    onClick={() => toggleExpanded(section.id)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground/40 hover:text-foreground transition-colors"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <GripVertical className="w-4 h-4" />
                                                            </div>
                                                            {expandedSections.has(section.id)
                                                                ? <ChevronDown className="w-4 h-4" />
                                                                : <ChevronRight className="w-4 h-4" />
                                                            }
                                                            <span className="text-lg mr-1">{section.icon || '📋'}</span>
                                                            <div>
                                                                <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                                                                <p className="text-xs text-muted-foreground">{section.description}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <span className="text-xs text-muted-foreground mr-2">
                                                                {section.steps.length} step{section.steps.length !== 1 ? 's' : ''}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => {
                                                                    setEditingSection(section)
                                                                    setSectionDialogOpen(true)
                                                                }}
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                                                onClick={() => {
                                                                    setDeleteTarget({ type: 'section', id: section.id, name: section.title })
                                                                    setDeleteDialogOpen(true)
                                                                }}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>

                                                {expandedSections.has(section.id) && (
                                                    <CardContent className="pt-0 pb-4 px-4">
                                                        <Droppable droppableId={section.id} type="step">
                                                            {(provided) => (
                                                                <div
                                                                    className="ml-12 space-y-1"
                                                                    {...provided.droppableProps}
                                                                    ref={provided.innerRef}
                                                                >
                                                                    {section.steps.map((step, stIdx) => (
                                                                        <Draggable key={step.id} draggableId={step.id} index={stIdx}>
                                                                            {(provided, snapshot) => (
                                                                                <div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    className={`flex items-center justify-between py-2 px-3 rounded-md border border-transparent hover:bg-muted/50 group ${snapshot.isDragging ? 'bg-background shadow-md border-border ring-1 ring-primary/20 z-10' : ''}`}
                                                                                >
                                                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                                        <div
                                                                                            {...provided.dragHandleProps}
                                                                                            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/30 hover:text-foreground transition-colors"
                                                                                        >
                                                                                            <GripVertical className="w-3.5 h-3.5" />
                                                                                        </div>
                                                                                        <span className="text-xs text-muted-foreground font-mono w-5 text-right flex-shrink-0">
                                                                                            {stIdx + 1}.
                                                                                        </span>
                                                                                        <div className="min-w-0">
                                                                                            <span className="text-sm truncate block">{step.title}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-6 w-6"
                                                                                            onClick={() => openEditStep(step, section.id)}
                                                                                        >
                                                                                            <Pencil className="w-3 h-3" />
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-6 w-6 text-red-500"
                                                                                            onClick={() => {
                                                                                                setDeleteTarget({ type: 'step', id: step.id, name: step.title })
                                                                                                setDeleteDialogOpen(true)
                                                                                            }}
                                                                                        >
                                                                                            <Trash2 className="w-3 h-3" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))}
                                                                    {provided.placeholder}

                                                                    <div className="pt-2">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="text-xs gap-1.5 text-muted-foreground"
                                                                            onClick={() => openAddStep(section.id)}
                                                                        >
                                                                            <Plus className="w-3 h-3" /> Add Step
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Droppable>
                                                    </CardContent>
                                                )}
                                            </Card>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            {/* ── Section Dialog ──────────────────────────── */}
            <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingSection ? 'Edit Section' : 'Add Section'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveSection}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input name="title" defaultValue={editingSection?.title || ''} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea name="description" defaultValue={editingSection?.description || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label>Icon (emoji)</Label>
                                <Input name="icon" defaultValue={editingSection?.icon || '📋'} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Step Dialog ─────────────────────────────── */}
            <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingStep ? 'Edit Step' : 'Add Step'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveStep} className="flex flex-col flex-1 min-h-0">
                        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input name="title" defaultValue={editingStep?.title || ''} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Description / Instructions</Label>
                                <RichTextEditor
                                    value={stepDescription}
                                    onChange={setStepDescription}
                                />
                            </div>
                            <div className="space-y-2 pt-2">
                                <Label>Widget Configuration (JSON)</Label>
                                <p className="text-[11px] text-muted-foreground leading-tight mb-1">
                                    Optionally attach an interactive credential form. Must be valid JSON like: <br />
                                    <code>{`{"title": "API Keys", "fields": [{"key": "openai_key", "label": "OpenAI Key", "type": "password"}]}`}</code>
                                </p>
                                <Textarea
                                    value={stepWidgetConfig}
                                    onChange={(e) => setStepWidgetConfig(e.target.value)}
                                    className="font-mono text-xs min-h-[120px]"
                                    placeholder='{&#10;  "title": "LLM Credentials",&#10;  "fields": [&#10;    { "key": "openai_api_key", "label": "OpenAI API Key", "type": "password", "required": true }&#10;  ]&#10;}'
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-4 mt-auto">
                            <Button type="button" variant="outline" onClick={() => setStepDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ─────────────────────── */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete {deleteTarget?.type === 'section' ? 'Section' : 'Step'}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-4">
                        Are you sure you want to delete <strong>&quot;{deleteTarget?.name}&quot;</strong>?
                        {deleteTarget?.type === 'section' && (
                            <span className="block mt-2 text-red-500">
                                This will also delete all steps within this section and all sub-account progress for those steps.
                            </span>
                        )}
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                            {isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
