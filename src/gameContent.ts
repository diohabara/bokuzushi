export interface TierContent {
  key: string;
  label: string;
  hex: number;
}

export interface WorldContent {
  name: string;
  subtitle: string;
  emoji: string;
  docsRange: string;
  docsTheme: string;
}

export const TIER_CONTENT: TierContent[] = [
  { key: "green", label: "緑", hex: 0x33cc66 },
  { key: "blue", label: "青", hex: 0x3388ff },
  { key: "yellow", label: "黄", hex: 0xffcc00 },
  { key: "orange", label: "橙", hex: 0xff8822 },
  { key: "red", label: "赤", hex: 0xff3344 },
  { key: "indigo", label: "藍", hex: 0x4444cc },
  { key: "violet", label: "紫", hex: 0x9933cc },
];

export const BALL_FINAL_TIER = {
  key: "black",
  label: "黒",
  hex: 0x220033,
};

export const FEVER_STATE_COPY = {
  charge: "仕込み",
  hot: "ざわり",
  active: "沸騰",
} as const;

export const COMBO_LABEL_SUFFIX = "連ツキ!!";

export const FEVER_TRIGGER_COPY = [
  "沸騰街道!!",
  "脳汁開門!!",
  "当たりの川が来る!!",
];

export const COMBO_CELEBRATION_COPY = {
  atsu: [
    "ざわツキ!",
    "先バレの匂い!",
    "来る顔してる!",
  ],
  gekiatsu: [
    "脳が先に当たってる!!",
    "島がざわつく!!",
    "赤い気配が濃い!!",
  ],
  kakuhen: [
    "確変の口してる!!",
    "右打ちの匂い!!",
    "もう平場に戻れん!!",
  ],
  ooatari: [
    "脳汁決壊!!!",
    "当たりが居座った!!!",
    "もう止まらん!!!",
  ],
  choGekiatsu: [
    "島ごとこっち見てる!!!",
    "やめ時が逃げた!!!",
    "当たりの巣に入った!!!",
  ],
  fever: [
    "脳が先に祝ってる!!!",
    "今日は全部当たり顔!!!",
    "理性の保留が消えた!!!",
  ],
} as const;

export const WORLD_CONTENT: WorldContent[] = [
  {
    name: "桜花",
    subtitle: "はるのかぜ",
    emoji: "🌸",
    docsRange: "緑〜青",
    docsTheme: "春",
  },
  {
    name: "炎祭",
    subtitle: "なつのほのお",
    emoji: "🔥",
    docsRange: "緑〜黄",
    docsTheme: "夏",
  },
  {
    name: "紅葉",
    subtitle: "あきのにしき",
    emoji: "🍁",
    docsRange: "緑〜赤",
    docsTheme: "秋",
  },
  {
    name: "氷雪",
    subtitle: "ふゆのしずく",
    emoji: "❄️",
    docsRange: "緑〜藍",
    docsTheme: "冬",
  },
  {
    name: "黄金",
    subtitle: "きわみのみち",
    emoji: "👑",
    docsRange: "緑〜紫",
    docsTheme: "極",
  },
];

export const README_RULES = [
  "ボールの色がブロックより強いと貫通破壊し、同色以下では反射しながら削る。",
  "ブロック命中で段位が上がり、ボールの色が昇格する。",
  "攻撃力は `基礎 1 + 玉色ティア + floor((Lv - 1) / 2)` で上がる。",
  "連続破壊で連ツキが伸び、沸点ゲージが溜まる。",
  "沸点ゲージが 100 に達すると一定時間 `沸騰街道` に入り、得点が 2 倍になる。",
  "沸騰中は得点倍率と演出が強化されるが、可読性は維持する。",
  "星破壊ボーナスはパドル反射回数が少ないほど高い。",
  "ステージが進むほど星は奥へ下がり、周辺ブロックも壊しにくくなる。",
  "モバイル対応端末では、沸騰・覚醒・星破壊・ゲームオーバー時に短い振動が入る。",
];

export const CONTROL_HINTS = [
  "マウス / タッチ: パドル移動",
  "PC では ← / →: パドル移動",
  "クリック / タップ / Enter / Space: 発射・決定",
  "Escape: ポーズ切替",
];
