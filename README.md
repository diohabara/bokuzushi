# BOKUZUSHI - 星砕き

Three.js で作った、段位上昇と貫通破壊を軸にしたブロック崩しゲームです。視覚演出を強めつつ、モバイル操作性も維持する方針で作っています。

## 遊ぶ

https://diohabara.github.io/bokuzushi/

<!-- GENERATED_GAMEPLAY:start -->
## ゲームシステム

- **色の強さ**: 緑 < 青 < 黄 < 橙 < 赤 < 藍 < 紫 < 黒
- ボールの色がブロックより強いと貫通破壊し、同色以下では反射しながら削る。
- ブロック命中で段位が上がり、ボールの色が昇格する。
- 攻撃力は `基礎 1 + 玉色ティア + floor((Lv - 1) / 2)` で上がる。
- 連続破壊で COMBO が伸び、Fever Gauge が溜まる。
- Fever Gauge が 100 に達すると一定時間 `FEVER RUSH` になり、得点が 2 倍になる。
- Fever 中は得点倍率と演出が強化されるが、可読性は維持する。
- 星破壊ボーナスはパドル反射回数が少ないほど高い。
- ステージが進むほど星は奥へ下がり、周辺ブロックも壊しにくくなる。
- モバイル対応端末では、FEVER・覚醒・星破壊・ゲームオーバー時に短い振動が入る。

## ワールド

| ワールド | テーマ | ブロック色範囲 |
|---|---|---|
| 桜花 | 春 | 緑〜青 |
| 炎祭 | 夏 | 緑〜黄 |
| 紅葉 | 秋 | 緑〜赤 |
| 氷雪 | 冬 | 緑〜藍 |
| 黄金 | 極 | 緑〜紫 |

前のワールドを制覇すると次が解放される。
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
| `npm run test:run` | Vitest を一回実行 |
| `npm run docs:generate` | README の生成ブロックを更新 |
| `npm run ci` | build / test / docs:check をまとめて実行 |

## 操作

- マウス / タッチ: パドル移動
- PC では ← / →: パドル移動
- クリック / タップ / Enter / Space: 発射・決定
- Escape: ポーズ切替

## 自動ドキュメント更新

README の生成対象は `npm run docs:generate` で更新され、CI では `tsx scripts/generate-readme.ts --check` を実行して更新漏れを検出する。
<!-- GENERATED_COMMANDS:end -->

## デプロイ

CI 成功後に GitHub Pages へ自動デプロイされます。
