CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categorias (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  cor TEXT,
  padrao INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE cartoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  bandeira TEXT,
  limite REAL NOT NULL,
  dia_fechamento INTEGER NOT NULL,
  dia_vencimento INTEGER NOT NULL,
  cor TEXT
);

CREATE TABLE receitas (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  data TEXT NOT NULL,
  categoria_id TEXT NOT NULL REFERENCES categorias(id),
  observacao TEXT,
  recorrencia TEXT NOT NULL DEFAULT 'nenhuma'
);

CREATE TABLE despesas (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  data TEXT NOT NULL,
  categoria_id TEXT NOT NULL REFERENCES categorias(id),
  forma_pagamento TEXT NOT NULL,
  cartao_id TEXT REFERENCES cartoes(id),
  observacao TEXT,
  recorrencia TEXT NOT NULL DEFAULT 'nenhuma',
  parcelas INTEGER,
  parcela_atual INTEGER,
  compra_grupo_id TEXT
);

CREATE INDEX idx_receitas_usuario ON receitas(usuario_id);
CREATE INDEX idx_despesas_usuario ON despesas(usuario_id);
CREATE INDEX idx_categorias_usuario ON categorias(usuario_id);
CREATE INDEX idx_cartoes_usuario ON cartoes(usuario_id);