'use client'

import { ChecklistData } from '@/components/checklist/types'
import ChecklistGuideModal from '@/components/checklist/checklist-guide-modal'
import { useState } from 'react'

type Props = {
    data: ChecklistData
    subAccountId: string
}

export default function CredentialsPage({ data, subAccountId }: Props) {
    const [isOpen, setIsOpen] = useState(true)

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Credentials</h1>
                <p className="text-muted-foreground max-w-2xl">
                    Configure your AI personality, API keys, and external integrations.
                    Changes here affect all your AI interactions.
                </p>
            </div>

            {/* In Page mode, the ChecklistGuideModal acts as the main content area */}
            <ChecklistGuideModal
                open={isOpen}
                onOpenChange={setIsOpen} // In this context, it should probably stay open, but we keep the prop
                checklistType={data.checklistType}
                sections={data.sections}
                initialSectionId={data.sections[0]?.id || ''}
                subAccountId={subAccountId}
                basePath="/dashboard/credentials"
                credentials={data.credentials}
                prompts={data.prompts}
            />
        </div>
    )
}
