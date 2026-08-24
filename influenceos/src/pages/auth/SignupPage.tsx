import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRole } from "@/types/database";
import { cn } from "@/lib/utils";

export function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") === "brand" ? "brand" : "creator";

  const [role, setRole] = React.useState<UserRole>(initialRole);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [is18Plus, setIs18Plus] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!is18Plus || !agreedToTerms) {
      toast.error("Please confirm you are 18+ and agree to the data processing consent.");
      return;
    }

    setSubmitting(true);
    const { error } = await signUp({ email, password, fullName, role, is18PlusConfirmed: is18Plus });
    setSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Account created!");
    navigate(role === "brand" ? "/onboarding/brand" : "/onboarding/creator");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <CardTitle>Join InfluenceOS</CardTitle>
          <CardDescription>Free for creators. Escrow-protected for brands.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-5 grid grid-cols-2 gap-2">
            {(["creator", "brand"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-lg border border-border p-3 text-sm font-medium capitalize transition-colors",
                  role === r ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                I&apos;m a {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={is18Plus} onCheckedChange={(v) => setIs18Plus(Boolean(v))} />
              I certify that I am 18 years of age or older.
            </label>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={agreedToTerms} onCheckedChange={(v) => setAgreedToTerms(Boolean(v))} />
              I confirm the information I provide is accurate and consent to DPDP-compliant data processing as
              described in{" "}
              <Link to="/trust-and-compliance" className="text-primary hover:underline">
                Trust &amp; Compliance
              </Link>
              .
            </label>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account…" : `Create ${role} account`}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
