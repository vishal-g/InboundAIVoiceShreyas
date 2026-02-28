'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function saveDynamicCredentials(_prevState: unknown, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const subAccountId = formData.get('subAccountId') as string
    if (!subAccountId) return { success: false, error: 'Missing subAccountId' }

    const admin = createAdminClient()

    // 1. RBAC Check (Sub-account user or admin)
    const { data: roleData } = await admin
        .from('user_roles')
        .select('role, sub_account_id')
        .eq('user_id', user.id)
        .single()

    if (
        roleData?.role !== 'platform_admin' &&
        (roleData?.role !== 'sub_account_user' || roleData?.sub_account_id !== subAccountId)
    ) {
        return { success: false, error: 'Unauthorized access to sub-account' }
    }

    // 2. Fetch existing credentials so we can merge, not overwrite
    const { data: settingsData } = await admin
        .from('sub_account_settings')
        .select('credentials')
        .eq('sub_account_id', subAccountId)
        .single()

    const newCredentials: Record<string, string> = { ...(settingsData?.credentials || {}) } as Record<string, string>

    // 3. Extract all form fields (except the hidden subAccountId)
    const entries = Array.from(formData.entries())
    for (const [key, value] of entries) {
        if (key !== 'subAccountId' && value) {
            newCredentials[key] = value.toString().trim()
        }
    }

    // 4. Update the JSONB column
    const { error } = await admin
        .from('sub_account_settings')
        .update({ credentials: newCredentials })
        .eq('sub_account_id', subAccountId)

    if (error) {
        console.error('Failed to save dynamic credentials:', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/${subAccountId}`)
    return { success: true, error: null }
}

export async function savePrompt(_prevState: unknown, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const subAccountId = formData.get('sub_account_id') as string
    const aiType = formData.get('ai_type') as 'text' | 'voice'
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const content = formData.get('content') as string

    if (!subAccountId || !aiType || !name || !content) {
        return { success: false, error: 'Missing required fields' }
    }

    const admin = createAdminClient()

    // RBAC Check
    const { data: roleData } = await admin
        .from('user_roles')
        .select('role, sub_account_id')
        .eq('user_id', user.id)
        .single()

    if (
        roleData?.role !== 'platform_admin' &&
        (roleData?.role !== 'sub_account_user' || roleData?.sub_account_id !== subAccountId)
    ) {
        return { success: false, error: 'Unauthorized access to sub-account' }
    }

    // Upsert the prompt based on sub_account_id, ai_type and name
    const { error } = await admin
        .from('prompts')
        .upsert({
            sub_account_id: subAccountId,
            ai_type: aiType,
            name: name,
            description: description,
            content: content,
            updated_at: new Date().toISOString()
        }, { onConflict: 'sub_account_id,ai_type,name' })

    if (error) {
        console.error('Failed to save prompt:', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/${subAccountId}`)
    return { success: true, error: null }
}
