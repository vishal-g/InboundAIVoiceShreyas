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
            <ChecklistGuideModal
                open={isOpen}
                onOpenChange={setIsOpen}
                checklistType={data.checklistType}
                sections={data.sections}
                initialSectionId={data.sections[0]?.id || ''}
                subAccountId={subAccountId}
                basePath="/dashboard/credentials"
                credentials={data.credentials}
                prompts={data.prompts}
                isInline={true}
            />
        </div>
    )
}
