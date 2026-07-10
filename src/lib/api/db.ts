import { getRequest } from "@tanstack/react-start/server";

/**
 * Cloudflare bindings declared in wrangler.jsonc.
 * Add new bindings here as they're added to wrangler.jsonc.
 */
export interface CloudflareEnv {
  DB: D1Database;
}

type RequestWithRuntime = Request & {
  runtime?: { cloudflare?: { env?: CloudflareEnv } };
};

/**
 * Resolves the live Cloudflare bindings for the current request.
 *
 * Nitro's `cloudflare-module` preset exposes bindings two ways — both are
 * read here for resilience across Nitro versions:
 *  1. Attached to the inbound Request as `request.runtime.cloudflare.env`
 *     (see nitro/dist/presets/cloudflare/runtime/_module-handler.mjs)
 *  2. Mirrored onto `globalThis.__env__` for the lifetime of the request.
 */
export function getCloudflareEnv(): CloudflareEnv {
  const req = getRequest() as RequestWithRuntime;
  const fromRequest = req?.runtime?.cloudflare?.env;
  const fromGlobal = (globalThis as unknown as { __env__?: CloudflareEnv }).__env__;
  const env = fromRequest ?? fromGlobal;

  if (!env?.DB) {
    throw new Error(
      "Binding D1 'DB' não encontrado neste ambiente. Confirme se o wrangler.jsonc declara " +
        "o d1_databases com binding \"DB\" e se o deploy foi feito via `wrangler deploy` " +
        "(bindings não existem em builds locais fora do Workers runtime).",
    );
  }
  return env;
}

export function getDB(): D1Database {
  return getCloudflareEnv().DB;
}

/** SHA-256 hex digest, using the Web Crypto API available in the Workers runtime. */
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function newId(): string {
  return crypto.randomUUID();
}
