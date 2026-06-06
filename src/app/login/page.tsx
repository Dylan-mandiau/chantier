"use client";

import { useState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await login(formData);
    if (result?.error) setError(result.error);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-salti.svg" alt="SALTI" className="mx-auto mb-1 h-10 w-auto" />
          <CardTitle className="text-center text-2xl">Chantier Insight</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            SALTI · Intelligence terrain
          </p>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Patientez..." : "Connexion"}
            </Button>
            <p className="text-xs text-center text-muted-foreground pt-2">
              Pas encore de compte ? Contacte ton administrateur SALTI.
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
