import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

export default async function LoginPage(props: { searchParams: Promise<{ message?: string }> }) {
    const searchParams = await props.searchParams;

    return (
        <div className="flex min-h-svh items-center justify-center bg-muted/50 p-6 md:p-10">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        {searchParams?.message && (
                            <p className="text-sm text-red-500 font-medium">{searchParams.message}</p>
                        )}
                        <Button formAction={login} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                            Login
                        </Button>
                        {/* Keeping signup hidden unless explicitly needed by an admin */}
                        {/* <Button formAction={signup} variant="outline" className="w-full">
              Sign up
            </Button> */}
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
