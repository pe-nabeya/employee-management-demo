// Data store layer — abstracted so it can later be swapped to a database backend.
// This interface defines the contract any data source must implement.

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

export interface DataStore {
  getAll(): AppData;
  saveCandidate(candidate: Candidate): void;
  convertCandidate(candidateId: string, employee: Employee): string;
  getEmployees(): Employee[];
  getEmployee(id: string): Employee | undefined;
  getContractsByEmployee(employeeId: string): Contract[];
  getTransfersByEmployee(employeeId: string): Transfer[];
  getMasters(): Masters;
  saveEmployee(emp: Employee): void;
  deleteEmployee(id: string): void;
  saveContract(contract: Contract): void;
  renewContract(contract: Contract, previousId: string | null): void;
  deleteContract(id: string): void;
  saveTransfer(transfer: Transfer): void;
  deleteTransfer(id: string): void;
  saveMasterItem(key: MasterKey, item: MasterItem): void;
  deleteMasterItem(key: MasterKey, cd: string): void;
  resetToInitial(): void;
}
