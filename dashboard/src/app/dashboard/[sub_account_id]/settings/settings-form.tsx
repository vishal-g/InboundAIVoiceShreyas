'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateSettings } from './actions'

type SettingsFormProps = {
    subAccountId: string
    settings: {
        first_line?: string
        agent_instructions?: string
        llm_model?: string
        tts_voice?: string
        cal_event_type_id?: string | number
    }
}

export default function SettingsForm({ subAccountId, settings }: SettingsFormProps) {
    const [state, formAction, isPending] = useActionState(updateSettings, { success: false, error: null })

    useEffect(() => {
        if (state?.success) {
            toast.success('Settings saved successfully!')
        } else if (state?.error) {
            toast.error(`Failed to save: ${state.error}`)
        }
    }, [state])

    return (
        <form action={formAction}>
            <input type="hidden" name="sub_account_id" value={subAccountId} />
            <Card>
                <CardHeader>
                    <CardTitle>Voice Agent Identity</CardTitle>
                    <CardDescription>
                        Configure how the AI introduces itself and what guidelines it follows.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="first_line">First Line (Greeting)</Label>
                        <Input
                            id="first_line"
                            name="first_line"
                            defaultValue={settings.first_line || ''}
                            required
                        />
                        <p className="text-xs text-muted-foreground">This is the exact first sentence the AI will say when it answers the phone.</p>
                    </div>
                    <div className="space-y-2 pt-2">
                        <Label htmlFor="agent_instructions">System Prompt / Instructions</Label>
                        <Textarea
                            id="agent_instructions"
                            name="agent_instructions"
                            defaultValue={settings.agent_instructions || ''}
                            className="min-h-[250px]"
                            required
                        />
                        <p className="text-xs text-muted-foreground">The master instructions determining the AI&apos;s behavior, personality, and data collection goals.</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Model & Voice Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="llm_model">LLM Model</Label>
                        <Select name="llm_model" defaultValue={settings.llm_model || 'openai:gpt-4o-mini'}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="openai:gpt-4o-mini">GPT-4o Mini (Fastest)</SelectItem>
                                <SelectItem value="openai:gpt-4o">GPT-4o</SelectItem>
                                <SelectItem value="anthropic:claude-3-5-haiku">Claude 3.5 Haiku</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 pt-2">
                        <Label htmlFor="tts_voice">TTS Voice (ElevenLabs / OpenAI / Sarvam)</Label>
                        <Input
                            id="tts_voice"
                            name="tts_voice"
                            defaultValue={settings.tts_voice || ''}
                        />
                    </div>
                    <div className="space-y-2 pt-2">
                        <Label htmlFor="cal_event_type_id">Cal.com Event Type ID</Label>
                        <Input
                            id="cal_event_type_id"
                            name="cal_event_type_id"
                            defaultValue={settings.cal_event_type_id?.toString() || ''}
                        />
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Saving...' : 'Save settings'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    )
}
