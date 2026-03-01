import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'

export async function POST(req: NextRequest) {
    let currentUrlId: string | null = null;
    try {
        const { url_id, sub_account_id } = await req.json()
        currentUrlId = url_id

        if (!url_id || !sub_account_id) {
            return NextResponse.json({ error: 'Missing url_id or sub_account_id' }, { status: 400 })
        }

        const supabase = createAdminClient()
        const openai = new OpenAI({
            apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'https://github.com/vishaal-stai',
                'X-Title': 'Stai Sales Rep Dashboard',
            }
        })

        // 1. Fetch URL metadata
        const { data: urlRecord, error: urlError } = await supabase
            .from('kb_urls')
            .select('*')
            .eq('id', url_id)
            .single()

        if (urlError || !urlRecord) throw new Error('URL record not found in database')

        // 2. Fetch KB settings
        const { data: settings } = await supabase
            .from('kb_settings')
            .select('*')
            .eq('sub_account_id', sub_account_id)
            .single()

        const chunk_size = settings?.chunk_size || 1000
        const chunk_overlap = settings?.chunk_overlap || 200
        const embedding_model = settings?.embedding_model || 'openai/text-embedding-3-small'
        const useMock = settings?.use_mock ?? false

        // 3. Update status to 'crawling'
        await supabase.from('kb_urls').update({ status: 'crawling', error_message: null }).eq('id', url_id)

        // 4. Fetch HTML content
        const response = await fetch(urlRecord.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`)
        const html = await response.text()

        // 5. Extract Text using Cheerio
        const $ = cheerio.load(html)

        // Remove script, style, nav, footer to get cleaner content
        $('script, style, nav, footer, iframe, noscript').remove()

        // Get text from body or main content areas
        const text = $('body').text()
            .replace(/\s+/g, ' ')
            .trim()

        if (!text || text.length < 50) {
            throw new Error('No significant text content found on the page')
        }

        // 6. Chunk Text
        const chunks = splitText(text, chunk_size, chunk_overlap)

        // 7. Clear old chunks for this URL
        await supabase.from('kb_chunks').delete().eq('url_id', url_id)

        // 8. Generate Embeddings and Save Chunks
        const batchSize = 10;
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize)

            const embeddingPromises = batch.map(async (chunkText, index) => {
                let embedding: number[] = []

                if (useMock) {
                    embedding = new Array(1536).fill(0).map(() => Math.random() * 0.1)
                } else {
                    const embeddingResponse = await openai.embeddings.create({
                        model: embedding_model,
                        input: chunkText.replace(/\n/g, ' '),
                    })
                    embedding = embeddingResponse.data[0].embedding
                }

                return {
                    sub_account_id,
                    url_id,
                    content: chunkText,
                    embedding,
                    metadata: {
                        chunk_index: i + index,
                        total_chunks: chunks.length,
                        is_mock: useMock,
                        source_url: urlRecord.url
                    }
                }
            })

            const entries = await Promise.all(embeddingPromises)
            const { error: insertError } = await supabase.from('kb_chunks').insert(entries)
            if (insertError) throw insertError
        }

        // 9. Final Status Update
        await supabase.from('kb_urls').update({
            status: 'completed',
            last_crawled_at: new Date().toISOString()
        }).eq('id', url_id)

        return NextResponse.json({
            success: true,
            chunks: chunks.length,
            message: `Successfully crawled and processed ${chunks.length} chunks`
        })

    } catch (error: any) {
        console.error('URL Crawling Error:', error)

        if (currentUrlId) {
            const supabase = createAdminClient()
            await supabase.from('kb_urls').update({
                status: 'error',
                error_message: error.message
            }).eq('id', currentUrlId)
        }

        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

function splitText(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = []
    const cleanText = text.replace(/\s+/g, ' ').trim()

    let start = 0
    while (start < cleanText.length) {
        let end = start + size

        if (end < cleanText.length) {
            const lastPeriod = cleanText.lastIndexOf('. ', end)
            if (lastPeriod > start + (size * 0.8)) {
                end = lastPeriod + 1
            }
        }

        chunks.push(cleanText.substring(start, end).trim())
        start = end - overlap
        if (start < 0) start = 0
        if (start >= cleanText.length) break
    }

    return chunks.filter(c => c.length > 0)
}
