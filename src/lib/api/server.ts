import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { getDB, newId, sha256 } from "./db";
import type { Cartao, Categoria, Despesa, ID, Receita, Usuario } from "./types";

const SESSION_COOKIE = "mfc_uid";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

// ---------- Sessão ----------
// Cookie httpOnly guardando o id do usuário autenticado. Simples e suficiente
// para um app de usuário único; se o app crescer para multiusuário "de
// verdade" (múltiplas contas acessando o mesmo Worker), troque por uma
// sessão assinada via useSession()/sealSession() do @tanstack/react-start/server.
function setSessionCookie(usuarioId: string, remember: boolean) {
  setCookie(SESSION_COOKIE, usuarioId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    // Sem `remember`, omite maxAge -> cookie de sessão (expira ao fechar o navegador).
    ...(remember ? { maxAge: SESSION_MAX_AGE } : {}),
  });
}

async function requireUsuarioId(): Promise<string> {
  const id = getCookie(SESSION_COOKIE);
  if (!id) throw new Error("Não autenticado");
  return id;
}

// ---------- Mapeadores row (snake_case) <-> tipo (camelCase) ----------
type UsuarioRow = { id: string; email: string; nome: string; senha_hash: string };
const toUsuario = (r: UsuarioRow): Usuario => ({ id: r.id, email: r.email, nome: r.nome });

type CategoriaRow = { id: string; nome: string; tipo: "receita" | "despesa"; cor: string | null; padrao: number };
const toCategoria = (r: CategoriaRow): Categoria => ({
  id: r.id,
  nome: r.nome,
  tipo: r.tipo,
  cor: r.cor ?? undefined,
  padrao: !!r.padrao,
});

type ReceitaRow = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria_id: string;
  observacao: string | null;
  recorrencia: Receita["recorrencia"];
};
const toReceita = (r: ReceitaRow): Receita => ({
  id: r.id,
  descricao: r.descricao,
  valor: r.valor,
  data: r.data,
  categoriaId: r.categoria_id,
  observacao: r.observacao ?? undefined,
  recorrencia: r.recorrencia,
});

type DespesaRow = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria_id: string;
  forma_pagamento: Despesa["formaPagamento"];
  cartao_id: string | null;
  observacao: string | null;
  recorrencia: Despesa["recorrencia"];
  parcelas: number | null;
  parcela_atual: number | null;
  compra_grupo_id: string | null;
};
const toDespesa = (r: DespesaRow): Despesa => ({
  id: r.id,
  descricao: r.descricao,
  valor: r.valor,
  data: r.data,
  categoriaId: r.categoria_id,
  formaPagamento: r.forma_pagamento,
  cartaoId: r.cartao_id ?? undefined,
  observacao: r.observacao ?? undefined,
  recorrencia: r.recorrencia,
  parcelas: r.parcelas ?? undefined,
  parcelaAtual: r.parcela_atual ?? undefined,
  compraGrupoId: r.compra_grupo_id ?? undefined,
});

type CartaoRow = {
  id: string;
  nome: string;
  bandeira: string | null;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
  cor: string | null;
};
const toCartao = (r: CartaoRow): Cartao => ({
  id: r.id,
  nome: r.nome,
  bandeira: r.bandeira ?? undefined,
  limite: r.limite,
  diaFechamento: r.dia_fechamento,
  diaVencimento: r.dia_vencimento,
  cor: r.cor ?? undefined,
});

// ---------- Auth ----------
export const loginFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; senha: string; remember?: boolean }) => d)
  .handler(async ({ data }) => {
    const db = getDB();
    const hash = await sha256(data.senha);
    const row = await db
      .prepare("SELECT * FROM usuarios WHERE lower(email) = lower(?)")
      .bind(data.email)
      .first<UsuarioRow>();
    if (!row || row.senha_hash !== hash) {
      throw new Error("E-mail ou senha incorretos");
    }
    setSessionCookie(row.id, data.remember ?? true);
    return toUsuario(row);
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE, { path: "/" });
});

export const meFn = createServerFn({ method: "GET" }).handler(async () => {
  const id = getCookie(SESSION_COOKIE);
  if (!id) return null;
  const db = getDB();
  const row = await db.prepare("SELECT * FROM usuarios WHERE id = ?").bind(id).first<UsuarioRow>();
  return row ? toUsuario(row) : null;
});

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const db = getDB();
    const row = await db
      .prepare("SELECT id FROM usuarios WHERE lower(email) = lower(?)")
      .bind(data.email)
      .first();
    if (!row) throw new Error("E-mail não encontrado");
    // Envio de e-mail de verdade fica fora de escopo aqui — apenas valida que a conta existe.
  });

export const changePasswordFn = createServerFn({ method: "POST" })
  .validator((d: { atual: string; nova: string }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    const row = await db.prepare("SELECT senha_hash FROM usuarios WHERE id = ?").bind(usuarioId).first<{
      senha_hash: string;
    }>();
    if (!row || row.senha_hash !== (await sha256(data.atual))) {
      throw new Error("Senha atual incorreta");
    }
    await db
      .prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?")
      .bind(await sha256(data.nova), usuarioId)
      .run();
  });

export const updateUsuarioFn = createServerFn({ method: "POST" })
  .validator((d: { patch: Partial<Pick<Usuario, "nome" | "email">> }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    const current = await db.prepare("SELECT * FROM usuarios WHERE id = ?").bind(usuarioId).first<UsuarioRow>();
    if (!current) throw new Error("Usuário não encontrado");
    const nome = data.patch.nome ?? current.nome;
    const email = data.patch.email ?? current.email;
    await db.prepare("UPDATE usuarios SET nome = ?, email = ? WHERE id = ?").bind(nome, email, usuarioId).run();
    return toUsuario({ ...current, nome, email });
  });

// ---------- Categorias ----------
export const listCategoriasFn = createServerFn({ method: "GET" }).handler(async () => {
  const usuarioId = await requireUsuarioId();
  const db = getDB();
  const { results } = await db
    .prepare("SELECT * FROM categorias WHERE usuario_id = ? ORDER BY nome")
    .bind(usuarioId)
    .all<CategoriaRow>();
  return results.map(toCategoria);
});

export const createCategoriaFn = createServerFn({ method: "POST" })
  .validator((d: { input: Omit<Categoria, "id"> }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    const id = newId();
    await db
      .prepare("INSERT INTO categorias (id, usuario_id, nome, tipo, cor, padrao) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, usuarioId, data.input.nome, data.input.tipo, data.input.cor ?? null, data.input.padrao ? 1 : 0)
      .run();
    return { ...data.input, id } satisfies Categoria;
  });

export const updateCategoriaFn = createServerFn({ method: "POST" })
  .validator((d: { id: ID; patch: Partial<Categoria> }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    const current = await db
      .prepare("SELECT * FROM categorias WHERE id = ? AND usuario_id = ?")
      .bind(data.id, usuarioId)
      .first<CategoriaRow>();
    if (!current) return;
    const merged = { ...toCategoria(current), ...data.patch };
    await db
      .prepare("UPDATE categorias SET nome = ?, tipo = ?, cor = ?, padrao = ? WHERE id = ? AND usuario_id = ?")
      .bind(merged.nome, merged.tipo, merged.cor ?? null, merged.padrao ? 1 : 0, data.id, usuarioId)
      .run();
  });

export const deleteCategoriaFn = createServerFn({ method: "POST" })
  .validator((d: { id: ID }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    await db.prepare("DELETE FROM categorias WHERE id = ? AND usuario_id = ?").bind(data.id, usuarioId).run();
  });

// ---------- Receitas ----------
export const listReceitasFn = createServerFn({ method: "GET" }).handler(async () => {
  const usuarioId = await requireUsuarioId();
  const db = getDB();
  const { results } = await db
    .prepare("SELECT * FROM receitas WHERE usuario_id = ? ORDER BY data DESC")
    .bind(usuarioId)
    .all<ReceitaRow>();
  return results.map(toReceita);
});

export const createReceitaFn = createServerFn({ method: "POST" })
  .validator((d: { input: Omit<Receita, "id"> }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    const id = newId();
    const { input } = data;
    await db
      .prepare(
        "INSERT INTO receitas (id, usuario_id, descricao, valor, data, categoria_id, observacao, recorrencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, usuarioId, input.descricao, input.valor, input.data, input.categoriaId, input.observacao ?? null, input.recorrencia)
      .run();
    return { ...input, id } satisfies Receita;
  });

export const updateReceitaFn = createServerFn({ method: "POST" })
  .validator((d: { id: ID; patch: Partial<Receita> }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    const current = await db
      .prepare("SELECT * FROM receitas WHERE id = ? AND usuario_id = ?")
      .bind(data.id, usuarioId)
      .first<ReceitaRow>();
    if (!current) return;
    const merged = { ...toReceita(current), ...data.patch };
    await db
      .prepare(
        "UPDATE receitas SET descricao = ?, valor = ?, data = ?, categoria_id = ?, observacao = ?, recorrencia = ? WHERE id = ? AND usuario_id = ?",
      )
      .bind(
        merged.descricao,
        merged.valor,
        merged.data,
        merged.categoriaId,
        merged.observacao ?? null,
        merged.recorrencia,
        data.id,
        usuarioId,
      )
      .run();
  });

export const deleteReceitaFn = createServerFn({ method: "POST" })
  .validator((d: { id: ID }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    await db.prepare("DELETE FROM receitas WHERE id = ? AND usuario_id = ?").bind(data.id, usuarioId).run();
  });

// ---------- Despesas ----------
export const listDespesasFn = createServerFn({ method: "GET" }).handler(async () => {
  const usuarioId = await requireUsuarioId();
  const db = getDB();
  const { results } = await db
    .prepare("SELECT * FROM despesas WHERE usuario_id = ? ORDER BY data DESC")
    .bind(usuarioId)
    .all<DespesaRow>();
  return results.map(toDespesa);
});

export const createDespesaFn = createServerFn({ method: "POST" })
  .validator((d: { input: Omit<Despesa, "id"> }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    const { input } = data;
    const parcelas = input.parcelas && input.parcelas > 1 ? input.parcelas : 1;
    const grupo = newId();
    const baseDate = new Date(input.data);
    const criadas: Despesa[] = [];

    const stmts = [];
    for (let i = 0; i < parcelas; i++) {
      const dt = new Date(baseDate);
      dt.setMonth(dt.getMonth() + i);
      const item: Despesa = {
        ...input,
        id: newId(),
        data: dt.toISOString().slice(0, 10),
        parcelas,
        parcelaAtual: i + 1,
        compraGrupoId: parcelas > 1 ? grupo : undefined,
      };
      criadas.push(item);
      stmts.push(
        db
          .prepare(
            "INSERT INTO despesas (id, usuario_id, descricao, valor, data, categoria_id, forma_pagamento, cartao_id, observacao, recorrencia, parcelas, parcela_atual, compra_grupo_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            item.id,
            usuarioId,
            item.descricao,
            item.valor,
            item.data,
            item.categoriaId,
            item.formaPagamento,
            item.cartaoId ?? null,
            item.observacao ?? null,
            item.recorrencia,
            item.parcelas ?? null,
            item.parcelaAtual ?? null,
            item.compraGrupoId ?? null,
          ),
      );
    }
    await db.batch(stmts);
    return criadas;
  });

export const updateDespesaFn = createServerFn({ method: "POST" })
  .validator((d: { id: ID; patch: Partial<Despesa> }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    const current = await db
      .prepare("SELECT * FROM despesas WHERE id = ? AND usuario_id = ?")
      .bind(data.id, usuarioId)
      .first<DespesaRow>();
    if (!current) return;
    const merged = { ...toDespesa(current), ...data.patch };
    await db
      .prepare(
        "UPDATE despesas SET descricao = ?, valor = ?, data = ?, categoria_id = ?, forma_pagamento = ?, cartao_id = ?, observacao = ?, recorrencia = ?, parcelas = ?, parcela_atual = ?, compra_grupo_id = ? WHERE id = ? AND usuario_id = ?",
      )
      .bind(
        merged.descricao,
        merged.valor,
        merged.data,
        merged.categoriaId,
        merged.formaPagamento,
        merged.cartaoId ?? null,
        merged.observacao ?? null,
        merged.recorrencia,
        merged.parcelas ?? null,
        merged.parcelaAtual ?? null,
        merged.compraGrupoId ?? null,
        data.id,
        usuarioId,
      )
      .run();
  });

export const deleteDespesaFn = createServerFn({ method: "POST" })
  .validator((d: { id: ID }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    await db.prepare("DELETE FROM despesas WHERE id = ? AND usuario_id = ?").bind(data.id, usuarioId).run();
  });

// ---------- Cartões ----------
export const listCartoesFn = createServerFn({ method: "GET" }).handler(async () => {
  const usuarioId = await requireUsuarioId();
  const db = getDB();
  const { results } = await db
    .prepare("SELECT * FROM cartoes WHERE usuario_id = ? ORDER BY nome")
    .bind(usuarioId)
    .all<CartaoRow>();
  return results.map(toCartao);
});

export const createCartaoFn = createServerFn({ method: "POST" })
  .validator((d: { input: Omit<Cartao, "id"> }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    const id = newId();
    const { input } = data;
    await db
      .prepare(
        "INSERT INTO cartoes (id, usuario_id, nome, bandeira, limite, dia_fechamento, dia_vencimento, cor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, usuarioId, input.nome, input.bandeira ?? null, input.limite, input.diaFechamento, input.diaVencimento, input.cor ?? null)
      .run();
    return { ...input, id } satisfies Cartao;
  });

export const updateCartaoFn = createServerFn({ method: "POST" })
  .validator((d: { id: ID; patch: Partial<Cartao> }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    const current = await db
      .prepare("SELECT * FROM cartoes WHERE id = ? AND usuario_id = ?")
      .bind(data.id, usuarioId)
      .first<CartaoRow>();
    if (!current) return;
    const merged = { ...toCartao(current), ...data.patch };
    await db
      .prepare(
        "UPDATE cartoes SET nome = ?, bandeira = ?, limite = ?, dia_fechamento = ?, dia_vencimento = ?, cor = ? WHERE id = ? AND usuario_id = ?",
      )
      .bind(merged.nome, merged.bandeira ?? null, merged.limite, merged.diaFechamento, merged.diaVencimento, merged.cor ?? null, data.id, usuarioId)
      .run();
  });

export const deleteCartaoFn = createServerFn({ method: "POST" })
  .validator((d: { id: ID }) => d)
  .handler(async ({ data }) => {
    const usuarioId = await requireUsuarioId();
    const db = getDB();
    await db.batch([
      db.prepare("DELETE FROM despesas WHERE cartao_id = ? AND usuario_id = ?").bind(data.id, usuarioId),
      db.prepare("DELETE FROM cartoes WHERE id = ? AND usuario_id = ?").bind(data.id, usuarioId),
    ]);
  });
