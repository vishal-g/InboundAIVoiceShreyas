'use client'

import React from 'react'
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { QuizConfig, QuizQuestion } from '../types'

type Props = {
    config: QuizConfig
    onChange: (config: QuizConfig) => void
}

export function QuizEditor({ config, onChange }: Props) {
    const questions = config.questions || []

    const addQuestion = () => {
        const newQuestion: QuizQuestion = {
            id: Math.random().toString(36).substr(2, 9),
            text: 'New Question',
            options: ['Option 1', 'Option 2'],
            correct_index: 0
        }
        onChange({ ...config, questions: [...questions, newQuestion] })
    }

    const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
        const nextQuestions = [...questions]
        nextQuestions[index] = { ...nextQuestions[index], ...updates }
        onChange({ ...config, questions: nextQuestions })
    }

    const removeQuestion = (index: number) => {
        onChange({ ...config, questions: questions.filter((_, i) => i !== index) })
    }

    const addOption = (qIdx: number) => {
        const nextQuestions = [...questions]
        nextQuestions[qIdx].options.push(`New Option ${nextQuestions[qIdx].options.length + 1}`)
        onChange({ ...config, questions: nextQuestions })
    }

    const updateOption = (qIdx: number, oIdx: number, val: string) => {
        const nextQuestions = [...questions]
        nextQuestions[qIdx].options[oIdx] = val
        onChange({ ...config, questions: nextQuestions })
    }

    const removeOption = (qIdx: number, oIdx: number) => {
        const nextQuestions = [...questions]
        const question = nextQuestions[qIdx]
        if (question.options.length <= 2) return // Keep at least 2 options

        question.options.splice(oIdx, 1)
        if (question.correct_index >= question.options.length) {
            question.correct_index = 0
        }
        onChange({ ...config, questions: nextQuestions })
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border">
                <div className="space-y-2">
                    <Label className="text-xs">Quiz Overall Title</Label>
                    <Input
                        value={config.title || ''}
                        onChange={(e) => onChange({ ...config, title: e.target.value })}
                        placeholder="e.g., Knowledge Check"
                        className="h-9"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Success Threshold (%)</Label>
                    <Input
                        type="number"
                        min="0"
                        max="100"
                        value={config.threshold}
                        onChange={(e) => onChange({ ...config, threshold: parseInt(e.target.value) || 100 })}
                        className="h-9"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h4 className="text-sm font-medium">Questions</h4>
                    <p className="text-xs text-muted-foreground">Define multiple choice questions for the user.</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addQuestion} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Question
                </Button>
            </div>

            {questions.length === 0 ? (
                <div className="border border-dashed rounded-md p-8 text-center bg-muted/10">
                    <p className="text-sm text-muted-foreground italic">No questions added yet.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {questions.map((question, qIdx) => (
                        <div key={question.id} className="relative border rounded-lg bg-card p-5 shadow-sm">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-red-500"
                                onClick={() => removeQuestion(qIdx)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>

                            <div className="space-y-4">
                                <div className="space-y-2 pr-10">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Question {qIdx + 1}</Label>
                                    <Input
                                        value={question.text}
                                        onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                                        placeholder="Type your question here..."
                                        className="font-medium"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Options</Label>
                                    <div className="grid gap-2">
                                        {question.options.map((option, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-2 group">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuestion(qIdx, { correct_index: oIdx })}
                                                    className={`transition-colors ${question.correct_index === oIdx ? 'text-emerald-500' : 'text-muted-foreground/30 hover:text-muted-foreground'}`}
                                                >
                                                    {question.correct_index === oIdx ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                </button>
                                                <Input
                                                    value={option}
                                                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                                    className={`h-9 flex-1 ${question.correct_index === oIdx ? 'border-emerald-200 bg-emerald-50/10' : ''}`}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                                                    onClick={() => removeOption(qIdx, oIdx)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" className="text-xs h-7 gap-1.5" onClick={() => addOption(qIdx)}>
                                        <Plus className="w-3 h-3" /> Add Option
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
