# クルハブ（kuru-hub）

増渕さん専用の、方針・TODO・貼り付け箱を **見やすく編集する簡易Webアプリ**。

## URL（GitHub Pages 有効後）

https://butti0108-spec.github.io/kuru-hub/

## 使い方

1. 左でファイルを選ぶ → **表示**
2. **編集** で Markdown を直す
3. 外からリポに書くときだけ **設定** で GitHub トークン（repo）をこの端末に保存 → **GitHubに保存**
4. トークンなしでも閲覧可。編集は GitHub サイト上でも可（右上の GitHub リンク）

## 正本の場所

| パス | 内容 |
|------|------|
| `docs/運用ボード.md` | TODO・優先 |
| `docs/確定/` | 固まった方針 |
| `docs/進行中/` | 仮の案 |
| `docs/inbox.md` | 他AIの相談やメモの貼り付け |
| `manifest.json` | 左メニューの一覧（ファイルを足したらここも更新） |

## Pages の出し方（初回）

リポ → Settings → Pages → Branch: `main` / folder: `/ (root)` → Save

## ポートフォリオ側との関係

同じ内容のコピーがポートフォリオの `docs/` にもある場合がある。  
**日常の更新はこちらの kuru-hub を正**にし、必要ならポートフォリオ側へ同期する。
