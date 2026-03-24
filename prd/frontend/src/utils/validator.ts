import type {
  FixDecisionHistory,
  FlowDoc,
  RulePack,
  RuleRuntimeSettings,
  ValidationMessage,
  ValidationResult,
} from "../models/types";
import {
  applySelectedFixes,
  defaultRuleSettings,
  enforceEdgePolicy,
  getRulePacks,
  loadFixDecisionHistory,
  loadRuleSettings,
  recordFixDecision,
  saveFixDecisionHistory,
  saveRuleSettings,
  validateByRules,
} from "./ruleEngine";

export interface ValidationRuntimeOptions {
  packs?: RulePack[];
  settings?: RuleRuntimeSettings;
  history?: FixDecisionHistory;
}

export function getDefaultRulePacks(): RulePack[] {
  return getRulePacks();
}

export function getDefaultRuleSettings(packs: RulePack[]): RuleRuntimeSettings {
  return defaultRuleSettings(packs);
}

export function readRuleSettings(packs: RulePack[]): RuleRuntimeSettings {
  return loadRuleSettings(packs);
}

export function persistRuleSettings(settings: RuleRuntimeSettings): void {
  saveRuleSettings(settings);
}

export function readFixDecisionHistory(): FixDecisionHistory {
  return loadFixDecisionHistory();
}

export function persistFixDecisionHistory(history: FixDecisionHistory): void {
  saveFixDecisionHistory(history);
}

export function updateFixDecisionHistory(
  history: FixDecisionHistory,
  ruleId: string,
  fixId: string,
  accepted: boolean
): FixDecisionHistory {
  return recordFixDecision(history, ruleId, fixId, accepted);
}

export function validateFlow(doc: FlowDoc, options: ValidationRuntimeOptions = {}): ValidationResult {
  const packs = options.packs ?? getRulePacks();
  const settings = options.settings ?? loadRuleSettings(packs);
  const history = options.history ?? loadFixDecisionHistory();
  return validateByRules(doc, packs, settings, history);
}

export function applyValidationFixes(
  doc: FlowDoc,
  messages: ValidationMessage[],
  selections: Array<{ messageId: string; fixId?: string }>
): FlowDoc {
  return applySelectedFixes(doc, messages, selections);
}

export { enforceEdgePolicy };

export function formatValidationMessages(messages: ValidationMessage[]): string[] {
  return messages.map((m) => {
    const prefix = m.type === "error" ? "❌" : m.type === "warning" ? "⚠️" : "💡";
    return `${prefix} ${m.message}`;
  });
}
