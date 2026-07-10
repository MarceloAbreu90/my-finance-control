/**
 * API Client — typed access to financial data.
 *
 * Backed by Cloudflare D1 via TanStack Start server functions (src/lib/api/server.ts).
 * Signatures are unchanged from the previous localStorage-backed version, so
 * every call site in the app (routes, hooks) keeps working without edits.
 */
import {
  changePasswordFn,
  createCartaoFn,
  createCategoriaFn,
  createDespesaFn,
  createReceitaFn,
  deleteCartaoFn,
  deleteCategoriaFn,
  deleteDespesaFn,
  deleteReceitaFn,
  loginFn,
  logoutFn,
  meFn,
  resetPasswordFn,
  updateCartaoFn,
  updateCategoriaFn,
  updateDespesaFn,
  updateReceitaFn,
  updateUsuarioFn,
  listCartoesFn,
  listCategoriasFn,
  listDespesasFn,
  listReceitasFn,
} from "./server";
import type { Cartao, Categoria, Despesa, ID, Receita, Usuario } from "./types";

export const api = {
  // Auth -----
  async login(email: string, senha: string, remember = true): Promise<Usuario> {
    return loginFn({ data: { email, senha, remember } });
  },
  async logout(): Promise<void> {
    return logoutFn();
  },
  async me(): Promise<Usuario | null> {
    return meFn();
  },
  async resetPassword(email: string): Promise<void> {
    await resetPasswordFn({ data: { email } });
  },
  async changePassword(atual: string, nova: string): Promise<void> {
    await changePasswordFn({ data: { atual, nova } });
  },
  async updateUsuario(patch: Partial<Pick<Usuario, "nome" | "email">>): Promise<Usuario> {
    return updateUsuarioFn({ data: { patch } });
  },

  // Categorias -----
  async listCategorias(): Promise<Categoria[]> {
    return listCategoriasFn();
  },
  async createCategoria(input: Omit<Categoria, "id">): Promise<Categoria> {
    return createCategoriaFn({ data: { input } });
  },
  async updateCategoria(id: ID, patch: Partial<Categoria>): Promise<void> {
    await updateCategoriaFn({ data: { id, patch } });
  },
  async deleteCategoria(id: ID): Promise<void> {
    await deleteCategoriaFn({ data: { id } });
  },

  // Receitas -----
  async listReceitas(): Promise<Receita[]> {
    return listReceitasFn();
  },
  async createReceita(input: Omit<Receita, "id">): Promise<Receita> {
    return createReceitaFn({ data: { input } });
  },
  async updateReceita(id: ID, patch: Partial<Receita>): Promise<void> {
    await updateReceitaFn({ data: { id, patch } });
  },
  async deleteReceita(id: ID): Promise<void> {
    await deleteReceitaFn({ data: { id } });
  },

  // Despesas -----
  async listDespesas(): Promise<Despesa[]> {
    return listDespesasFn();
  },
  async createDespesa(input: Omit<Despesa, "id">): Promise<Despesa[]> {
    return createDespesaFn({ data: { input } });
  },
  async updateDespesa(id: ID, patch: Partial<Despesa>): Promise<void> {
    await updateDespesaFn({ data: { id, patch } });
  },
  async deleteDespesa(id: ID): Promise<void> {
    await deleteDespesaFn({ data: { id } });
  },

  // Cartões -----
  async listCartoes(): Promise<Cartao[]> {
    return listCartoesFn();
  },
  async createCartao(input: Omit<Cartao, "id">): Promise<Cartao> {
    return createCartaoFn({ data: { input } });
  },
  async updateCartao(id: ID, patch: Partial<Cartao>): Promise<void> {
    await updateCartaoFn({ data: { id, patch } });
  },
  async deleteCartao(id: ID): Promise<void> {
    await deleteCartaoFn({ data: { id } });
  },
};

export type Api = typeof api;
