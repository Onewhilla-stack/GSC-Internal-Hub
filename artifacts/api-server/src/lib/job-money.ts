// Core money math for logging a cleaning visit. Wages are a flat daily cost per
// person on the team, independent of how many services the visit covered, so a
// multi-service visit is charged exactly the same wages as a single-service one.
// Net income is simply the visit total minus those wages.

// Default daily wage per team member (KES) when no rate is configured in settings.
export const DEFAULT_WAGE_PER_PERSON_PER_DAY = 1000;

// Resolve the configured wage rate from a settings row's stored string value,
// falling back to the default when unset or unparseable. Amounts are stored as
// numeric strings, so this mirrors how the route reads the setting.
export function resolveWageRate(settingValue: string | null | undefined): number {
  if (settingValue == null) return DEFAULT_WAGE_PER_PERSON_PER_DAY;
  const parsed = parseFloat(settingValue);
  return Number.isNaN(parsed) ? DEFAULT_WAGE_PER_PERSON_PER_DAY : parsed;
}

// Wages = teamMembers × wageRate. Charged once per visit regardless of how many
// services/line items the visit includes.
export function calculateWages(teamMembers: number, wageRate: number): number {
  return teamMembers * wageRate;
}

// Net income = visit total − wages.
export function calculateNetIncome(amount: number, wages: number): number {
  return amount - wages;
}

// Compute both wages and net income for a visit in one step.
export function computeJobMoney(input: {
  teamMembers: number;
  wageRate: number;
  amount: number;
}): { wages: number; netIncome: number } {
  const wages = calculateWages(input.teamMembers, input.wageRate);
  return { wages, netIncome: calculateNetIncome(input.amount, wages) };
}
