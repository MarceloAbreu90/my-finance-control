/**
 * API Client — typed access to financial data.
 *
 * Currently backed by localStorage so the app is fully functional in preview.
 * To integrate with Cloudflare Pages Functions + D1 later, replace each method
 * body with `fetch('/api/...')`. The signatures are stable.
 */
import { loadDB, mutateDB, uid } from "./storage";
import type { Cartao, Categoria, Despesa, ID, Receita, Usuario } from "./types";

const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 50));

// ---------- Auth ----------
export const api = {
  // Auth -----
  async login(email: string, senha: string): Promise<Usuario> {
    const db = loadDB();
    if (db.usuario.email.toLowerCase() !== email.toLowerCase() || db.senhaHash !== senha) {
      throw new Error("E-mail ou senha incorretos");
    }
    return delay(db.usuario);
  },
  async resetPassword(email: string): Promise<void> {
    const db = loadDB();
    if (db.usuario.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error("E-mail não encontrado");
    }
    return delay(undefined);
  },
  async changePassword(atual: string, nova: string): Promise<void> {
    const db = loadDB();
    if (db.senhaHash !== atual) throw new Error("Senha atual incorreta");
    mutateDB((d) => {
      d.senhaHash = nova;
    });
    return delay(undefined);
  },
  async updateUsuario(patch: Partial<Pick<Usuario, "nome" | "email">>): Promise<Usuario> {
    const db = mutateDB((d) => {
      d.usuario = { ...d.usuario, ...patch };
    });
    return delay(db.usuario);
  },

  // Categorias -----
  async listCategorias(): Promise<Categoria[]> {
    return delay(loadDB().categorias);
  },
  async createCategoria(input: Omit<Categoria, "id">): Promise<Categoria> {
    const novo: Categoria = { ...input, id: uid() };
    mutateDB((d) => void d.categorias.push(novo));
    return delay(novo);
  },
  async updateCategoria(id: ID, patch: Partial<Categoria>): Promise<void> {
    mutateDB((d) => {
      const i = d.categorias.findIndex((c) => c.id === id);
      if (i >= 0) d.categorias[i] = { ...d.categorias[i], ...patch };
    });
    return delay(undefined);
  },
  async deleteCategoria(id: ID): Promise<void> {
    mutateDB((d) => {
      d.categorias = d.categorias.filter((c) => c.id !== id);
    });
    return delay(undefined);
  },

  // Receitas -----
  async listReceitas(): Promise<Receita[]> {
    return delay(loadDB().receitas);
  },
  async createReceita(input: Omit<Receita, "id">): Promise<Receita> {
    const novo: Receita = { ...input, id: uid() };
    mutateDB((d) => void d.receitas.push(novo));
    return delay(novo);
  },
  async updateReceita(id: ID, patch: Partial<Receita>): Promise<void> {
    mutateDB((d) => {
      const i = d.receitas.findIndex((r) => r.id === id);
      if (i >= 0) d.receitas[i] = { ...d.receitas[i], ...patch };
    });
    return delay(undefined);
  },
  async deleteReceita(id: ID): Promise<void> {
    mutateDB((d) => {
      d.receitas = d.receitas.filter((r) => r.id !== id);
    });
    return delay(undefined);
  },

  // Despesas -----
  async listDespesas(): Promise<Despesa[]> {
    return delay(loadDB().despesas);
  },
  async createDespesa(input: Omit<Despesa, "id">): Promise<Despesa[]> {
    const created: Despesa[] = [];
    mutateDB((d) => {
      const grupo = uid();
      const parcelas = input.parcelas && input.parcelas > 1 ? input.parcelas : 1;
      const baseDate = new Date(input.data);
      for (let i = 0; i < parcelas; i++) {
        const data = new Date(baseDate);
        data.setMonth(data.getMonth() + i);
        const item: Despesa = {
          ...input,
          id: uid(),
          data: data.toISOString().slice(0, 10),
          parcelas,
          parcelaAtual: i + 1,
          compraGrupoId: parcelas > 1 ? grupo : undefined,
        };
        d.despesas.push(item);
        created.push(item);
      }
    });
    return delay(created);
  },
  async updateDespesa(id: ID, patch: Partial<Despesa>): Promise<void> {
    mutateDB((d) => {
      const i = d.despesas.findIndex((x) => x.id === id);
      if (i >= 0) d.despesas[i] = { ...d.despesas[i], ...patch };
    });
    return delay(undefined);
  },
  async deleteDespesa(id: ID): Promise<void> {
    mutateDB((d) => {
      d.despesas = d.despesas.filter((x) => x.id !== id);
    });
    return delay(undefined);
  },

  // Cartões -----
  async listCartoes(): Promise<Cartao[]> {
    return delay(loadDB().cartoes);
  },
  async createCartao(input: Omit<Cartao, "id">): Promise<Cartao> {
    const novo: Cartao = { ...input, id: uid() };
    mutateDB((d) => void d.cartoes.push(novo));
    return delay(novo);
  },
  async updateCartao(id: ID, patch: Partial<Cartao>): Promise<void> {
    mutateDB((d) => {
      const i = d.cartoes.findIndex((c) => c.id === id);
      if (i >= 0) d.cartoes[i] = { ...d.cartoes[i], ...patch };
    });
    return delay(undefined);
  },
  async deleteCartao(id: ID): Promise<void> {
    mutateDB((d) => {
      d.cartoes = d.cartoes.filter((c) => c.id !== id);
      d.despesas = d.despesas.filter((x) => x.cartaoId !== id);
    });
    return delay(undefined);
  },
};

export type Api = typeof api;