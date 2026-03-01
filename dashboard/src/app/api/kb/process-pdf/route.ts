import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
    let currentDocId: string | null = null;
    try {
        const { document_id, sub_account_id } = await req.json()
        currentDocId = document_id

        if (!document_id || !sub_account_id) {
            return NextResponse.json({ error: 'Missing document_id or sub_account_id' }, { status: 400 })
        }

        const supabase = createAdminClient()
        const openai = new OpenAI({
            apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'https://github.com/vishaal-stai', // Optional but recommended by OpenRouter
                'X-Title': 'Stai Sales Rep Dashboard',
            }
        })

        // 1. Fetch document metadata
        const { data: document, error: docError } = await supabase
            .from('kb_documents')
            .select('*')
            .eq('id', document_id)
            .single()

        if (docError || !document) throw new Error('Document not found in database')

        // 2. Fetch KB settings for this sub-account
        const { data: settings } = await supabase
            .from('kb_settings')
            .select('*')
            .eq('sub_account_id', sub_account_id)
            .single()

        const chunk_size = settings?.chunk_size || 1000
        const chunk_overlap = settings?.chunk_overlap || 200
        const embedding_model = settings?.embedding_model || 'openai/text-embedding-3-small'

        // 3. Ensure status is 'processing'
        await supabase.from('kb_documents').update({ status: 'processing', error_message: null }).eq('id', document_id)

        // 4. Download PDF from Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('knowledgebase')
            .download(document.file_path)

        if (downloadError || !fileData) throw new Error(`Failed to download from storage: ${downloadError?.message}`)

        // 5. Extract Text using standard pdf-parse (with robust class/function check)
        const buffer = Buffer.from(await fileData.arrayBuffer())
        let text = ''
        try {
            const pdfModule = require('pdf-parse')

            // Try modern Class-based API (mehmet-kozan/pdf-parse pattern)
            const PDFParseConstructor = pdfModule.PDFParse || (typeof pdfModule === 'function' && pdfModule.name === 'PDFParse' ? pdfModule : null);

            if (PDFParseConstructor) {
                console.log('[KB PDF] Using modern Class-based PDF parser')
                const parser = new PDFParseConstructor({ data: buffer })
                const result = await parser.getText()
                text = result?.text || ''
            } else {
                // Try legacy function-based API (nisaacson/pdf-parse pattern)
                console.log('[KB PDF] Using legacy function-based PDF parser')
                let pdfFunc = pdfModule
                if (typeof pdfModule !== 'function' && pdfModule.default) {
                    pdfFunc = pdfModule.default
                }

                if (typeof pdfFunc === 'function') {
                    const data = await pdfFunc(buffer)
                    text = data?.text || ''
                } else {
                    const keys = Object.keys(pdfModule).join(', ')
                    throw new Error(`PDF parser module format unrecognized. Exports: ${keys}`)
                }
            }
        } catch (err: any) {
            console.error('[KB PDF] Final extraction error:', err)
            throw new Error(`Failed to extract text from PDF: ${err.message}`)
        }

        if (!text || text.trim().length === 0) {
            console.error('[KB PDF] Validation failed: Text is empty')
            throw new Error('No text content found in PDF after extraction')
        }

        console.log(`[KB PDF] Successfully extracted ${text.length} chars from ${document.file_name}`)

        // 6. Chunk Text (Recursive split approach)
        const chunks = splitText(text, chunk_size, chunk_overlap)

        // 7. Clear old chunks if re-processing
        await supabase.from('kb_chunks').delete().eq('document_id', document_id)

        // 8. Generate Embeddings and Save Chunks
        // Process in batches to avoid rate limits or time-outs if PDF is large
        const batchSize = 10;
        const useMock = settings?.use_mock ?? false;

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize)

            const embeddingPromises = batch.map(async (chunkText, index) => {
                let embedding: number[] = []

                if (useMock) {
                    // Generate a dummy vector of 1536 zeros (or random) for testing UI
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
                    document_id,
                    content: chunkText,
                    embedding,
                    metadata: {
                        chunk_index: i + index,
                        total_chunks: chunks.length,
                        is_mock: useMock,
                        file_name: document.file_name,
                        document_id: document_id
                    }
                }
            })

            const entries = await Promise.all(embeddingPromises)
            const { error: insertError } = await supabase.from('kb_chunks').insert(entries)
            if (insertError) throw insertError
        }

        // 9. Final Status Update
        await supabase.from('kb_documents').update({
            status: 'completed',
            updated_at: new Date().toISOString()
        }).eq('id', document_id)

        return NextResponse.json({
            success: true,
            chunks: chunks.length,
            message: `Successfully processed ${chunks.length} chunks`
        })

    } catch (error: any) {
        console.error('KB Processing Error:', error)

        if (currentDocId) {
            const supabase = createAdminClient()
            await supabase.from('kb_documents').update({
                status: 'error',
                error_message: error.message
            }).eq('id', currentDocId)
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

        // Try to find a good breaking point (period or newline) near the end of the chunk
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
