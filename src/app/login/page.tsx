import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/logo';

const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.54-.88 2.48-1.74 3.34.88.88 1.48 2.34 1.48 4.04v.24c0 2.7-1.74 4.04-3.88 4.04-3.34 0-5.74-2.7-5.74-6.34s2.4-6.34 5.74-6.34c1.88 0 3.24.74 3.84 1.34l-3.34 3.34zM12.48 4.2C9.14 4.2 6.5 6.84 6.5 10.2s2.64 6 5.98 6c3.44 0 5.98-2.68 5.98-6s-2.54-6-5.98-6z" fill="#4285F4"/>
    </svg>
);


export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
          <CardDescription>Sign in to continue to Co-Author Pro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard">
                    <GoogleIcon />
                    Sign in with Google
                </Link>
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="#" className="underline text-primary">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
