// ════════════════════════════════════════════════
//  Storage 介面層
//  ─────────────────────────────────────────────
//  整個 App 只透過這個介面讀寫資料。
//  目前（A 路線）：存在瀏覽器 localStorage。
//  未來升級到 B 路線（Supabase 雲端帳號）時，
//  只要改這一個檔案的內部實作，App 其他程式完全不用動。
//
//  介面與 Claude 環境的 window.storage 一致：
//    await storage.get(key)      → { key, value } | null
//    await storage.set(key, val) → { key, value }
//    await storage.delete(key)   → { key, deleted }
//    await storage.list(prefix)  → { keys }
// ════════════════════════════════════════════════

const NS = "hrpg:"; // 命名空間，避免和其他網站資料衝突

// localStorage 實作（A 路線）
const localImpl = {
  async get(key) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw === null ? null : { key, value: raw };
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(NS + key, value);
      return { key, value };
    } catch (e) {
      console.error("storage.set failed", e);
      return null;
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(NS + key);
      return { key, deleted: true };
    } catch {
      return { key, deleted: false };
    }
  },
  async list(prefix = "") {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(NS)) {
          const bare = k.slice(NS.length);
          if (bare.startsWith(prefix)) keys.push(bare);
        }
      }
      return { keys };
    } catch {
      return { keys: [] };
    }
  },
};

// ── 對外匯出 ──
// 目前指向 localImpl。未來升級時，改成回傳 supabaseImpl 即可。
export const storage = localImpl;

// ────────────────────────────────────────────────
//  未來升級 B 路線時的範例（現在註解著，屆時再啟用）：
//
//  import { createClient } from "@supabase/supabase-js";
//  const sb = createClient(URL, ANON_KEY);
//  let userId = null; // 登入後取得
//
//  const supabaseImpl = {
//    async get(key) {
//      const { data } = await sb.from("kv")
//        .select("value").eq("user_id", userId).eq("key", key).single();
//      return data ? { key, value: data.value } : null;
//    },
//    async set(key, value) {
//      await sb.from("kv").upsert({ user_id: userId, key, value });
//      return { key, value };
//    },
//    async delete(key) {
//      await sb.from("kv").delete().eq("user_id", userId).eq("key", key);
//      return { key, deleted: true };
//    },
//    async list(prefix = "") {
//      const { data } = await sb.from("kv")
//        .select("key").eq("user_id", userId).like("key", prefix + "%");
//      return { keys: (data || []).map(r => r.key) };
//    },
//  };
//
//  // 一次性把本機舊資料搬到雲端（登入後呼叫一次）：
//  export async function migrateLocalToCloud() {
//    const { keys } = await localImpl.list("");
//    for (const k of keys) {
//      const r = await localImpl.get(k);
//      if (r) await supabaseImpl.set(k, r.value);
//    }
//  }
// ────────────────────────────────────────────────
