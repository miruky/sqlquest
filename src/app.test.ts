// @vitest-environment happy-dom
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountApp } from './app';
import { QuestEngine } from './lib/engine';
import { questById, quests } from './lib/quests';
import { store } from './lib/storage';

const require = createRequire(import.meta.url);

let engine: QuestEngine;

beforeAll(async () => {
  const wasmBinary = fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'));
  engine = await QuestEngine.create({ wasmBinary });
});

function mount(): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app') as HTMLElement;
  mountApp(root, engine);
  return root;
}

function editorOf(root: HTMLElement): HTMLTextAreaElement {
  return root.querySelector('#editor') as HTMLTextAreaElement;
}

function clickAction(root: HTMLElement, action: string): void {
  (root.querySelector(`button[data-act="${action}"]`) as HTMLButtonElement).click();
}

beforeEach(() => {
  store.clear();
});

describe('mountApp', () => {
  it('全クエストが章ごとに一覧され、最初のクエストが開かれる', () => {
    const root = mount();
    expect(root.querySelectorAll('.quest-list button[data-id]').length).toBe(quests.length);
    expect(root.querySelector('.quest-title')?.textContent).toBe(quests[0]?.title);
    expect(root.querySelector('.progress-label')?.textContent).toBe(`クリア 0 / ${quests.length}`);
  });

  it('スキーマパネルに5つのテーブルが並ぶ', () => {
    const root = mount();
    const tables = [...root.querySelectorAll('.schema-list summary')].map((el) => el.textContent);
    expect(tables).toEqual(['shops', 'products', 'customers', 'orders', 'order_items']);
  });

  it('クエストを選ぶと内容が切り替わる', () => {
    const root = mount();
    const target = quests[4] as (typeof quests)[number];
    (root.querySelector(`.quest-list button[data-id="${target.id}"]`) as HTMLButtonElement).click();
    expect(root.querySelector('.quest-title')?.textContent).toBe(target.title);
    expect(root.querySelector('.stage-label')?.textContent).toBe(target.stage);
  });

  it('書きかけのSQLはクエストを行き来しても保持される', () => {
    const root = mount();
    const editor = editorOf(root);
    editor.value = 'SELECT 1;';
    editor.dispatchEvent(new Event('input'));
    const other = quests[1] as (typeof quests)[number];
    (root.querySelector(`.quest-list button[data-id="${other.id}"]`) as HTMLButtonElement).click();
    const first = quests[0] as (typeof quests)[number];
    (root.querySelector(`.quest-list button[data-id="${first.id}"]`) as HTMLButtonElement).click();
    expect(editorOf(root).value).toBe('SELECT 1;');
  });

  it('ヒントと模範解答を表示できる', () => {
    const root = mount();
    const hintBox = root.querySelector('.hint-box') as HTMLElement;
    expect(hintBox.hidden).toBe(true);
    clickAction(root, 'hint');
    expect(hintBox.textContent).toContain(quests[0]?.hint);
    clickAction(root, 'solution');
    expect(hintBox.textContent).toContain('模範解答');
  });
});

describe('クエストの前後移動とテーマ', () => {
  it('次へ/前へで一覧順に移動し、端では無効になる', () => {
    const root = mount();
    const prev = root.querySelector('button[data-act="prev"]') as HTMLButtonElement;
    const next = root.querySelector('button[data-act="next"]') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    next.click();
    expect(root.querySelector('.quest-title')?.textContent).toBe(quests[1]?.title);
    prev.click();
    expect(root.querySelector('.quest-title')?.textContent).toBe(quests[0]?.title);
  });

  it('最後のクエストでは次へが無効になる', () => {
    const root = mount();
    const last = quests[quests.length - 1] as (typeof quests)[number];
    (root.querySelector(`.quest-list button[data-id="${last.id}"]`) as HTMLButtonElement).click();
    expect((root.querySelector('button[data-act="next"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('合格すると結果に「次のクエストへ」が出る', () => {
    const root = mount();
    const first = quests[0] as (typeof quests)[number];
    editorOf(root).value = first.solution;
    clickAction(root, 'run');
    expect(root.querySelector('.verdict-next')).not.toBeNull();
  });

  it('テーマトグルは自動→ライト→ダークと巡回し、html要素へ反映する', () => {
    const root = mount();
    const toggle = root.querySelector('#theme-toggle') as HTMLButtonElement;
    expect(toggle.dataset.choice).toBe('system');
    toggle.click();
    expect(toggle.dataset.choice).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    toggle.click();
    expect(toggle.dataset.choice).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

describe('判定フロー', () => {
  it('模範解答を実行すると合格し、進捗が保存される', () => {
    const root = mount();
    const first = quests[0] as (typeof quests)[number];
    const editor = editorOf(root);
    editor.value = first.solution;
    editor.dispatchEvent(new Event('input'));
    clickAction(root, 'run');
    expect(root.querySelector('.verdict.pass')).not.toBeNull();
    expect(root.querySelector('.progress-label')?.textContent).toBe(`クリア 1 / ${quests.length}`);
    expect(JSON.parse(store.getItem('sqlquest:cleared') ?? '{}')).toHaveProperty(first.id);
  });

  it('間違ったクエリでは期待される結果との比較が表示される', () => {
    const root = mount();
    const quest = questById('name-and-price');
    if (!quest) throw new Error('クエストがない');
    (root.querySelector(`.quest-list button[data-id="${quest.id}"]`) as HTMLButtonElement).click();
    editorOf(root).value = 'SELECT name FROM products;';
    clickAction(root, 'run');
    expect(root.querySelector('.verdict.fail')).not.toBeNull();
    expect(root.querySelectorAll('.compare .result-table').length).toBe(2);
  });

  it('構文エラーはSQLエラーとして表示される', () => {
    const root = mount();
    editorOf(root).value = 'SELEC * FROM products;';
    clickAction(root, 'run');
    expect(root.querySelector('.verdict.error')).not.toBeNull();
  });

  it('進捗を消去できる', () => {
    store.setItem('sqlquest:cleared', JSON.stringify({ 'all-products': 'x' }));
    const root = mount();
    expect(root.querySelector('.progress-label')?.textContent).toBe(`クリア 1 / ${quests.length}`);
    clickAction(root, 'clear-progress');
    expect(root.querySelector('.progress-label')?.textContent).toBe(`クリア 0 / ${quests.length}`);
  });
});
