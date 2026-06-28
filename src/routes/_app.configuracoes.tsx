import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import type { Cartao, Despesa, Receita, Usuario } from "@/lib/api/types";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, KeyRound, Repeat, Tags, User } from "lucide-react";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — My Finance Control" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { user } = useAuth();
  const [usuario, setUsuario] = useState<Usuario | null>(user);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [recReceitas, setRecReceitas] = useState<Receita[]>([]);
  const [recDespesas, setRecDespesas] = useState<Despesa[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);

  useEffect(() => {
    void (async () => {
      const [r, d, c] = await Promise.all([api.listReceitas(), api.listDespesas(), api.listCartoes()]);
      setRecReceitas(r.filter((x) => x.recorrencia !== "nenhuma"));
      setRecDespesas(d.filter((x) => x.recorrencia !== "nenhuma"));
      setCartoes(c);
    })();
  }, []);

  const saveUsuario = async () => {
    if (!usuario) return;
    await api.updateUsuario({ nome: usuario.nome, email: usuario.email });
    toast.success("Dados atualizados");
  };

  const changePass = async () => {
    if (!atual || !nova) { toast.error("Preencha as senhas."); return; }
    if (nova.length < 6) { toast.error("Nova senha deve ter ao menos 6 caracteres."); return; }
    try {
      await api.changePassword(atual, nova);
      setAtual(""); setNova("");
      toast.success("Senha alterada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Conta, senha, cartões e recorrências.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="size-4" /> Conta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={usuario?.nome ?? ""} onChange={(e) => setUsuario((u) => (u ? { ...u, nome: e.target.value } : u))} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={usuario?.email ?? ""} onChange={(e) => setUsuario((u) => (u ? { ...u, email: e.target.value } : u))} />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={saveUsuario}>Salvar conta</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="size-4" /> Alterar senha</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Senha atual</Label>
            <Input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input type="password" value={nova} onChange={(e) => setNova(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={changePass}>Atualizar senha</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CreditCard className="size-4" /> Cartões</CardTitle>
            <Link to="/cartoes" className="text-xs text-primary hover:underline">Gerenciar</Link>
          </CardHeader>
          <CardContent>
            {cartoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cartão. Cadastre na tela Cartões.</p>
            ) : (
              <ul className="divide-y">
                {cartoes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{c.nome}</span>
                    <span className="text-muted-foreground">{formatBRL(c.limite)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Tags className="size-4" /> Categorias</CardTitle>
            <Link to="/categorias" className="text-xs text-primary hover:underline">Gerenciar</Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Categorias padrão já criadas. Edite ou crie novas na tela Categorias.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Repeat className="size-4" /> Receitas recorrentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recReceitas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Marque uma receita como recorrente na tela Financeiro.</p>
            ) : (
              <ul className="divide-y">
                {recReceitas.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{r.descricao} <span className="text-xs text-muted-foreground">• {r.recorrencia}</span></span>
                    <span className="font-semibold text-success">{formatBRL(r.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Repeat className="size-4" /> Despesas recorrentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recDespesas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Marque uma despesa como recorrente na tela Financeiro.</p>
            ) : (
              <ul className="divide-y">
                {recDespesas.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{d.descricao} <span className="text-xs text-muted-foreground">• {d.recorrencia}</span></span>
                    <span className="font-semibold text-destructive">{formatBRL(d.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}