'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

async function requirePlatformAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { admin: null, error: 'Unauthorized' }

    const admin = createAdminClient()
    const { data: roleData } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (roleData?.role !== 'platform_admin') {
        return { admin: null, error: 'Only platform admins can manage agencies' }
    }
    return { admin, error: null }
}

export async function createAgency(_prevState: any, formData: FormData) {
    const { admin, error: authError } = await requirePlatformAdmin()
    if (authError || !admin) return { success: false, error: authError }

    const name = formData.get('name') as string
    if (!name?.trim()) return { success: false, error: 'Agency name is required' }

    const { error } = await admin
        .from('agencies')
        .insert({ name: name.trim(), is_active: true })

    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/agencies')
    return { success: true, error: null }
}

export async function updateAgency(_prevState: any, formData: FormData) {
    const { admin, error: authError } = await requirePlatformAdmin()
    if (authError || !admin) return { success: false, error: authError }

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const isActive = formData.get('is_active') === 'true'

    const { error } = await admin
        .from('agencies')
        .update({ name, is_active: isActive })
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/agencies')
    return { success: true, error: null }
}

export async function deleteAgency(id: string) {
    const { admin, error: authError } = await requirePlatformAdmin()
    if (authError || !admin) return { success: false, error: authError }

    const { error } = await admin.from('agencies').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/agencies')
    return { success: true, error: null }
}
