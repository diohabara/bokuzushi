import {
  BALL_MAX_TIER,
  COMBO_ATSU,
  COMBO_CHO_GEKIATSU,
  COMBO_FEVER,
  COMBO_GEKIATSU,
  COMBO_KAKUHEN,
  COMBO_OOATARI,
  HITS_BASE,
  HITS_GROWTH,
} from "./constants";

export type PowerRelation = "stronger" | "equal" | "weaker";
export type CelebrationTier = "minor" | "major" | "jackpot";
export type BounceAxis = "x" | "y";

export interface ProgressionState {
  level: number;
  hitCount: number;
  nextLevelHits: number;
  ballColorIndex: number;
  combo: number;
  comboTimer: number;
  feverGauge: number;
  feverActive: boolean;
  feverTimer: number;
}

export interface BlockResolution {
  relation: PowerRelation;
  damage: number;
  shouldBounce: boolean;
  destroysImmediately: boolean;
  scoreOnDestroy: number;
  feverGain: number;
}

export interface ProgressionResult {
  state: ProgressionState;
  leveledUp: number[];
  feverTriggered: boolean;
}

export interface RankingEntry {
  score: number;
  world: string;
  date: string;
}

export const COMBO_TIMEOUT = 2;
export const FEVER_MAX = 100;
export const FEVER_DURATION = 8;
export const FEVER_MULTIPLIER = 2;

export function getAttackPower(level: number, ballColorIndex: number): number {
  return 1 + ballColorIndex + Math.floor((level - 1) / 2);
}

export function getBounceAxis(input: {
  prevX: number;
  prevY: number;
  nextX: number;
  nextY: number;
  blockX: number;
  blockY: number;
  halfWidth: number;
  halfHeight: number;
  radius: number;
}): BounceAxis {
  const dx = input.nextX - input.prevX;
  const dy = input.nextY - input.prevY;
  const expandedLeft = input.blockX - input.halfWidth - input.radius;
  const expandedRight = input.blockX + input.halfWidth + input.radius;
  const expandedTop = input.blockY + input.halfHeight + input.radius;
  const expandedBottom = input.blockY - input.halfHeight - input.radius;

  const xEntry = dx > 0
    ? (expandedLeft - input.prevX) / dx
    : dx < 0
      ? (expandedRight - input.prevX) / dx
      : Number.NEGATIVE_INFINITY;
  const xExit = dx > 0
    ? (expandedRight - input.prevX) / dx
    : dx < 0
      ? (expandedLeft - input.prevX) / dx
      : Number.POSITIVE_INFINITY;

  const yEntry = dy > 0
    ? (expandedBottom - input.prevY) / dy
    : dy < 0
      ? (expandedTop - input.prevY) / dy
      : Number.NEGATIVE_INFINITY;
  const yExit = dy > 0
    ? (expandedTop - input.prevY) / dy
    : dy < 0
      ? (expandedBottom - input.prevY) / dy
      : Number.POSITIVE_INFINITY;

  const entryTime = Math.max(xEntry, yEntry);
  const exitTime = Math.min(xExit, yExit);
  if (entryTime <= exitTime && entryTime >= 0 && entryTime <= 1) {
    return xEntry > yEntry ? "x" : "y";
  }

  const penetrationX = Math.min(
    Math.abs(input.nextX - (input.blockX - input.halfWidth)),
    Math.abs(input.nextX - (input.blockX + input.halfWidth))
  );
  const penetrationY = Math.min(
    Math.abs(input.nextY - (input.blockY - input.halfHeight)),
    Math.abs(input.nextY - (input.blockY + input.halfHeight))
  );
  return penetrationX <= penetrationY ? "x" : "y";
}

export function createProgressionState(): ProgressionState {
  return {
    level: 1,
    hitCount: 0,
    nextLevelHits: HITS_BASE,
    ballColorIndex: 0,
    combo: 0,
    comboTimer: 0,
    feverGauge: 0,
    feverActive: false,
    feverTimer: 0,
  };
}

export function comparePower(ballColorIndex: number, blockColorIndex: number): PowerRelation {
  if (ballColorIndex > blockColorIndex) return "stronger";
  if (ballColorIndex === blockColorIndex) return "equal";
  return "weaker";
}

export function resolveBlockHit(input: {
  level: number;
  ballColorIndex: number;
  blockColorIndex: number;
  blockMaxHp: number;
  indestructible: boolean;
}): BlockResolution {
  const relation = comparePower(input.ballColorIndex, input.blockColorIndex);

  if (!input.indestructible && relation === "stronger") {
    return {
      relation,
      damage: input.blockMaxHp,
      shouldBounce: false,
      destroysImmediately: true,
      scoreOnDestroy: input.blockMaxHp * 10,
      feverGain: 18,
    };
  }

  const damage = getAttackPower(input.level, input.ballColorIndex);
  return {
    relation,
    damage,
    shouldBounce: true,
    destroysImmediately: false,
    scoreOnDestroy: input.blockMaxHp * 10,
    feverGain: relation === "equal" ? 10 : 7,
  };
}

export function applyBlockHit(state: ProgressionState): ProgressionResult {
  const next: ProgressionState = {
    ...state,
    hitCount: state.hitCount + 1,
  };
  const leveledUp: number[] = [];

  while (next.hitCount >= next.nextLevelHits && next.ballColorIndex < BALL_MAX_TIER) {
    next.hitCount -= next.nextLevelHits;
    next.level += 1;
    next.nextLevelHits = HITS_BASE + (next.level - 1) * HITS_GROWTH;
    next.ballColorIndex = Math.min(next.ballColorIndex + 1, BALL_MAX_TIER);
    leveledUp.push(next.level);
  }

  return {
    state: next,
    leveledUp,
    feverTriggered: false,
  };
}

export function applyBonusHits(state: ProgressionState, count: number): ProgressionResult {
  let next = state;
  const leveledUp: number[] = [];

  for (let i = 0; i < count; i++) {
    const result = applyBlockHit(next);
    next = result.state;
    leveledUp.push(...result.leveledUp);
  }

  return {
    state: next,
    leveledUp,
    feverTriggered: false,
  };
}

export function incrementCombo(state: ProgressionState): ProgressionState {
  return {
    ...state,
    combo: state.combo + 1,
    comboTimer: COMBO_TIMEOUT,
  };
}

export function tickTimers(state: ProgressionState, dt: number): ProgressionState {
  const next = { ...state };

  if (next.comboTimer > 0) {
    next.comboTimer = Math.max(0, next.comboTimer - dt);
    if (next.comboTimer === 0) next.combo = 0;
  }

  if (next.feverActive) {
    next.feverTimer = Math.max(0, next.feverTimer - dt);
    if (next.feverTimer === 0) {
      next.feverActive = false;
      next.feverGauge = 0;
    }
  }

  return next;
}

export function chargeFever(state: ProgressionState, amount: number): ProgressionResult {
  const next = { ...state };
  if (next.feverActive) {
    next.feverGauge = FEVER_MAX;
    return { state: next, leveledUp: [], feverTriggered: false };
  }

  next.feverGauge = Math.min(FEVER_MAX, next.feverGauge + amount);
  const feverTriggered = next.feverGauge >= FEVER_MAX;
  if (feverTriggered) {
    next.feverActive = true;
    next.feverTimer = FEVER_DURATION;
    next.feverGauge = FEVER_MAX;
  }

  return {
    state: next,
    leveledUp: [],
    feverTriggered,
  };
}

export function getComboCelebrationTier(combo: number): CelebrationTier | null {
  if (combo >= COMBO_FEVER) return "jackpot";
  if (combo >= COMBO_OOATARI) return "jackpot";
  if (combo >= COMBO_CHO_GEKIATSU) return "jackpot";
  if (combo >= COMBO_KAKUHEN) return "major";
  if (combo >= COMBO_GEKIATSU) return "major";
  if (combo >= COMBO_ATSU) return "minor";
  return null;
}

export function mergeRanking(
  current: RankingEntry[],
  entry: RankingEntry,
  limit = 10
): RankingEntry[] {
  return [...current, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getScoreMultiplier(state: ProgressionState): number {
  return state.feverActive ? FEVER_MULTIPLIER : 1;
}
