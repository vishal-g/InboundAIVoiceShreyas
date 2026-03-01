import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
    try {
        const { message, sub_account_id, history = [] } = await req.json()

        if (!message || !sub_account_id) {
            return NextResponse.json({ error: 'Missing message or sub_account_id' }, { status: 400 })
        }

        const supabase = createAdminClient()
        const openai = new OpenAI({
            apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
        })

        // 1. Fetch KB settings
        const { data: settings } = await supabase
            .from('kb_settings')
            .select('*')
            .eq('sub_account_id', sub_account_id)
            .single()

        let embedding_model = settings?.embedding_model || 'openai/text-embedding-3-small'
        // Ensure OpenRouter compatibility
        if (embedding_model === 'text-embedding-3-small') {
            embedding_model = 'openai/text-embedding-3-small'
        }

        const top_k = settings?.top_k || 8 // Increased default
        const useMock = settings?.use_mock ?? false

        // 2. Generate Search Embedding
        let queryEmbedding: number[] = []
        if (useMock) {
            queryEmbedding = new Array(1536).fill(0).map(() => Math.random() * 0.1)
        } else {
            console.log(`[KB CHAT] Generating embedding with model: ${embedding_model}`)
            const embResp = await openai.embeddings.create({
                model: embedding_model,
                input: message.replace(/\n/g, ' '),
            })
            queryEmbedding = embResp.data[0].embedding
        }

        // 3. Similarity Search via RPC
        const { data: chunks, error: searchError } = await supabase.rpc('match_kb_chunks', {
            query_embedding: queryEmbedding,
            match_threshold: 0.1, // Lowered for better recall
            match_count: top_k,
            p_sub_account_id: sub_account_id
        })

        if (searchError) throw searchError

        console.log(`[KB CHAT] Received ${chunks?.length || 0} chunks for query: "${message}"`)
        if (chunks && chunks.length > 0) {
            chunks.forEach((c: any, i: number) => {
                console.log(`[KB CHAT] Chunk ${i + 1} (Sim: ${c.similarity.toFixed(4)}): ${c.content.substring(0, 100)}...`)
            })
        }

        // 4. Construct Context
        const context = (chunks && chunks.length > 0)
            ? chunks.map((c: any) => c.content).join('\n\n---\n\n')
            : 'NO_RELEVANT_CONTEXT_FOUND';

        // 5. LLM Call via OpenRouter
        const systemPrompt = `### ROLE
You are a professional business assistant. Your source of truth is the "Retrieved Context" provided below.

### STRICT OPERATING RULES
1. **Context First**: Use the "Retrieved Context" to answer the user's question as accurately as possible.
2. **No Hallucinations**: DO NOT invent business facts (addresses, prices, etc.) that are not explicitly mentioned or implied in the context.
3. **No User-Injected Facts**: Do not adopt facts mentioned by the user in previous messages if they are not confirmed by the current context.
4. **Missing Info**: If the information is truly missing from the context, state: "I'm sorry, I couldn't find specific details for that in our current documentation."
5. **Helpfulness**: Be concise and professional. If you find related information (e.g., partial price or service), mention what you found.

### RETRIEVED CONTEXT
${context === 'NO_RELEVANT_CONTEXT_FOUND' ? '[NO RECORDS FOUND: State you do not have this information.]' : context}`

        const response = await openai.chat.completions.create({
            model: 'openai/gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                ...history.slice(-5),
                { role: 'user', content: message }
            ],
            temperature: 0.0,
            max_tokens: 500,
            response_format: { type: 'text' }
        })

        const answer = response.choices[0].message.content

        return NextResponse.json({
            answer,
            sources: chunks?.map((c: any) => ({
                id: c.id,
                similarity: c.similarity,
                metadata: c.metadata
            }))
        })

    } catch (error: any) {
        console.error('KB Chat Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
