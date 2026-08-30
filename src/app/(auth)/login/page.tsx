import { GoogleLoginButton } from "@/components/auth/google-login-button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Ultimate Task</h1>
          <p className="text-muted-foreground text-sm">続けるにはログインしてください</p>
        </div>
        <GoogleLoginButton />
      </div>
    </main>
  );
}
