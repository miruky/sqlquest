import fs from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import { QuestEngine } from './engine';

const require = createRequire(import.meta.url);

let engine: QuestEngine;

beforeAll(async () => {
  const wasmBinary = fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'));
  engine = await QuestEngine.create({ wasmBinary });
});

describe('QuestEngine', () => {
  it('5つのテーブルがそろっている', () => {
    expect(engine.tableNames()).toEqual([
      'customers',
      'order_items',
      'orders',
      'products',
      'shops',
    ]);
  });

  it('データセットの行数が想定どおり', () => {
    const count = (table: string): number => {
      const result = engine.run(`SELECT COUNT(*) FROM ${table};`);
      return Number(result[0]?.values[0]?.[0]);
    };
    expect(count('shops')).toBe(6);
    expect(count('products')).toBe(18);
    expect(count('customers')).toBe(10);
    expect(count('orders')).toBe(24);
    expect(count('order_items')).toBe(40);
  });

  it('外部キーの参照先がすべて存在する', () => {
    const orphans = engine.run(`
      SELECT COUNT(*) FROM products WHERE shop_id NOT IN (SELECT id FROM shops);
      SELECT COUNT(*) FROM orders WHERE customer_id NOT IN (SELECT id FROM customers);
      SELECT COUNT(*) FROM order_items WHERE product_id NOT IN (SELECT id FROM products);
      SELECT COUNT(*) FROM order_items WHERE order_id NOT IN (SELECT id FROM orders);
    `);
    for (const result of orphans) {
      expect(result.values[0]?.[0]).toBe(0);
    }
  });

  it('破壊的なクエリを実行しても次の実行に影響しない', () => {
    engine.run(`DROP TABLE products;`);
    const result = engine.run(`SELECT COUNT(*) FROM products;`);
    expect(result[0]?.values[0]?.[0]).toBe(18);
  });

  it('テーブルの列とサンプル行を取得できる', () => {
    expect(engine.tableColumns('products')).toEqual(['id', 'shop_id', 'name', 'price', 'stock']);
    const sample = engine.sampleRows('shops', 3);
    expect(sample?.values.length).toBe(3);
    expect(() => engine.tableColumns('products; DROP TABLE shops')).toThrow();
  });

  it('構文エラーは例外として伝わる', () => {
    expect(() => engine.run('SELEC * FROM products;')).toThrow();
  });
});
