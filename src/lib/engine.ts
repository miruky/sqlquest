// sql.js(SQLite WASM)の薄いラッパー。実行のたびに使い捨てのDBへ
// データセットを流し込むため、破壊的なクエリを書いても状態は持ち越されない。

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { DATASET_SQL } from './dataset';

export interface QueryResult {
  columns: string[];
  values: unknown[][];
}

export interface EngineOptions {
  // ブラウザではwasmのURL解決、Nodeのテストではバイナリ直渡しを使う
  locateFile?: (file: string) => string;
  wasmBinary?: ArrayBuffer | Uint8Array;
}

export class QuestEngine {
  private constructor(private readonly sqlJs: SqlJsStatic) {}

  static async create(options: EngineOptions = {}): Promise<QuestEngine> {
    const sqlJs = await initSqlJs(options as Parameters<typeof initSqlJs>[0]);
    return new QuestEngine(sqlJs);
  }

  // 複数文を実行し、結果セットの配列を返す(SELECT以外は結果を持たない)
  run(sql: string): QueryResult[] {
    const db = new this.sqlJs.Database();
    try {
      db.run(DATASET_SQL);
      const results = db.exec(sql);
      return results.map((result) => ({
        columns: result.columns,
        values: result.values as unknown[][],
      }));
    } finally {
      db.close();
    }
  }

  tableNames(): string[] {
    const result = this.run(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;`);
    return (result[0]?.values ?? []).map((row) => String(row[0]));
  }

  tableColumns(table: string): string[] {
    if (!/^[a-z_]+$/.test(table)) throw new Error(`不正なテーブル名: ${table}`);
    const result = this.run(`PRAGMA table_info(${table});`);
    return (result[0]?.values ?? []).map((row) => String(row[1]));
  }

  sampleRows(table: string, limit = 5): QueryResult | null {
    if (!/^[a-z_]+$/.test(table)) throw new Error(`不正なテーブル名: ${table}`);
    return this.run(`SELECT * FROM ${table} LIMIT ${limit};`)[0] ?? null;
  }
}
