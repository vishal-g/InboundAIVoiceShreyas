import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function AgenciesPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Verify Admin Role
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single()

    if (roleData?.role !== 'platform_admin') {
        redirect('/dashboard') // Or show standard unauthorized page
    }

    // Fetch all agencies
    const { data: agencies, error } = await supabase.from('agencies').select('*').order('name')

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="px-7">
                    <CardTitle>Agencies</CardTitle>
                    <CardDescription>
                        Manage the white-label agencies operating on your platform.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Agency Name</TableHead>
                                <TableHead className="hidden sm:table-cell">ID</TableHead>
                                <TableHead className="hidden md:table-cell">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agencies?.map((agency) => (
                                <TableRow key={agency.id} className="bg-accent/50">
                                    <TableCell>
                                        <div className="font-medium">{agency.name}</div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-xs font-mono text-muted-foreground">
                                        {agency.id}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Badge className="text-xs" variant="secondary">
                                            Active
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="text-sm cursor-pointer underline hover:text-primary">Edit</span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!agencies || agencies.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4">
                                        No agencies found.
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
