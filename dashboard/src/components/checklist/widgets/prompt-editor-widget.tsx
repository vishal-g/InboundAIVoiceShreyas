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
    promptKey: string
    existingPrompt?: {
        id?: string
        name: string
        description: string
        content: string
    }
}

export function PromptEditorWidget({
    subAccountId,
    aiType,
    promptKey,
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
                    Configure Prompt: <span className="font-mono text-primary">{promptKey}</span>
                </span>
            </div>

            <div className="p-5">
                <form action={formAction} className="space-y-4">
                    <input type="hidden" name="sub_account_id" value={subAccountId} />
                    <input type="hidden" name="ai_type" value={aiType} />
                    <input type="hidden" name="prompt_key" value={promptKey} />
                    <input type="hidden" name="id" value={existingPrompt?.id || ''} />

                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                            Display Name / Title
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="e.g. Master System Prompt"
                            defaultValue={existingPrompt?.name || ''}
                            className="bg-background font-medium"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium">
                            Short Description / Goal
                        </Label>
                        <Input
                            id="description"
                            name="description"
                            placeholder="e.g. Handling common sales objections"
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
                            className="min-h-[250px] bg-background font-mono text-sm leading-relaxed"
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
