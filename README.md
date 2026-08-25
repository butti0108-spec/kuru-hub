# クルハブ（kuru-hub）

増渕さん専用の方針・TODO・メモハブ。**スマホにインストール可能なWebアプリ（PWA）**。

## URL

- トップ: https://butti0108-spec.github.io/kuru-hub/
- **各ページは別URL**（例）
  - メンター確認: https://butti0108-spec.github.io/kuru-hub/p/mentor-coconala/
  - 出店計画: https://butti0108-spec.github.io/kuru-hub/p/coconala-plan/
  - スパム対策: https://butti0108-spec.github.io/kuru-hub/p/antispam/
  - 運用ボード: https://butti0108-spec.github.io/kuru-hub/p/board/

スラッグ一覧は `manifest.json` の `slug`。ページ実体は `p/<slug>/index.html`（クルが追加時に生成）。

※公開リポでは URL を知られれば他のページも見える。秘密の隔離には使えない。共有のしやすさ用。

## スマホへの入れ方

| 端末 | 手順 |
|------|------|
| **Android（Chrome）** | サイトを開く → メニュー → 「アプリをインストール」または「ホーム画面に追加」。出ていれば画面内の「ホーム画面に追加」 |
| **iPhone（Safari）** | サイトを開く → 共有ボタン → 「ホーム画面に追加」 |

※ iPhoneは Chrome より **Safari** で追加する。

## 普段の使い方（トークン不要）

1. **表示／編集**
2. **端末に保存** … このデバイス内に残す
3. **書き出し** … ファイル保存 → Googleドライブへアップロード（正本は更新が新しい方）
4. **取り込み** … Driveから落としたファイルを開く

GitHubトークンは任意（リポへ直接書くときだけ）。

## 正本の考え方

- Drive上で **更新日時が新しいファイル** を正とする
- チャット履歴になくても、ファイルを読めば続きできる

## ファイル

| パス | 内容 |
|------|------|
| `docs/運用ボード.md` | TODO・優先 |
| `docs/確定/` | 固まった方針 |
| `docs/進行中/` | 仮の案 |
| `docs/inbox.md` | 他AI・メモの貼り付け |
| `manifest.json` | 左メニュー一覧 |
| `app.webmanifest` / `sw.js` | インストール用 |
