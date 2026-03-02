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
import { Loader2, Save, Brain, Database, Shield } from 'lucide-react'

interface KBSettingsFormProps {
    subAccountId: string
    settings: any
    activeTab: string
}

export default function KBSettingsForm({ subAccountId, settings, activeTab }: KBSettingsFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        embedding_model: settings?.embedding_model || 'openai/text-embedding-3-small',
        chunk_size: settings?.chunk_size || 1000,
        chunk_overlap: settings?.chunk_overlap || 200,
        top_k: settings?.top_k || 5,
        use_mock: settings?.use_mock || false,
        reranking_enabled: settings?.reranking_enabled || false,
        reranking_model: settings?.reranking_model || 'cohere/rerank-v3-english',
        retention_days: settings?.retention_days || 30,
        auto_cleanup_enabled: settings?.auto_cleanup_enabled || true,
        hybrid_search_enabled: settings?.hybrid_search_enabled !== false, // Default to true
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

    const renderTabContent = () => {
        switch (activeTab) {
            case 'fine-tuning':
                return (
                    <>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-primary" />
                                <CardTitle>Advanced Fine-tuning</CardTitle>
                            </div>
                            <CardDescription>
                                Optimize retrieval precision with advanced re-ranking and logic.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-2 text-sm">
                                <Label htmlFor="reranking_enabled">Reranking Mode</Label>
                                <Select
                                    value={formData.reranking_enabled ? 'true' : 'false'}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, reranking_enabled: v === 'true' }))}
                                >
                                    <SelectTrigger id="reranking_enabled">
                                        <SelectValue placeholder="Select mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="false">Standard Retrieval (Faster)</SelectItem>
                                        <SelectItem value="true">Reranking Enabled (More Precise)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[12px] text-muted-foreground">
                                    Uses a separate model to re-evalute top results for maximum accuracy.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="reranking_model">Reranking Model</Label>
                                <Select
                                    value={formData.reranking_model}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, reranking_model: v }))}
                                    disabled={!formData.reranking_enabled}
                                >
                                    <SelectTrigger id="reranking_model">
                                        <SelectValue placeholder="Select reranker" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cohere/rerank-v3-english">Cohere Rerank v3 English</SelectItem>
                                        <SelectItem value="cohere/rerank-v3-multilingual">Cohere Rerank v3 Multilingual</SelectItem>
                                        <SelectItem value="jina/jina-reranker-v2-base-multilingual">Jina Reranker v2 Base</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </>
                )
            case 'retention':
                return (
                    <>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                <CardTitle>Data Retention & Privacy</CardTitle>
                            </div>
                            <CardDescription>
                                Manage how long your knowledgebase data and logs are stored.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="retention_days">Default Retention Period (Days)</Label>
                                <Input
                                    id="retention_days"
                                    type="number"
                                    value={formData.retention_days}
                                    onChange={(e) => setFormData(prev => ({ ...prev, retention_days: parseInt(e.target.value) }))}
                                />
                                <p className="text-[12px] text-muted-foreground">
                                    Number of days to keep processed chunks and source logs.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="auto_cleanup_enabled">Auto-Cleanup Policy</Label>
                                <Select
                                    value={formData.auto_cleanup_enabled ? 'true' : 'false'}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, auto_cleanup_enabled: v === 'true' }))}
                                >
                                    <SelectTrigger id="auto_cleanup_enabled">
                                        <SelectValue placeholder="Select policy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Automatic Cleanup (Recommended)</SelectItem>
                                        <SelectItem value="false">Manual Cleanup Only</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[12px] text-muted-foreground">
                                    Automatically delete expired data based on the retention period.
                                </p>
                            </div>
                        </CardContent>
                    </>
                )
            default:
                return (
                    <>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-primary" />
                                <CardTitle>RAG Configuration</CardTitle>
                            </div>
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

                            <div className="grid gap-2">
                                <Label htmlFor="hybrid_search_enabled">Hybrid Search Strategy</Label>
                                <Select
                                    value={formData.hybrid_search_enabled ? 'true' : 'false'}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, hybrid_search_enabled: v === 'true' }))}
                                >
                                    <SelectTrigger id="hybrid_search_enabled">
                                        <SelectValue placeholder="Select strategy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Hybrid (Vector + Keyword) - Highly Recommended</SelectItem>
                                        <SelectItem value="false">Semantic Vector Only</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[12px] text-muted-foreground">
                                    Combines semantic meaning (Vector) with exact keyword matching (Full-Text Search).
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
                    </>
                )
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                {renderTabContent()}
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
