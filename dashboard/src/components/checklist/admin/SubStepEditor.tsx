'use client'

import React from 'react'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import type { MultiStepConfig, MultiStepSlide } from '../types'

type Props = {
    config: MultiStepConfig
    onChange: (config: MultiStepConfig) => void
}

export function SubStepEditor({ config, onChange }: Props) {
    const slides = config.slides || []

    const addSlide = () => {
        const newSlide: MultiStepSlide = { title: 'New Sub-step', content: '' }
        onChange({ ...config, slides: [...slides, newSlide] })
    }

    const updateSlide = (index: number, updates: Partial<MultiStepSlide>) => {
        const nextSlides = [...slides]
        nextSlides[index] = { ...nextSlides[index], ...updates }
        onChange({ ...config, slides: nextSlides })
    }

    const removeSlide = (index: number) => {
        onChange({ ...config, slides: slides.filter((_, i) => i !== index) })
    }

    const moveSlide = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === slides.length - 1) return

        const nextSlides = [...slides]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        const [moved] = nextSlides.splice(index, 1)
        nextSlides.splice(targetIndex, 0, moved)
        onChange({ ...config, slides: nextSlides })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h4 className="text-sm font-medium">Sub-step Sequence</h4>
                    <p className="text-xs text-muted-foreground">Break this step into multiple sequential slides.</p>
                </div>
                <Button type="button" size="sm" onClick={addSlide} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Sub-step
                </Button>
            </div>

            {slides.length === 0 ? (
                <div className="border rounded-md p-8 text-center bg-muted/20">
                    <p className="text-sm text-muted-foreground italic">No sub-steps added yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {slides.map((slide, index) => (
                        <div key={index} className="border rounded-lg bg-card overflow-hidden shadow-sm">
                            <div className="bg-muted/30 px-4 py-2 flex items-center justify-between border-b">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-muted-foreground w-6">#{index + 1}</span>
                                    <h5 className="text-sm font-semibold truncate max-w-[200px]">{slide.title || 'Untitled Sub-step'}</h5>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSlide(index, 'up')} disabled={index === 0}>
                                        <ChevronUp className="w-4 h-4" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSlide(index, 'down')} disabled={index === slides.length - 1}>
                                        <ChevronDown className="w-4 h-4" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 ml-1" onClick={() => removeSlide(index)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-4 space-y-4 bg-muted/5">
                                <div className="space-y-2">
                                    <Label className="text-xs">Slide Title</Label>
                                    <Input
                                        value={slide.title}
                                        onChange={(e) => updateSlide(index, { title: e.target.value })}
                                        placeholder="e.g., Understanding the Dashboard"
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Rich Content</Label>
                                    <RichTextEditor
                                        value={slide.content}
                                        onChange={(val) => updateSlide(index, { content: val })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs flex items-center gap-2">Video URL <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span></Label>
                                    <Input
                                        value={slide.video_url || ''}
                                        onChange={(e) => updateSlide(index, { video_url: e.target.value })}
                                        placeholder="YouTube/Loom link"
                                        className="h-8"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
