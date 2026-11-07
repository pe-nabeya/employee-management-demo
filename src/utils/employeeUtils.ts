// Employee status and employment-period logic.

import type { Employee, Masters, Contract, Transfer } from '../types';

export type EmployeeStatus = 'active' | 'retired' | 'not_yet_hired';

/** Determines whether an employee is active, retired, or not yet hired on a given reference date. */
export function getStatus(emp: Employee, refDate: string): EmployeeStatus {
  // Not yet hired: hire date is after the reference date
  if (emp.hireDate > refDate) return 'not_yet_hired';
  // Retired: retire date is set and is before the reference date
  if (emp.retireDate && emp.retireDate < refDate) return 'retired';
  // Active: hire date is on or before ref, and (retire date is empty OR retire date is on or after ref)
  return 'active';
}

export function statusLabel(status: EmployeeStatus): string {
  switch (status) {
    case 'active':
      return '在籍';
    case 'retired':
      return '退職';
    case 'not_yet_hired':
      return '入社前';
  }
}

/** Finds the contract that is valid on a given reference date. Returns null if none. */
export function getContractOnDate(contracts: Contract[], refDate: string): Contract | null {
  const sorted = [...contracts].sort((a, b) => a.applyStart.localeCompare(b.applyStart));
  for (let i = sorted.length - 1; i >= 0; i--) {
    const c = sorted[i];
    const startOk = c.applyStart <= refDate;
    const endOk = !c.applyEnd || c.applyEnd >= refDate;
    if (startOk && endOk) return c;
  }
  return null;
}

/** Returns the department code an employee was in on a given date, based on transfers. */
export function getDeptOnDate(transfers: Transfer[], refDate: string): string | null {
  const sorted = [...transfers].sort((a, b) => a.transferDate.localeCompare(b.transferDate));
  let result: string | null = null;
  for (const t of sorted) {
    if (t.transferDate <= refDate) {
      result = t.toDeptCd;
    } else {
      break;
    }
  }
  return result;
}

/** Validates that retire date is not before hire date. Returns error message or null. */
export function validateRetireDate(hireDate: string, retireDate: string | null): string | null {
  if (retireDate && retireDate < hireDate) {
    return '退職日は入社日以降の日付を指定してください。';
  }
  return null;
}

/** Validates that employee number is unique. Returns error message or null. */
export function validateEmployeeNumber(
  empNumber: string,
  allEmployees: Employee[],
  excludeId?: string,
): string | null {
  if (!empNumber.trim()) return '社員番号を入力してください。';
  const dup = allEmployees.some(
    (e) => e.employeeNumber === empNumber.trim() && e.id !== excludeId,
  );
  if (dup) return 'この社員番号は既に使用されています。';
  return null;
}

/** Checks for overlapping contract periods for the same employee. Returns error message or null. */
export function validateContractPeriod(
  contracts: Contract[],
  newContract: Contract,
  excludeId?: string,
): string | null {
  const newStart = newContract.applyStart;
  const newEnd = newContract.applyEnd;
  for (const c of contracts) {
    if (c.employeeId !== newContract.employeeId) continue;
    if (excludeId && c.id === excludeId) continue;
    const cStart = c.applyStart;
    const cEnd = c.applyEnd;
    // Overlap: newStart <= cEnd (or cEnd null) AND cStart <= newEnd (or newEnd null)
    const startBeforeEnd = !cEnd || newStart <= cEnd;
    const cStartBeforeNewEnd = !newEnd || cStart <= newEnd;
    if (startBeforeEnd && cStartBeforeNewEnd) {
      return `契約期間が重複しています（${c.applyStart}〜${c.applyEnd ?? ''}）。`;
    }
  }
  return null;
}

/** Looks up a master item name by code. Returns empty string if not found. */
export function masterName(masters: Masters, key: keyof Masters, cd: string | null): string {
  if (!cd) return '';
  const list = masters[key] as { cd: string; name: string }[];
  const item = list.find((m) => m.cd === cd);
  return item ? item.name : '';
}

// ---- Holiday type default descriptions ----

export const HOLIDAY_DEFAULT_DETAILS: Record<string, string> = {
  '4W8': '4週間につき8日の休日とする',
  '4W16': '4週間につき16日の休日とする',
  'CAL': '土日祝日を休日とする',
};

// ---- Contract job position + holiday type combination rules ----

const ALLOWED_HOLIDAYS: Record<string, string[]> = {
  'D': ['4W8', '4W16', 'CAL'],
  'M': ['4W8', '4W16', 'CAL'],
  'H': ['4W8', '4W16', 'CAL'],
  'LD': ['4W8', 'CAL'],
  'SV': ['4W8', 'CAL'],
};

/** Returns true if the contract job position allows the given holiday type. */
export function isHolidayAllowed(jobPosCd: string | null, holidayTypeCd: string | null): boolean {
  if (!jobPosCd || !holidayTypeCd) return true;
  const allowed = ALLOWED_HOLIDAYS[jobPosCd];
  if (!allowed) return true;
  return allowed.includes(holidayTypeCd);
}

/** Validates the contract job position + holiday type combination. Returns error message or null. */
export function validateJobPositionHolidayCombo(
  jobPosCd: string | null,
  holidayTypeCd: string | null,
): string | null {
  if (!jobPosCd || !holidayTypeCd) return null;
  if (!isHolidayAllowed(jobPosCd, holidayTypeCd)) {
    const jobName: Record<string, string> = { 'M': 'M職', 'H': 'H職', 'LD': 'LD職', 'SV': 'SV職' };
    return `${jobName[jobPosCd] ?? jobPosCd}では4週16休を選択できません。`;
  }
  return null;
}
