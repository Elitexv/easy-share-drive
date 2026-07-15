import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Mode = "view" | "download";

interface Input {
  token: string;
  password?: string | null;
  mode: Mode;
}

function serverPublishableClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export interface ShareResolution {
  status: "ok" | "not_found" | "expired" | "password_required" | "password_invalid" | "forbidden";
  file_name?: string;
  file_size?: number;
  mime_type?: string | null;
  permission?: "view" | "download";
  expires_at?: string | null;
  owner_name?: string | null;
  requires_password?: boolean;
  signed_url?: string | null;
}

/**
 * Server-side resolver for share links. Enforces expiration, optional password,
 * and permission (view vs download) before minting a short-lived signed URL.
 * Never returns storage_path to the client.
 */
export const accessShare = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): Input => {
    const d = data as Partial<Input>;
    if (!d || typeof d.token !== "string" || !d.token) {
      throw new Error("token required");
    }
    const mode: Mode = d.mode === "download" ? "download" : "view";
    const password =
      typeof d.password === "string" && d.password.length > 0 ? d.password : null;
    return { token: d.token, password, mode };
  })
  .handler(async ({ data }): Promise<ShareResolution> => {
    const pub = serverPublishableClient();
    const { data: rows, error } = await pub.rpc("resolve_share", {
      _token: data.token,
      _password: data.password ?? "",
    });
    if (error) return { status: "not_found" };
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { status: "not_found" };

    const base = {
      file_name: row.file_name ?? undefined,
      file_size: row.file_size ? Number(row.file_size) : undefined,
      mime_type: row.mime_type,
      permission: (row.permission as "view" | "download") ?? undefined,
      expires_at: row.expires_at ?? null,
      owner_name: row.owner_name ?? null,
      requires_password: !!row.requires_password,
    };

    if (row.status !== "ok" || !row.storage_path) {
      return {
        ...base,
        status: row.status as ShareResolution["status"],
        signed_url: null,
      };
    }

    // Enforce permission at the server boundary.
    if (data.mode === "download" && row.permission !== "download") {
      return { ...base, status: "forbidden", signed_url: null };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ttl = data.mode === "download" ? 60 : 600;
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("files")
      .createSignedUrl(
        row.storage_path,
        ttl,
        data.mode === "download" ? { download: row.file_name ?? "download" } : undefined,
      );
    if (signErr || !signed) {
      return { ...base, status: "not_found", signed_url: null };
    }

    // Best-effort view counter.
    await pub.rpc("increment_share_view", { _token: data.token });

    return { ...base, status: "ok", signed_url: signed.signedUrl };
  });
