'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Send, Loader2, User, Bot, Info, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
    role: 'user' | 'assistant'
    content: string
    sources?: any[]
}

interface ChatTabProps {
    subAccountId: string
}

export default function ChatTab({ subAccountId }: ChatTabProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I'm your RAG explorer. Ask me anything about the documents and URLs you've added to your Knowledgebase." }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, loading])

    async function handleSend(e: React.FormEvent) {
        e.preventDefault()
        if (!input.trim() || loading) return

        const userMsg = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setLoading(true)

        try {
            const response = await fetch('/api/kb/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    sub_account_id: subAccountId,
                    history: messages.map(m => ({ role: m.role, content: m.content }))
                })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to get response')

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.answer,
                sources: data.sources
            }])
        } catch (error: any) {
            console.error('Chat error:', error)
            toast.error(`Error: ${error.message}`)
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error while processing your request." }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-[1fr_300px] h-[600px]">
            <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        RAG Playground
                    </CardTitle>
                    <CardDescription>
                        Test how your AI agent retrieves and answers based on your Knowledgebase.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex gap-3 ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                    {m.role === 'assistant' && (
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Bot className="h-5 w-5 text-primary" />
                                        </div>
                                    )}
                                    <div className={`
                                        max-w-[80%] p-3 rounded-2xl text-sm
                                        ${m.role === 'assistant'
                                            ? 'bg-muted text-foreground rounded-tl-none'
                                            : 'bg-primary text-primary-foreground rounded-tr-none'
                                        }
                                    `}>
                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                    </div>
                                    {m.role === 'user' && (
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                            <User className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-3 justify-start">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Bot className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="bg-muted text-foreground p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-xs">Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-background">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <Input
                                placeholder="Ask about your documents..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={loading}
                            />
                            <Button type="submit" disabled={loading || !input.trim()}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col gap-4 overflow-hidden">
                <Card className="flex-1 overflow-hidden flex flex-col">
                    <CardHeader className="pb-3 border-b shrink-0">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Retrieved Sources
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 text-xs space-y-4">
                        {messages[messages.length - 1]?.sources?.length ? (
                            messages[messages.length - 1].sources?.map((s, i) => (
                                <div key={i} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                                    <div className="flex items-center justify-between font-semibold text-primary">
                                        <span className="truncate">Source {i + 1}</span>
                                        <span className="opacity-70">{(s.similarity * 100).toFixed(1)}% match</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                        {s.metadata?.file_name || s.metadata?.source_url || 'Unknown source'}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-muted-foreground italic h-full flex items-center justify-center text-center p-4">
                                Send a message to see which parts of your knowledge base are being retrieved.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
