import type { Factor, FactorGroup, ScoreResult } from "@/lib/types";
import { round1 } from "@/lib/format";

export function factor(
  group: FactorGroup,
  key: string,
  label: string,
  donorValue: string,
  recipientValue: string,
  rule: string,
  points: number,
  max: number,
): Factor {
  return {
    group,
    key,
    label,
    donorValue,
    recipientValue,
    rule,
    points: round1(points),
    max,
  };
}

export function tally(factors: Factor[]): ScoreResult["subtotals"] & { score: number } {
  const sum = (group: FactorGroup) =>
    round1(factors.filter((item) => item.group === group).reduce((total, item) => total + item.points, 0));
  const compatibility = sum("compatibility");
  const survival = sum("survival");
  const logistics = sum("logistics");
  return {
    compatibility,
    survival,
    logistics,
    score: round1(compatibility + survival + logistics),
  };
}

export function blockedResult(reasons: string[], urgencyLabel = ""): ScoreResult {
  return {
    eligible: false,
    reasons,
    score: 0,
    subtotals: { compatibility: 0, survival: 0, logistics: 0 },
    factors: [],
    steering: null,
    urgencyPoints: 0,
    daysWaiting: 0,
    clusterRank: 0,
    qualityIndex: 0,
    urgencyLabel,
  };
}
