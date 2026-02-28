'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function saveDynamicCredentials(_prevState: any, formData: FormData) {
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

    let newCredentials = { ...(settingsData?.credentials || {}) }

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
