import { getDb } from "./database";

export function getMeta(key: string): string | null {
  const row = getDb()
    .prepare(`SELECT value FROM app_meta WHERE key = ?`)
    .get(key) as { value: string } | undefined;

  return row?.value ?? null;
}

export function setMeta(key: string, value: string) {
  getDb()
    .prepare(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
}

export function deleteMeta(key: string) {
  getDb().prepare(`DELETE FROM app_meta WHERE key = ?`).run(key);
}
