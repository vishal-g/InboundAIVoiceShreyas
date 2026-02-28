'use client'

import { useState, useActionState, useEffect } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { savePrompt } from './actions'

type PromptEditorWidgetProps = {
    subAccountId: string
    aiType: 'text' | 'voice'
    promptName: string
    existingPrompt?: {
        description: string
        content: string
    }
}

export function PromptEditorWidget({
    subAccountId,
    aiType,
    promptName,
    existingPrompt
}: PromptEditorWidgetProps) {
    const [state, formAction, isPending] = useActionState(savePrompt, { success: false, error: null })

    useEffect(() => {
        if (state?.success) {
            toast.success('Prompt saved successfully')
        } else if (state?.error) {
            toast.error(state.error)
        }
    }, [state])

    return (
        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3">
                <span className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                    Configure Prompt: {promptName}
                </span>
            </div>

            <div className="p-5">
                <form action={formAction} className="space-y-4">
                    <input type="hidden" name="sub_account_id" value={subAccountId} />
                    <input type="hidden" name="ai_type" value={aiType} />
                    <input type="hidden" name="name" value={promptName} />

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium">
                            Short Description / Goal
                        </Label>
                        <Input
                            id="description"
                            name="description"
                            placeholder="e.g. Master system prompt for handling objections"
                            defaultValue={existingPrompt?.description || ''}
                            className="bg-background"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content" className="text-sm font-medium">
                            Prompt Content
                        </Label>
                        <Textarea
                            id="content"
                            name="content"
                            placeholder="Type your prompt instructions here..."
                            defaultValue={existingPrompt?.content || ''}
                            className="min-h-[200px] bg-background font-mono text-sm leading-relaxed"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isPending}
                        className="mt-4 w-auto bg-[#1e293b] hover:bg-[#0f172a] text-white shadow-sm cursor-pointer"
                    >
                        {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Prompt
                    </Button>
                </form>
            </div>
        </div>
    )
}
