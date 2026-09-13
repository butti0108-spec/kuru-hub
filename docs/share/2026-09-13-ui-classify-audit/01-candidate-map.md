# UI分類・候補対応表メモ（メーカーUI）

- **日付**: 2026-09-13（状態欄を監査反映で更新）
- **性質**: **実装用メモ／候補一覧**。辞書の正式定義ではない。
- **正本**: `docs/進行中/2026-09-13-UI分類辞書-Ver0.1.md`
- **所在メモ**: `docs/進行中/2026-09-13-UI分類-全画面棚卸し.md`
- **適用範囲**:
  - **A. メーカーUI** … 本メモの対象
  - **B. 生成ホームページ（左プレビュー本文）** … **対象外**

## 状態の意味（監査反映）

| 状態 | 意味 |
|---|---|
| **確定** | 辞書上の当てはめが監査で固まっている（まだ稀） |
| **仮** | いまの当てはめ案。大きな迷いなし。正式命名・意味割り当て待ち |
| **所属保留** | Content / Interaction / System（や Hierarchy）の**所属自体**が未定 |
| **名称保留** | 所属はほぼ決まっているが、**表示名／内部名・呼び方**が未定 |
| **対象外** | 生成HPなど、本辞書Aの外 |
| **未分類** | 表にまだ載せきれていない／要棚卸し |

※旧「保留」「要名称変更」は上記へ振り分けた。

---

## 候補対応表

| 現クラス（消さない） | 辞書候補（第一／下位） | 状態 | メモ |
|---|---|---|---|
| `.dash-title` | Content / H1 | 仮 | 画面タイトル |
| `.entry-gate-title` | Content / H1 | 仮 | 入口フル画面タイトル |
| `.detail-notice-title` | Content / H1 | 仮 | モーダル見出し |
| `.hub-place-section-title` | Content / H2 | 仮 | できること画面の場所名 |
| `.hub-task-where-title` | Content / H2 | 仮 | 「どこを？」 |
| `.dash-subhead` | Content / H2 | 仮 | 問い・区切り見出し |
| `.fill-block legend` / `fieldset legend` | Content / H3 | 仮 | 項目名 |
| `label`（入力横の文言） | Content / H3 | 仮 | フィールド名 |
| `.easy-field` 内の項目名 | Content / H3 | 仮 | 基本情報ラベル |
| `.hub-entry-card-title` | Content / H3 | 仮 | カード内タイトル。親UIは Selection Card |
| `.entry-gate-lead` | Content / H4 または System | 所属保留 | リードか案内か |
| `.hub-entry-card-note` | Content / H4 | 仮 | カード補足 |
| `.mode-option-note` | Content / H4 | 仮 | モード説明 |
| `.dash-note` | Content / H4 または System | 所属保留 | 補足と状態案内が混在しうる |
| `.count-row-hint` | Content / H4 | 仮 | ±説明 |
| `.char-count` | Content / H4 または System | 所属保留 | 読む補足か状態表示か |
| `.step-help` | Content / H4 または System | 所属保留 | 画面内手順。ヘルプ集約方針と緊張 |
| `.wizard-coach` | System | 名称保留 | 所属は System。表示名・クラス名見直し予定 |
| `.wizard-progress` | System | 仮 | 進捗文言 |
| `.wizard-status` | System | 仮 | ステータス一行 |
| `.dash-resume-notice` | System | 仮 | 再開時注意 |
| `.easy-img-status` | System | 仮 | 「まだ選んでいません」 |
| `.entry-howto-note` | Content / H4 または System | 所属保留 | 入口注記 |
| `.entry-hero-text-note` | Content / H4 または System | 所属保留 | キャッチ文字の入口注記 |
| `.detail-notice-text` | System | 仮 | モーダル本文（次の案内） |
| `.gct-btn-primary` | Interaction / Button / 本線 | 仮 | これにします・写真を選ぶ・確定系 |
| `.gct-btn`（primaryなし） | Interaction / Button / 補助 | 仮 | 戻る・前へ・ストック・別の5案 |
| `.wizard-btn` / `#wizard-next` 本線時 | Interaction / Button / 本線 | 仮 | 確定／これでOK |
| `#wizard-back` | Interaction / Button / 補助 | 仮 | 戻る |
| `.entry-gate-apply` | Interaction / Button / 本線 | 仮 | OK・並び替えへ |
| `.entry-step-back` | Interaction / Button / 補助 または 弱操作 | 所属保留 | ← ひとつ戻る。段の所属が未定 |
| `.chrome-help-btn` | Interaction / Button / 弱操作 | 仮 | ヘルプ |
| `.dash-reset-btn` | Interaction / Button / 補助 | 名称保留 | 破壊寄り。Destructive段は未採用のため名称・扱い保留 |
| `.step-cross-link` | Interaction / Button / 弱操作 | 仮 | 「色へ：…」 |
| `.hub-nav-row .gct-btn-primary` | Interaction / Button / 本線 | 仮 | この場所はこれでOK |
| `.hub-entry-card` | Interaction / Selection Card | 仮 | 場所から／やりたいこと／レイアウト |
| `.entry-branch-card` | Interaction / Selection Card | 仮 | サンプルから選ぶ／自分で作る |
| `.entry-choice` | Interaction / Selection Card または Toggle | 所属保留 | 用途・色合い。カードほど大きくない |
| `.mode-option` | Interaction / Selection Card または Toggle | 所属保留 | 簡単／こだわり |
| `.item-grow-tab` | Interaction / Toggle | 仮 | 横幅いっぱい／半分 |
| `.gct-btn[data-hero-text-on]` 等 | Interaction / Toggle | 仮 | 載せる／載せない、下地形・色 |
| `.font-picker-toggle` | Interaction / Toggle（開示） | 仮 | 書体アコーディオン |
| `.font-card` | Interaction / Selection Card または Toggle | 所属保留 | 書体択一 |
| `.ui-disclosure-chevron` / summary::after ▼ | Interaction / Icon Button | 仮 | 開閉示唆 |
| `.count-row button`（±） | Interaction / Icon Button | 仮 | 共通操作部品 |
| `.atelier-tab` | Interaction / Toggle | 仮 | サンプル画面／注文画面 |
| toast／一時メッセージ（JS生成） | System | 未分類 | クラス名が画面ごと |
| 左プレビュー `.preview-site` 内テキスト | — | 対象外 | 生成HP |

---

## まだ載せきれていないもの

- ハニカム色UI・レイアウト行・ドラッグヒント
- help.html 内の見出し／本文
- ZIP／finish 周りの長い説明ブロック
- バッジ・ゾーン番号

---

## 次工程

1. 所属保留・名称保留を監査で減らす（意味割り当て・正式命名）
2. 確定するまで **クラス名・CSS・px は変更しない**
3. 棚卸し結果で本表を更新
