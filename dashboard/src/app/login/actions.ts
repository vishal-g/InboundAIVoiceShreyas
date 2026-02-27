'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    console.log("=== LOGIN ATTEMPT ===")
    console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("ANON_KEY prefix:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30))

    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    console.log("Attempting login for:", data.email)

    const { error, data: authData } = await supabase.auth.signInWithPassword(data)

    if (error) {
        console.error("=== LOGIN FAILED ===")
        console.error("Error code:", error.status)
        console.error("Error message:", error.message)
        console.error("Full error:", JSON.stringify(error, null, 2))
        redirect('/login?message=Could not authenticate user')
    }

    console.log("=== LOGIN SUCCESS ===")
    console.log("User ID:", authData.user?.id)

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    // NOTE: In a multi-tenant B2B app, public signups are often disabled. 
    // We keep this here purely for testing or admin manual creation.
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/login?message=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
