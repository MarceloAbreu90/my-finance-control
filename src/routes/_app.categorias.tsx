import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { Categoria, CategoriaTipo } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/categorias")({
  head: () => ({ meta: [{ title: "Categorias — My Finance Control" }] }),
  component: CategoriasPage,
});

function CategoriasPage() {
  const [list, setList] = useState<Categoria[]>([]);
  const [editing, setEditing] = useState<Categoria | null>(null);

  const reload = async () => setList(await api.listCategorias());
  useEffect(() => {
    void reload();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir esta categoria?")) return;
    await api.deleteCategoria(id);
    toast.success("Categoria excluída");
    reload();
  };

  const receitas = list.filter((c) => c.tipo === "receita");
  const despesas = list.filter((c) => c.tipo === "despesa");

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Organize suas receitas e despesas.</p>
        </div>
        <Button
          onClick={() => setEditing({ id: "", nome: "", tipo: "despesa", cor: "#3b82f6" })}
          className="gap-2"
        >
          <Plus className="size-4" /> Nova
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <CategoriaSection title="Receitas" items={receitas} onEdit={setEditing} onDelete={remove} />
        <CategoriaSection title="Despesas" items={despesas} onEdit={setEditing} onDelete={remove} />
      </div>

      <CategoriaDialog
        value={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </div>
  );
}

function CategoriaSection({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  items: Categoria[];
  onEdit: (c: Categoria) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma categoria.</div>
        ) : (
          <ul className="divide-y">
            {items.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <span className="size-3 rounded-full" style={{ background: c.cor || "#94a3b8" }} />
                <span className="flex-1 text-sm font-medium">{c.nome}</span>
                {c.padrao && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">padrão</span>}
                <Button variant="ghost" size="icon" onClick={() => onEdit(c)}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CategoriaDialog({
  value,
  onClose,
  onSaved,
}: {
  value: Categoria | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Categoria | null>(value);
  useEffect(() => setForm(value), [value]);
  if (!form) return null;
  const isNew = form.id === "";

  const save = async () => {
    if (!form.nome) { toast.error("Informe o nome."); return; }
    if (isNew) {
      const { id: _i, ...payload } = form;
      void _i;
      await api.createCategoria(payload);
    } else {
      await api.updateCategoria(form.id, form);
    }
    toast.success(isNew ? "Categoria criada" : "Categoria atualizada");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isNew ? "Nova categoria" : "Editar categoria"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as CategoriaTipo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <Input type="color" value={form.cor ?? "#3b82f6"} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}