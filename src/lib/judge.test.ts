import fs from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import { QuestEngine } from './engine';
import { compareResults, judgeQuest } from './judge';
import { questById, quests } from './quests';

const require = createRequire(import.meta.url);

let engine: QuestEngine;

beforeAll(async () => {
  const wasmBinary = fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'));
  engine = await QuestEngine.create({ wasmBinary });
});

describe('compareResults', () => {
  const result = (values: unknown[][]): { columns: string[]; values: unknown[][] } => ({
    columns: values[0]?.map((_, i) => `c${i}`) ?? [],
    values,
  });

  it('値が同じなら列名が違っても一致', () => {
    const a = { columns: ['x'], values: [[1], [2]] };
    const b = { columns: ['y'], values: [[1], [2]] };
    expect(compareResults(a, b, true)).toBeNull();
  });

  it('列数の不一致を報告する', () => {
    expect(compareResults(result([[1]]), result([[1, 2]]), false)).toContain('列の数');
  });

  it('行数の不一致を報告する', () => {
    expect(compareResults(result([[1]]), result([[1], [2]]), false)).toContain('行数');
  });

  it('順不同モードでは並びが違っても一致', () => {
    expect(compareResults(result([[2], [1]]), result([[1], [2]]), false)).toBeNull();
  });

  it('順序ありモードでは並びの違いを報告する', () => {
    expect(compareResults(result([[2], [1]]), result([[1], [2]]), true)).toContain('並び順');
  });

  it('浮動小数の表現ゆれは同一視する', () => {
    expect(compareResults(result([[513.3333333333333]]), result([[513.333333]]), true)).toBeNull();
  });

  it('数値と文字列は区別する', () => {
    expect(compareResults(result([['1']]), result([[1]]), true)).not.toBeNull();
  });
});

describe('judgeQuest', () => {
  it('空のSQLはエラーになる', () => {
    const quest = quests[0];
    if (!quest) throw new Error('クエストがない');
    expect(judgeQuest(engine, quest, '  ').status).toBe('error');
  });

  it('構文エラーはメッセージつきのerrorになる', () => {
    const quest = quests[0];
    if (!quest) throw new Error('クエストがない');
    const verdict = judgeQuest(engine, quest, 'SELEC * FROM products;');
    expect(verdict.status).toBe('error');
    if (verdict.status === 'error') expect(verdict.message.length).toBeGreaterThan(0);
  });

  it('SELECT以外だけではfailになる', () => {
    const quest = quests[0];
    if (!quest) throw new Error('クエストがない');
    const verdict = judgeQuest(engine, quest, 'CREATE TABLE t (a INTEGER);');
    expect(verdict.status).toBe('fail');
  });

  it('列の過不足はfailになる', () => {
    const quest = questById('name-and-price');
    if (!quest) throw new Error('クエストがない');
    const verdict = judgeQuest(engine, quest, 'SELECT name FROM products;');
    expect(verdict.status).toBe('fail');
    if (verdict.status === 'fail') expect(verdict.reason).toContain('列の数');
  });

  it('別解も値が一致すれば合格になる', () => {
    const quest = questById('never-ordered');
    if (!quest) throw new Error('クエストがない');
    const alternative = `SELECT products.name
FROM products
LEFT JOIN order_items ON order_items.product_id = products.id
WHERE order_items.product_id IS NULL;`;
    expect(judgeQuest(engine, quest, alternative).status).toBe('pass');
  });

  it('売り切れ捜索の答えは抹茶もなか1件', () => {
    const quest = questById('sold-out');
    if (!quest) throw new Error('クエストがない');
    const verdict = judgeQuest(engine, quest, quest.solution);
    expect(verdict.status).toBe('pass');
    if (verdict.status === 'pass') {
      expect(verdict.result.values).toEqual([['抹茶もなか']]);
    }
  });

  it('売上トップ3は金額の降順で一意に決まる', () => {
    const quest = questById('top3-sales');
    if (!quest) throw new Error('クエストがない');
    const verdict = judgeQuest(engine, quest, quest.solution);
    expect(verdict.status).toBe('pass');
    if (verdict.status === 'pass') {
      const sales = verdict.result.values.map((row) => Number(row[1]));
      expect(sales).toEqual([3360, 3300, 3080]);
    }
  });
});

describe.each(quests.map((quest) => [quest.id, quest] as const))('クエスト %s', (_id, quest) => {
  it('模範解答は合格する', () => {
    const verdict = judgeQuest(engine, quest, quest.solution);
    expect(verdict.status).toBe('pass');
  });

  it('模範解答は1行以上の結果を返す', () => {
    const result = engine.run(quest.solution).at(-1);
    expect(result).toBeDefined();
    expect(result?.values.length).toBeGreaterThan(0);
  });

  it('的外れなクエリでは合格しない', () => {
    const verdict = judgeQuest(engine, quest, `SELECT founded_year FROM shops;`);
    expect(verdict.status).not.toBe('pass');
  });
});

describe('出題データの整合性', () => {
  it('idは一意で全フィールドが埋まっている', () => {
    const ids = quests.map((quest) => quest.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const quest of quests) {
      expect(quest.id).toMatch(/^[a-z0-9-]+$/);
      expect(quest.stage).toMatch(/^第\d章/);
      expect(quest.title.length).toBeGreaterThan(0);
      expect(quest.question.length).toBeGreaterThan(0);
      expect(quest.hint.length).toBeGreaterThan(0);
      expect(quest.solution).toMatch(/SELECT/i);
    }
  });

  it('並び順を採点する問題にはORDER BYが含まれる', () => {
    for (const quest of quests.filter((q) => q.ordered)) {
      expect(quest.solution).toMatch(/ORDER BY/i);
    }
  });
});
