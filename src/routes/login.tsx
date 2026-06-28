import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — My Finance Control" },
      { name: "description", content: "Acesse sua conta do My Finance Control." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState("demo@finance.app");
  const [senha, setSenha] = useState("demo1234");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    if (!loading && user && pathname === "/login") navigate({ to: "/" });
  }, [loading, user, pathname, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (resetMode) {
        await api.resetPassword(email);
        toast.success("Se o e-mail existir, enviaremos instruções de recuperação.");
        setResetMode(false);
      } else {
        await login(email, senha, remember);
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Wallet className="size-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">My Finance Control</h1>
          <p className="text-sm text-muted-foreground">Seu controle financeiro pessoal</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold">
            {resetMode ? "Recuperar senha" : "Entrar"}
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!resetMode && (
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
          )}

          {!resetMode && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(Boolean(v))}
              />
              Manter conectado
            </label>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Aguarde…" : resetMode ? "Enviar recuperação" : "Entrar"}
          </Button>

          <button
            type="button"
            onClick={() => setResetMode((v) => !v)}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {resetMode ? "Voltar ao login" : "Esqueci minha senha"}
          </button>

          <p className="rounded-md bg-muted px-3 py-2 text-center text-[11px] text-muted-foreground">
            Demo: <strong>demo@finance.app</strong> / <strong>demo1234</strong>
          </p>
        </form>
      </div>
    </div>
  );
}