// LocalStorage-backed implementation of DataStore.
// All data is stored in the browser's localStorage as JSON.
// This can be replaced with a database-backed implementation later.

import type {
  AppData,
  Candidate,
  Employee,
  Contract,
  Transfer,
  Masters,
  MasterKey,
  MasterItem,
} from '../types';
import { validateContractPeriod, validateJobPositionHolidayCombo } from '../utils/employeeUtils';
import type { DataStore } from './DataStore';
import { createInitialData } from '../data/demoData';

const STORAGE_KEY = 'emp-mgr-demo-v1';

function migrateData(raw: AppData): AppData {
  // Ensure all masters exist (add new ones for older saved data without deleting existing items)
  const initial = createInitialData();
  for (const key of Object.keys(initial.masters) as MasterKey[]) {
    if (!raw.masters[key]) {
      raw.masters[key] = initial.masters[key];
    }
  }

  // Ensure all contracts have the new fields (fill with null/empty, never guess values)
  for (const c of raw.contracts) {
    if (c.holidayTypeCd === undefined) c.holidayTypeCd = null;
    if (c.holidayDetail === undefined) c.holidayDetail = '';
    if (c.contractJobPositionCd === undefined) c.contractJobPositionCd = null;
  }

  if (!raw.masters.contractJobPositions.some(m => m.cd === 'D')) raw.masters.contractJobPositions.push({ cd: 'D', name: 'D職（無期雇用）', active: true });
  raw.candidates ??= [];
  return raw;
}

function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      const migrated = migrateData(parsed);
      // If migration changed something, persist the updated data
      saveToStorage(migrated);
      return migrated;
    }
  } catch {
    // ignore parse errors and fall back to initial data
  }
  const data = createInitialData();
  saveToStorage(data);
  return data;
}

function saveToStorage(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId(): string {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export class LocalStorageStore implements DataStore {
  private data: AppData;

  constructor() {
    this.data = loadFromStorage();
  }

  private persist(): void {
    saveToStorage(this.data);
  }

  saveCandidate(candidate: Candidate): void {
    if (!candidate.name.trim() || !candidate.jobTitle.trim() || !candidate.applicationDate) throw new Error('氏名・応募職種・応募日を入力してください。');
    const now = new Date().toISOString();
    const candidates = this.data.candidates ?? [];
    const old = candidates.find(c => c.id === candidate.id);
    const saved = { ...candidate, id: old?.id ?? genId(), employeeId: old?.employeeId ?? null, createdAt: old?.createdAt ?? now, updatedAt: now };
    const next = { ...this.data, candidates: [...candidates.filter(c => c.id !== saved.id), saved] };
    saveToStorage(next);
    this.data = next;
  }

  convertCandidate(candidateId: string, employee: Employee): string {
    const candidate = this.data.candidates?.find(c => c.id === candidateId);
    if (!candidate) throw new Error('候補者が見つかりません。');
    if (candidate.employeeId) {
      if (!this.getEmployee(candidate.employeeId)) throw new Error('登録先の従業員は削除されています。管理者に確認してください。');
      return candidate.employeeId;
    }
    if (candidate.decision !== '採用') throw new Error('採用判定を確認してから登録してください。');
    if (candidate.status !== '内定承諾') throw new Error('内定承諾後に登録してください。');
    const number = employee.employeeNumber.trim();
    if (!number || !employee.name.trim() || !employee.kana.trim() || !employee.hireDate) throw new Error('社員番号・氏名・カナ・入社日を入力してください。');
    if (this.data.employees.some(e => e.employeeNumber === number)) throw new Error('社員番号が重複しています。');
    const saved = { ...employee, id: genId(), employeeNumber: number };
    const next = { ...this.data,
      employees: [...this.data.employees, saved],
      candidates: this.data.candidates!.map(c => c.id === candidateId ? { ...c, employeeId: saved.id, updatedAt: new Date().toISOString() } : c),
    };
    // One storage write: a quota/write failure cannot leave a partial conversion.
    saveToStorage(next);
    this.data = next;
    return saved.id;
  }

  getAll(): AppData {
    return this.data;
  }

  getEmployees(): Employee[] {
    return this.data.employees;
  }

  getEmployee(id: string): Employee | undefined {
    return this.data.employees.find((e) => e.id === id);
  }

  getContractsByEmployee(employeeId: string): Contract[] {
    return this.data.contracts
      .filter((c) => c.employeeId === employeeId)
      .sort((a, b) => a.applyStart.localeCompare(b.applyStart));
  }

  getTransfersByEmployee(employeeId: string): Transfer[] {
    return this.data.transfers
      .filter((t) => t.employeeId === employeeId)
      .sort((a, b) => a.transferDate.localeCompare(b.transferDate));
  }

  getMasters(): Masters {
    return this.data.masters;
  }

  saveEmployee(emp: Employee): void {
    if (!emp.id) {
      emp.id = genId();
      this.data.employees.push(emp);
    } else {
      const idx = this.data.employees.findIndex((e) => e.id === emp.id);
      if (idx >= 0) {
        this.data.employees[idx] = emp;
      } else {
        this.data.employees.push(emp);
      }
    }
    this.persist();
  }

  deleteEmployee(id: string): void {
    this.data.employees = this.data.employees.filter((e) => e.id !== id);
    this.data.contracts = this.data.contracts.filter((c) => c.employeeId !== id);
    this.data.transfers = this.data.transfers.filter((t) => t.employeeId !== id);
    this.persist();
  }

  renewContract(contract: Contract, previousId: string | null): void {
    if (!contract.applyStart || (contract.applyEnd && contract.applyEnd < contract.applyStart)) throw new Error('契約期間を確認してください。');
    if (![contract.hourlyRate, contract.allowance, contract.transportExpense].every(v => Number.isFinite(v) && v >= 0)) throw new Error('金額は0以上にしてください。');
    const combo = validateJobPositionHolidayCombo(contract.contractJobPositionCd, contract.holidayTypeCd);
    if (combo) throw new Error(combo);
    let contracts = this.data.contracts.map(c => ({ ...c }));
    if (previousId) {
      const prev = contracts.find(c => c.id === previousId && c.employeeId === contract.employeeId);
      if (!prev || prev.applyEnd || prev.applyStart >= contract.applyStart) throw new Error('元契約の期間が変更されています。再確認してください。');
      const date = new Date(contract.applyStart + 'T00:00:00Z');
      date.setUTCDate(date.getUTCDate() - 1);
      prev.applyEnd = date.toISOString().slice(0, 10);
    }
    const overlap = validateContractPeriod(contracts, contract, '');
    if (overlap) throw new Error(overlap);
    contracts = [...contracts, { ...contract, id: genId() }];
    const next = { ...this.data, contracts };
    saveToStorage(next);
    this.data = next;
  }

  saveContract(contract: Contract): void {
    if (!contract.id) {
      contract.id = genId();
      this.data.contracts.push(contract);
    } else {
      const idx = this.data.contracts.findIndex((c) => c.id === contract.id);
      if (idx >= 0) {
        this.data.contracts[idx] = contract;
      } else {
        this.data.contracts.push(contract);
      }
    }
    this.persist();
  }

  deleteContract(id: string): void {
    this.data.contracts = this.data.contracts.filter((c) => c.id !== id);
    this.persist();
  }

  saveTransfer(transfer: Transfer): void {
    if (!transfer.id) {
      transfer.id = genId();
      this.data.transfers.push(transfer);
    } else {
      const idx = this.data.transfers.findIndex((t) => t.id === transfer.id);
      if (idx >= 0) {
        this.data.transfers[idx] = transfer;
      } else {
        this.data.transfers.push(transfer);
      }
    }
    this.persist();
  }

  deleteTransfer(id: string): void {
    this.data.transfers = this.data.transfers.filter((t) => t.id !== id);
    this.persist();
  }

  saveMasterItem(key: MasterKey, item: MasterItem): void {
    const list = this.data.masters[key];
    const idx = list.findIndex((m) => m.cd === item.cd);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    this.persist();
  }

  deleteMasterItem(key: MasterKey, cd: string): void {
    this.data.masters[key] = this.data.masters[key].filter((m) => m.cd !== cd);
    this.persist();
  }

  resetToInitial(): void {
    this.data = createInitialData();
    this.persist();
  }
}
