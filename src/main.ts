import './style.css';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { mountApp } from './app';
import { QuestEngine } from './lib/engine';

const app = document.getElementById('app');
if (app) {
  app.innerHTML = '<p class="boot">データベースを準備しています…</p>';
  QuestEngine.create({ locateFile: () => wasmUrl })
    .then((engine) => mountApp(app, engine))
    .catch((error: unknown) => {
      app.replaceChildren();
      const message = document.createElement('p');
      message.className = 'boot';
      message.textContent = `読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`;
      app.append(message);
    });
}
