'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface KBSettingsFormProps {
    subAccountId: string
    settings: any
}

export default function KBSettingsForm({ subAccountId, settings }: KBSettingsFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        embedding_model: settings?.embedding_model || 'openai/text-embedding-3-small',
        chunk_size: settings?.chunk_size || 1000,
        chunk_overlap: settings?.chunk_overlap || 200,
        top_k: settings?.top_k || 5,
        use_mock: settings?.use_mock || false,
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('kb_settings')
                .upsert({
                    sub_account_id: subAccountId,
                    ...formData,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error

            toast.success('Settings saved successfully')
            router.refresh()
        } catch (error: any) {
            console.error('Error saving settings:', error)
            toast.error(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>RAG Configuration</CardTitle>
                    <CardDescription>
                        Default settings for information retrieval. These affect how your AI provides answers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="embedding_model">Embedding Model</Label>
                        <Select
                            value={formData.embedding_model}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, embedding_model: v }))}
                        >
                            <SelectTrigger id="embedding_model">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="openai/text-embedding-3-small">OpenRouter: OpenAI text-embedding-3-small (Recommended)</SelectItem>
                                <SelectItem value="openai/text-embedding-3-large">OpenRouter: OpenAI text-embedding-3-large</SelectItem>
                                <SelectItem value="voyageai/voyage-2">OpenRouter: Voyage AI - Voyage-2</SelectItem>
                                <SelectItem value="google/text-embedding-004">OpenRouter: Google text-embedding-004</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[12px] text-muted-foreground">
                            The model used to turn your text into numbers (vectors). Now powered by <strong>OpenRouter</strong>.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="chunk_size">Chunk Size (Tokens)</Label>
                            <Input
                                id="chunk_size"
                                type="number"
                                value={formData.chunk_size}
                                onChange={(e) => setFormData(prev => ({ ...prev, chunk_size: parseInt(e.target.value) }))}
                            />
                            <p className="text-[12px] text-muted-foreground">
                                Large chunks provide more context but may dilute relevance.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="chunk_overlap">Chunk Overlap</Label>
                            <Input
                                id="chunk_overlap"
                                type="number"
                                value={formData.chunk_overlap}
                                onChange={(e) => setFormData(prev => ({ ...prev, chunk_overlap: parseInt(e.target.value) }))}
                            />
                            <p className="text-[12px] text-muted-foreground">
                                Keeps context between splits.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="top_k">Top-K Retrieval</Label>
                        <Input
                            id="top_k"
                            type="number"
                            value={formData.top_k}
                            onChange={(e) => setFormData(prev => ({ ...prev, top_k: parseInt(e.target.value) }))}
                        />
                        <p className="text-[12px] text-muted-foreground">
                            Number of relevant document pieces to provide to the AI for each question.
                        </p>
                    </div>

                    <div className="grid gap-2 p-4 border rounded-lg bg-orange-500/5 border-orange-500/20">
                        <Label htmlFor="use_mock" className="text-orange-600 font-semibold">Mock Processing (Debugging)</Label>
                        <Select
                            value={formData.use_mock ? 'true' : 'false'}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, use_mock: v === 'true' }))}
                        >
                            <SelectTrigger id="use_mock" className="border-orange-500/50">
                                <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="false">Standard (Use OpenAI)</SelectItem>
                                <SelectItem value="true">Mock Mode (Skip OpenAI Credits)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-orange-600/80">
                            <strong>Warning:</strong> In Mock Mode, vector embeddings are simulated (zeros/random).
                            Use this only if you have hit OpenAI quota limits and want to test the UI flow.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={loading} className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Settings
                    </Button>
                </CardFooter>
            </Card>
        </form>
    )
}
