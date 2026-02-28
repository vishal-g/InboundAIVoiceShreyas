'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { SectionWithProgress, ChecklistData } from './types'
import ChecklistGuideModal from './checklist-guide-modal'

type Props = {
    data: ChecklistData
    subAccountId: string
    basePath: string
}

function getSectionColor(percentage: number) {
    if (percentage === 100) return {
        border: 'border-emerald-500/60',
        bg: 'bg-emerald-500/5',
        barBg: 'bg-emerald-500',
        text: 'text-emerald-600',
        iconBg: 'bg-emerald-100 text-emerald-700',
        hoverBorder: 'hover:border-emerald-500',
    }
    if (percentage > 0) return {
        border: 'border-amber-500/60',
        bg: 'bg-amber-500/5',
        barBg: 'bg-amber-500',
        text: 'text-amber-600',
        iconBg: 'bg-amber-100 text-amber-700',
        hoverBorder: 'hover:border-amber-500',
    }
    return {
        border: 'border-red-400/60',
        bg: 'bg-red-500/5',
        barBg: 'bg-red-400',
        text: 'text-red-500',
        iconBg: 'bg-red-100 text-red-600',
        hoverBorder: 'hover:border-red-400',
    }
}

export default function ChecklistSectionCards({ data, subAccountId, basePath }: Props) {
    const [selectedSection, setSelectedSection] = useState<SectionWithProgress | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleCardClick = (section: SectionWithProgress) => {
        setSelectedSection(section)
        setIsModalOpen(true)
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.sections.map((section) => {
                    const colors = getSectionColor(section.percentage)
                    return (
                        <button
                            key={section.id}
                            onClick={() => handleCardClick(section)}
                            className={`relative rounded-xl border-2 ${colors.border} ${colors.bg} p-5 text-left transition-all duration-200 ${colors.hoverBorder} hover:shadow-md group cursor-pointer`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center text-lg flex-shrink-0`}>
                                        {section.icon || '📋'}
                                    </div>
                                    <h3 className="font-semibold text-sm uppercase tracking-wide leading-tight">
                                        {section.title}
                                    </h3>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                {section.description}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground font-medium">
                                    {section.completedSteps}/{section.totalSteps} steps
                                </span>
                                <span className={`font-bold ${colors.text}`}>
                                    {section.percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${colors.barBg}`}
                                    style={{ width: `${section.percentage}%` }}
                                />
                            </div>
                        </button>
                    )
                })}
            </div>

            {selectedSection && (
                <ChecklistGuideModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    sections={data.sections}
                    initialSectionId={selectedSection.id}
                    subAccountId={subAccountId}
                    basePath={basePath}
                />
            )}
        </>
    )
}
