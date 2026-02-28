'use client'

import React from 'react'

type Props = {
    total: number
    current: number
    onSelect?: (index: number) => void
}

export function MultiStepProgress({ total, current, onSelect }: Props) {
    return (
        <div className="flex gap-1.5 w-full mb-6">
            {Array.from({ length: total }).map((_, i) => (
                <button
                    key={i}
                    onClick={() => onSelect?.(i)}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= current
                            ? 'bg-emerald-500'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                    aria-label={`Go to slide ${i + 1}`}
                />
            ))}
        </div>
    )
}
