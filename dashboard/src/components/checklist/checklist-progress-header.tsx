'use client'

import type { ChecklistData } from './types'

type Props = {
    data: ChecklistData
}

export default function ChecklistProgressHeader({ data }: Props) {
    const { checklistType, totalSteps, completedSteps, percentage } = data

    return (
        <div className="rounded-xl border bg-card p-6 mb-8">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{checklistType.title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{checklistType.description}</p>
                </div>
                <div className="text-right">
                    <span className={`text-4xl font-bold tabular-nums ${percentage === 100 ? 'text-emerald-500' : percentage > 0 ? 'text-amber-500' : 'text-muted-foreground'
                        }`}>
                        {percentage}%
                    </span>
                    <p className="text-sm text-muted-foreground">{completedSteps}/{totalSteps} steps</p>
                </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3 mt-4 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${percentage === 100 ? 'bg-emerald-500' : percentage > 0 ? 'bg-amber-500' : 'bg-muted-foreground/20'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}
