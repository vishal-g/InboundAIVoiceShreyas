'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function requirePlatformAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { supabase: null, error: 'Unauthorized' }

    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (roleData?.role !== 'platform_admin') {
        return { supabase: null, error: 'Only platform admins can manage agencies' }
    }
    return { supabase, error: null }
}

export async function createAgency(_prevState: any, formData: FormData) {
    const { supabase, error: authError } = await requirePlatformAdmin()
    if (authError || !supabase) return { success: false, error: authError }

    const name = formData.get('name') as string
    if (!name?.trim()) return { success: false, error: 'Agency name is required' }

    const { error } = await supabase
        .from('agencies')
        .insert({ name: name.trim(), is_active: true })

    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/agencies')
    return { success: true, error: null }
}

export async function updateAgency(_prevState: any, formData: FormData) {
    const { supabase, error: authError } = await requirePlatformAdmin()
    if (authError || !supabase) return { success: false, error: authError }

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const isActive = formData.get('is_active') === 'true'

    const { error } = await supabase
        .from('agencies')
        .update({ name, is_active: isActive })
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/agencies')
    return { success: true, error: null }
}

export async function deleteAgency(id: string) {
    const { supabase, error: authError } = await requirePlatformAdmin()
    if (authError || !supabase) return { success: false, error: authError }

    const { error } = await supabase.from('agencies').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/agencies')
    return { success: true, error: null }
}
