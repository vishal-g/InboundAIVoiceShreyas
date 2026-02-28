import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgencyActions, CreateAgencyButton } from './agency-client'

export default async function AgenciesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const admin = createAdminClient()

    const { data: roleData } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single()

    if (roleData?.role !== 'platform_admin') {
        redirect('/dashboard')
    }

    const { data: agencies } = await admin
        .from('agencies')
        .select('*, sub_accounts(count)')
        .order('name')

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="px-7 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Agencies</CardTitle>
                        <CardDescription>
                            Manage the white-label agencies operating on your platform.
                        </CardDescription>
                    </div>
                    <CreateAgencyButton />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Agency Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Sub-Accounts</TableHead>
                                <TableHead className="hidden md:table-cell">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agencies?.map((agency: any) => (
                                <TableRow key={agency.id}>
                                    <TableCell>
                                        <div className="font-medium">{agency.name}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{agency.id.slice(0, 8)}…</div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        {agency.sub_accounts?.[0]?.count ?? 0}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Badge variant={agency.is_active ? 'default' : 'secondary'}>
                                            {agency.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <AgencyActions agencyId={agency.id} agencyName={agency.name} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!agencies || agencies.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No agencies yet. Click &quot;Add Agency&quot; to create one.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
