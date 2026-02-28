'use client'

import React, { useState } from 'react'
import { CheckCircle2, Circle, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { QuizConfig } from './types'

type Props = {
    config: QuizConfig
    onComplete: (passed: boolean) => void
}

export function QuizWidget({ config, onComplete }: Props) {
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [results, setResults] = useState<{ passed: boolean; score: number } | null>(null)

    const questions = config.questions || []
    const isCompleted = Object.keys(answers).length === questions.length

    const handleSelect = (questionId: string, optionIndex: number) => {
        if (results) return // Locked after submission
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }))
    }

    const handleSubmit = () => {
        let correctCount = 0
        questions.forEach(q => {
            if (answers[q.id] === q.correct_index) {
                correctCount++
            }
        })

        const score = (correctCount / questions.length) * 100
        const passed = score >= (config.threshold || 100)

        setResults({ passed, score })
        onComplete(passed)
    }

    const reset = () => {
        setAnswers({})
        setResults(null)
        onComplete(false)
    }

    return (
        <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h4 className="text-xl font-bold tracking-tight">{config.title || 'Confirmation Quiz'}</h4>
                <p className="text-sm text-muted-foreground">Answer these questions to confirm your understanding.</p>
            </div>

            <div className="space-y-10">
                {questions.map((q, qIdx) => (
                    <div key={q.id} className="space-y-4">
                        <div className="flex gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold border">
                                Q{qIdx + 1}
                            </span>
                            <p className="text-base font-semibold pt-1">{q.text}</p>
                        </div>

                        <div className="grid gap-2 pl-11">
                            {q.options.map((option, oIdx) => {
                                const isSelected = answers[q.id] === oIdx
                                const isCorrect = q.correct_index === oIdx
                                const showCorrect = results && isCorrect
                                const showWrong = results && isSelected && !isCorrect

                                return (
                                    <button
                                        key={oIdx}
                                        onClick={() => handleSelect(q.id, oIdx)}
                                        className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left group ${isSelected
                                                ? 'border-indigo-500 bg-indigo-50/30'
                                                : 'border-transparent bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            } ${showCorrect ? 'border-emerald-500 bg-emerald-50/30' : ''} ${showWrong ? 'border-red-500 bg-red-50/30' : ''
                                            }`}
                                    >
                                        <div className={`mt-0.5 transition-colors ${isSelected ? 'text-indigo-500' : 'text-slate-300 group-hover:text-slate-400'
                                            } ${showCorrect ? 'text-emerald-500' : ''} ${showWrong ? 'text-red-500' : ''}`}>
                                            {isSelected || showCorrect ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </div>
                                        <span className={`text-[15px] font-medium ${isSelected ? 'text-indigo-950 dark:text-indigo-50' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {option}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-6 border-t">
                {!results ? (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground font-medium">
                            {Object.keys(answers).length} of {questions.length} answered
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={!isCompleted}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
                        >
                            Check Answers
                        </Button>
                    </div>
                ) : (
                    <div className={`p-6 rounded-2xl flex items-center justify-between ${results.passed ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${results.passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                {results.passed ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                            </div>
                            <div>
                                <h5 className={`font-bold text-lg ${results.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {results.passed ? 'Excellent! You passed.' : 'Not quite right.'}
                                </h5>
                                <p className="text-sm opacity-80">You scored {results.score}%</p>
                            </div>
                        </div>
                        {!results.passed && (
                            <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                                <RefreshCw className="w-4 h-4" /> Try Again
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
