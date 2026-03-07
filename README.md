# ざわり銀河

Three.js で作った、和風パチンコ宇宙を渡る破砕遊戯です。段位上昇と貫通破壊を軸にしつつ、視覚演出とモバイル操作性を両立する方針で作っています。

## 遊ぶ

https://diohabara.github.io/bokuzushi/

<!-- GENERATED_GAMEPLAY:start -->
## ゲームシステム

- **色の強さ**: 緑 < 青 < 黄 < 橙 < 赤 < 藍 < 紫 < 黒
- 銀珠の玉色が障り札より強いと貫通破壊し、同色以下では反射しながら割る。
- 障り札命中で段位が上がり、銀珠の玉色が昇格する。
- 攻撃力は `基礎 1 + 玉色ティア + floor((Lv - 1) / 2)` で上がる。
- 連続破壊で連なりが伸び、ざわりが溜まる。
- ざわりが 100 に達すると一定時間 `アガり` に入り、得点が 2 倍になる。
- アガり中は得点倍率と演出が強化されるが、可読性は維持する。
- 当たり星到達ボーナスは返し板反射回数が少ないほど高い。
- 巡目が深くなるほど当たり星は奥へ沈み、周辺障り札も割りにくくなる。
- モバイル対応端末では、アガり・覚醒・当たり星到達・飲まれた時に短い振動が入る。

## 銀河

| 銀河 | 障り札色範囲 |
|---|---|
| 桜花 | 緑〜青 |
| 炎祭 | 緑〜黄 |
| 紅葉 | 緑〜赤 |
| 氷雪 | 緑〜藍 |
| 黄金 | 緑〜紫 |

前の銀河を抜けると次が開く。
<!-- GENERATED_GAMEPLAY:end -->

## 実装方針

- ゲームロジックのコアは `src/gameRules.ts` に分離し、Vitest で検証します。
- README の生成ブロックはコード定義から更新し、CI で整合性を検証します。

## 仕様ドキュメント

- 詳細仕様は [`docs/game-spec.md`](docs/game-spec.md) にまとめています。
- 数式や状態遷移が変わるときは、README より先にこの仕様を更新します。

<!-- GENERATED_COMMANDS:start -->
## 開発コマンド

| コマンド | 説明 |
|---|---|
| `npm install` | 依存関係をインストール |
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | TypeScript ビルドと Vite ビルドを実行 |
| `npm run test` | Vitest をウォッチ実行 |
| `npm run test:run` | Vitest を一回実行 |
| `npm run docs:generate` | README の生成ブロックを更新 |
| `npm run docs:check` | README の生成ブロック差分を検査 |
| `npm run ci` | build / test / docs:check をまとめて実行 |

## 操作

- マウス / タッチ: 返し板移動
- PC では ← / →: 返し板移動
- クリック / タップ / Enter / Space: 発射・決定
- Escape: 小休止

## 自動ドキュメント更新

README の生成対象は `npm run docs:generate` で更新され、CI では `node --import tsx ./scripts/generate-readme.ts --check` を実行して更新漏れを検出する。
<!-- GENERATED_COMMANDS:end -->

## デプロイ

CI 成功後に GitHub Pages へ自動デプロイされます。
