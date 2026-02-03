import { TABLE_NOTES } from './lib/dataset';
import type { QueryResult, QuestEngine } from './lib/engine';
import { judgeQuest } from './lib/judge';
import { questById, quests, stages, type Quest } from './lib/quests';
import { store } from './lib/storage';
import {
  THEME_STORAGE_KEY,
  choiceLabel,
  nextChoice,
  parseChoice,
  resolveTheme,
  type ThemeChoice,
} from './lib/theme';

const PROGRESS_KEY = 'sqlquest:cleared';
const DRAFT_PREFIX = 'sqlquest:draft:';
const MAX_DISPLAY_ROWS = 20;

function loadProgress(): Record<string, string> {
  try {
    const raw = store.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

const LOGO = `
<svg viewBox="0 0 64 64" aria-hidden="true" class="brand-logo">
  <ellipse cx="28" cy="16" rx="20" ry="8" class="logo-disk"/>
  <path d="M8 16 V44 a20 8 0 0 0 40 0 V16" fill="none" class="logo-body"/>
  <path d="M8 30 a20 8 0 0 0 40 0" fill="none" class="logo-body"/>
  <path d="M50 8 V30" class="logo-pole"/>
  <path d="M50 8 L62 12 L50 17 Z" class="logo-flag"/>
</svg>
`;

const THEME_ICON =
  '<svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor"/></svg>';

/** テーマ(自動 / ライト / ダーク)の切替。選択は保存し、自動時はOSに追従する。 */
function setupTheme(root: HTMLElement): void {
  const btn = root.querySelector('#theme-toggle') as HTMLButtonElement | null;
  const labelEl = root.querySelector('#theme-label') as HTMLElement | null;
  if (!btn || !labelEl) return;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let choice: ThemeChoice = parseChoice(store.getItem(THEME_STORAGE_KEY));
  const apply = (): void => {
    document.documentElement.dataset.theme = resolveTheme(choice, media.matches);
    labelEl.textContent = choiceLabel(choice);
    btn.dataset.choice = choice;
    btn.setAttribute('aria-label', `テーマ: ${choiceLabel(choice)}。クリックで切り替え`);
  };
  btn.addEventListener('click', () => {
    choice = nextChoice(choice);
    store.setItem(THEME_STORAGE_KEY, choice);
    apply();
  });
  media.addEventListener('change', () => {
    if (choice === 'system') apply();
  });
  apply();
}

function renderTable(result: QueryResult, caption: string): HTMLElement {
  const wrapper = document.createElement('figure');
  wrapper.className = 'result-table';
  const captionEl = document.createElement('figcaption');
  captionEl.textContent = `${caption}(${result.values.length}行)`;
  wrapper.append(captionEl);
  const scroller = document.createElement('div');
  scroller.className = 'table-scroller';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const column of result.columns) {
    const th = document.createElement('th');
    th.textContent = column;
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);
  const tbody = document.createElement('tbody');
  for (const row of result.values.slice(0, MAX_DISPLAY_ROWS)) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement('td');
      td.textContent = cell === null ? 'NULL' : String(cell);
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  scroller.append(table);
  wrapper.append(scroller);
  if (result.values.length > MAX_DISPLAY_ROWS) {
    const note = document.createElement('p');
    note.className = 'table-note';
    note.textContent = `ほか ${result.values.length - MAX_DISPLAY_ROWS} 行は省略`;
    wrapper.append(note);
  }
  return wrapper;
}

export function mountApp(root: HTMLElement, engine: QuestEngine): void {
  let progress = loadProgress();
  let current: Quest = quests[0] as Quest;

  root.innerHTML = `
    <div class="shell">
      <header class="masthead">
        ${LOGO}
        <div class="masthead-text">
          <p class="kicker">SQL Quest</p>
          <h1>sqlquest</h1>
          <p class="lede">ブラウザ内のSQLiteに本物のクエリを書いて、商店街のデータから答えを探す</p>
        </div>
        <div class="masthead-aside">
          <button type="button" id="theme-toggle" class="theme-toggle">
            ${THEME_ICON}<span id="theme-label" class="theme-label">自動</span>
          </button>
          <div class="progress" role="status">
            <span class="progress-label"></span>
            <div class="progress-track" role="presentation"><div class="progress-fill"></div></div>
          </div>
        </div>
      </header>
      <div class="layout">
        <nav class="quest-list" aria-label="クエスト一覧"></nav>
        <main class="quest-pane">
          <p class="stage-label"></p>
          <header class="quest-head">
            <h2 class="quest-title"></h2>
            <div class="quest-nav">
              <button type="button" class="nav-btn" data-act="prev" aria-label="前のクエスト">‹</button>
              <button type="button" class="nav-btn" data-act="next" aria-label="次のクエスト">›</button>
            </div>
          </header>
          <p class="quest-question"></p>
          <section class="editor-card">
            <label class="editor-label" for="editor">SQL</label>
            <textarea id="editor" spellcheck="false" autocomplete="off" rows="6"></textarea>
            <div class="editor-actions">
              <button type="button" class="primary" data-act="run">実行して判定</button>
              <button type="button" data-act="reset">リセット</button>
              <button type="button" data-act="hint">ヒント</button>
              <button type="button" data-act="solution">模範解答</button>
              <span class="editor-shortcut">Ctrl+Enterでも実行できます</span>
            </div>
          </section>
          <div class="hint-box" hidden></div>
          <section class="result" aria-live="polite"></section>
        </main>
        <aside class="schema-pane" aria-label="テーブル一覧">
          <h3>テーブル</h3>
          <div class="schema-list"></div>
        </aside>
      </div>
      <footer class="footnote">
        <a href="https://github.com/miruky/sqlquest">GitHub</a>
        <button type="button" class="linklike" data-act="clear-progress">進捗を消去</button>
      </footer>
    </div>
  `;

  const listEl = root.querySelector('.quest-list') as HTMLElement;
  const stageEl = root.querySelector('.stage-label') as HTMLElement;
  const titleEl = root.querySelector('.quest-title') as HTMLElement;
  const questionEl = root.querySelector('.quest-question') as HTMLElement;
  const editor = root.querySelector('#editor') as HTMLTextAreaElement;
  const hintBox = root.querySelector('.hint-box') as HTMLElement;
  const resultEl = root.querySelector('.result') as HTMLElement;
  const schemaList = root.querySelector('.schema-list') as HTMLElement;
  const progressLabel = root.querySelector('.progress-label') as HTMLElement;
  const progressFill = root.querySelector('.progress-fill') as HTMLElement;
  const prevButton = root.querySelector('button[data-act="prev"]') as HTMLButtonElement;
  const nextButton = root.querySelector('button[data-act="next"]') as HTMLButtonElement;

  function renderProgress(): void {
    const cleared = quests.filter((quest) => progress[quest.id]).length;
    progressLabel.textContent = `クリア ${cleared} / ${quests.length}`;
    progressFill.style.width = `${(cleared / quests.length) * 100}%`;
  }

  function renderList(): void {
    listEl.replaceChildren(
      ...stages.map((stage) => {
        const group = document.createElement('section');
        const heading = document.createElement('h2');
        heading.textContent = stage;
        group.append(heading);
        const list = document.createElement('ul');
        for (const quest of quests.filter((q) => q.stage === stage)) {
          const item = document.createElement('li');
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.id = quest.id;
          if (quest.id === current.id) button.setAttribute('aria-current', 'true');
          const name = document.createElement('span');
          name.className = 'item-title';
          name.textContent = quest.title;
          button.append(name);
          if (progress[quest.id]) {
            button.classList.add('cleared');
            const mark = document.createElement('span');
            mark.className = 'item-mark';
            mark.setAttribute('aria-label', 'クリア済み');
            mark.innerHTML =
              '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            button.append(mark);
          }
          item.append(button);
          list.append(item);
        }
        group.append(list);
        return group;
      }),
    );
  }

  function renderSchema(): void {
    schemaList.replaceChildren(
      ...TABLE_NOTES.map(({ name, note }) => {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = name;
        details.append(summary);
        const noteEl = document.createElement('p');
        noteEl.className = 'schema-note';
        noteEl.textContent = note;
        details.append(noteEl);
        const columns = document.createElement('p');
        columns.className = 'schema-columns';
        columns.textContent = engine.tableColumns(name).join(' / ');
        details.append(columns);
        const sample = engine.sampleRows(name, 5);
        if (sample) details.append(renderTable(sample, '先頭5行'));
        return details;
      }),
    );
  }

  function select(quest: Quest): void {
    current = quest;
    stageEl.textContent = quest.stage;
    titleEl.textContent = quest.title;
    questionEl.textContent = quest.question;
    editor.value = store.getItem(DRAFT_PREFIX + quest.id) ?? '';
    hintBox.hidden = true;
    resultEl.replaceChildren();
    const index = quests.indexOf(quest);
    prevButton.disabled = index <= 0;
    nextButton.disabled = index >= quests.length - 1;
    renderList();
  }

  // 一覧の並び順で前後のクエストへ移動する
  function navigate(offset: number): void {
    const next = quests[quests.indexOf(current) + offset];
    if (next) select(next);
  }

  function run(): void {
    const verdict = judgeQuest(engine, current, editor.value);
    resultEl.replaceChildren();
    const panel = document.createElement('div');
    if (verdict.status === 'error') {
      panel.className = 'verdict error';
      const title = document.createElement('p');
      title.className = 'verdict-title';
      title.textContent = 'SQLエラー';
      const message = document.createElement('p');
      message.className = 'verdict-message';
      message.textContent = verdict.message;
      panel.append(title, message);
    } else if (verdict.status === 'fail') {
      panel.className = 'verdict fail';
      const title = document.createElement('p');
      title.className = 'verdict-title';
      title.textContent = `不合格: ${verdict.reason}`;
      panel.append(title);
      const compare = document.createElement('div');
      compare.className = 'compare';
      if (verdict.result) compare.append(renderTable(verdict.result, 'あなたの結果'));
      compare.append(renderTable(verdict.expected, '期待される結果'));
      panel.append(compare);
    } else {
      panel.className = 'verdict pass';
      const title = document.createElement('p');
      title.className = 'verdict-title';
      title.textContent = `クエスト達成(${verdict.elapsedMs}msで実行)`;
      panel.append(title, renderTable(verdict.result, 'あなたの結果'));
      if (!progress[current.id]) {
        progress[current.id] = new Date().toISOString();
        store.setItem(PROGRESS_KEY, JSON.stringify(progress));
        renderProgress();
        renderList();
      }
      if (quests.indexOf(current) < quests.length - 1) {
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'verdict-next';
        next.dataset.act = 'next';
        next.textContent = '次のクエストへ';
        panel.append(next);
      }
    }
    resultEl.append(panel);
  }

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const listButton = target.closest('.quest-list button[data-id]');
    if (listButton) {
      const next = questById((listButton as HTMLElement).dataset.id ?? '');
      if (next) select(next);
      return;
    }
    const action = (target.closest('button[data-act]') as HTMLElement | null)?.dataset.act;
    if (!action) return;
    if (action === 'run') run();
    if (action === 'prev') navigate(-1);
    if (action === 'next') navigate(1);
    if (action === 'reset') {
      store.removeItem(DRAFT_PREFIX + current.id);
      editor.value = '';
      resultEl.replaceChildren();
      hintBox.hidden = true;
    }
    if (action === 'hint') {
      hintBox.hidden = !hintBox.hidden;
      if (!hintBox.hidden) {
        hintBox.replaceChildren();
        const label = document.createElement('p');
        label.className = 'hint-label';
        label.textContent = 'ヒント';
        const body = document.createElement('p');
        body.textContent = current.hint;
        hintBox.append(label, body);
      }
    }
    if (action === 'solution') {
      hintBox.hidden = false;
      hintBox.replaceChildren();
      const label = document.createElement('p');
      label.className = 'hint-label';
      label.textContent = '模範解答';
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = current.solution;
      pre.append(code);
      hintBox.append(label, pre);
    }
    if (action === 'clear-progress') {
      progress = {};
      store.setItem(PROGRESS_KEY, JSON.stringify(progress));
      renderProgress();
      renderList();
    }
  });

  editor.addEventListener('input', () => {
    store.setItem(DRAFT_PREFIX + current.id, editor.value);
  });
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      run();
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = `${editor.value.slice(0, start)}  ${editor.value.slice(end)}`;
      editor.selectionStart = start + 2;
      editor.selectionEnd = start + 2;
    }
  });

  setupTheme(root);
  renderProgress();
  renderSchema();
  select(current);
}
