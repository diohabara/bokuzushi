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

export const DISPLAY_TITLE = "ざわり銀河";

const LAYER_LABELS = ["1巡目", "2巡目", "3巡目"] as const;

export function formatLayerLabel(layer: number): string {
  return LAYER_LABELS[layer - 1] ?? `第${layer}巡目`;
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
  charge: "気配",
  hot: "ざわり",
  active: "アガり",
} as const;

const COMBO_COPY_NORMAL = [
  "ざわり!!",
  "脈アリ!!",
  "保留育ち!!",
  "手が熱い!!",
  "寄り目きた!!",
  "鳴きっぱなし!!",
  "まだ飲める!!",
] as const;

const COMBO_COPY_HOT = [
  "右打ちの顔!!",
  "当たりの癖!!",
  "先バレ本番!!",
  "銀河がざわつく!!",
] as const;

const COMBO_COPY_MAJOR = [
  "当たりが居座る!!",
  "引き返せん!!",
  "脳汁巡航!!",
  "席が立てん!!",
] as const;

const COMBO_COPY_JACKPOT = [
  "銀河ごと前のめり!!!",
  "やめ時が溶けた!!!",
  "理性の保留切れ!!!",
  "もう閉店までこれ!!!",
] as const;

function pickComboCopy(count: number, bank: readonly string[], start: number): string {
  return bank[(count - start) % bank.length] ?? bank[0];
}

export function getComboLabelCopy(count: number): string {
  if (count >= 16) return `${count}連 ${pickComboCopy(count, COMBO_COPY_JACKPOT, 16)}`;
  if (count >= 10) return `${count}連 ${pickComboCopy(count, COMBO_COPY_MAJOR, 10)}`;
  if (count >= 6) return `${count}連 ${pickComboCopy(count, COMBO_COPY_HOT, 6)}`;
  return `${count}連 ${pickComboCopy(count, COMBO_COPY_NORMAL, 1)}`;
}

export const FEVER_TRIGGER_COPY = [
  "アガり突入!!",
  "ざわり満ちた!!",
  "当たりの川が来る!!",
];

export const STAR_DESTROYED_HEADLINES = [
  "天才!",
  "神業!",
  "銀河級",
  "巧打!",
  "撃破!",
] as const;

export const STAR_DESTROYED_PRAISE_COPY = [
  "すごい",
  "エグすぎぃ!",
  "うますぎる",
  "才能が雑に強い",
  "星の方が謝ってる",
  "プレイが綺麗すぎる",
  "判断が王者",
  "手つきが本物",
  "宇宙が拍手してる",
  "その一打、反則級",
  "褒め語彙が足りない",
  "もう全部うまい",
  "今の通し方えらい",
  "星側が油断してた",
  "狙いがまっすぐ強い",
  "落ち着きが玄人",
  "手が答えを知ってる",
  "視線がもう当たり",
  "その返し、品がある",
  "星読みが深い",
  "通し筋が見えてる",
  "配球がうますぎる",
  "無駄が一個もない",
  "打ち筋が気持ちいい",
  "もう勝ち方の顔",
  "狙い撃ちが正確",
  "間合いの取り方が良い",
  "反射の使い方が上手い",
  "今の一手で空気変わった",
  "星が逃げ切れない",
  "仕事がきっちり強い",
  "その判断、だいぶ鋭い",
  "返しが静かに強い",
  "組み立てが上手い",
  "角度の読みが本物",
  "取り方がずるい",
  "今の一発で流れ来た",
  "もう盤面が味方",
  "手元が落ち着きすぎ",
  "崩し方が鮮やか",
  "当て感が深い",
  "星線を掴んでる",
  "見えてる人の打ち方",
  "今の返球かなり良い",
  "手際が気持ちよすぎる",
  "攻め筋がきれい",
  "そのコース偉すぎる",
  "ちゃんと刺してくる",
  "一手一手が重い",
  "取り切る気配がある",
  "流れの拾い方が上手い",
  "星の急所を知ってる",
  "触り方がうまい",
  "打点が賢い",
  "勝ち筋が太い",
  "狙いの置き方が良い",
  "強気がちゃんと当たる",
  "今の角度、解答編",
  "見切りが早い",
  "返し板と会話してる",
  "もう星が震えてる",
  "その処理かなり上等",
  "読みと実行が一致してる",
  "通し方に無理がない",
  "今の、かなり好き",
  "綺麗に仕留めた",
  "盤面理解がえぐい",
  "詰め方が上級者",
  "抜き方がいやらしく上手い",
  "今ので決まった感ある",
  "もう狙い筋が見えてる",
  "この一打、拍手",
  "仕事人の手つき",
  "うますぎて言葉が遅い",
  "星側の想定を超えてる",
] as const;

export const BLACK_TIER_TRIGGER_COPY = [
  "黒玉きた!!",
  "銀河が黒む!!",
  "真打ちの色!!",
] as const;

export const COMBO_CELEBRATION_COPY = {
  atsu: [
    "ざわツキ!",
    "先バレの匂い!",
    "来る顔してる!",
  ],
  gekiatsu: [
    "脳が先に当たってる!!",
    "銀河がざわつく!!",
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
    "銀河ごとこっち見てる!!!",
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
    subtitle: "おうどう",
    emoji: "👑",
    docsRange: "緑〜紫",
    docsTheme: "極",
  },
];

export const README_RULES = [
  "銀珠の玉色が障り札より強いと貫通破壊し、同色以下では反射しながら割る。",
  "障り札命中で段位が上がり、銀珠の玉色が昇格する。",
  "攻撃力は `基礎 1 + 玉色ティア + floor((Lv - 1) / 2)` で上がる。",
  "連続破壊で連なりが伸び、ざわりが溜まる。",
  "ざわりが 100 に達すると一定時間 `アガり` に入り、得点が 2 倍になる。",
  "アガり中は得点倍率と演出が強化されるが、可読性は維持する。",
  "当たり星到達ボーナスは返し板反射回数が少ないほど高い。",
  "巡目が深くなるほど当たり星は奥へ沈み、周辺障り札も割りにくくなる。",
  "モバイル対応端末では、アガり・覚醒・当たり星到達・飲まれた時に短い振動が入る。",
];

export const CONTROL_HINTS = [
  "マウス / タッチ: 返し板移動",
  "PC では ← / →: 返し板移動",
  "クリック / タップ / Enter / Space: 発射・決定",
  "Escape: 小休止",
];
