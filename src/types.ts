// Entity type definitions for the employee management app.

export interface MasterItem {
  cd: string;
  name: string;
  active: boolean;
}

export interface Employee {
  guarantorName?: string;
  guarantorRelationship?: string;
  guarantorPhone?: string;
  guarantorPostalCode?: string;
  guarantorAddress?: string;
  guarantorBuilding?: string;
  guarantorDocumentType?: string;
  guarantorReceivedDate?: string;
  email?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  building?: string;

  birthDate?: string;
  gender?: string;
  id: string;
  employeeNumber: string;
  name: string;
  kana: string;
  hireDate: string;
  retireDate: string | null;
  retireReasonCd: string | null;
  internalPositionCd: string | null;
  billingPositionCd: string | null;
  roleCd: string | null;
  departmentCd: string | null;
  dispatchCompanyCd: string | null;
  memo: string;
}

export interface Contract {
  id: string;
  employeeId: string;
  applyStart: string;
  applyEnd: string | null;
  hourlyRate: number;
  allowance: number;
  allowanceDesc: string;
  contractTypeCd: string | null;
  contractDetail: string;
  contractMemo: string;
  transportExpense: number;
  transportUnit: string;
  transportMethod: string;
  holidayTypeCd: string | null;
  holidayDetail: string;
  contractJobPositionCd: string | null;
}

export interface Transfer {
  id: string;
  employeeId: string;
  transferDate: string;
  fromDeptCd: string | null;
  toDeptCd: string | null;
  memo: string;
}

export interface Masters {
  internalPositions: MasterItem[];
  billingPositions: MasterItem[];
  roles: MasterItem[];
  departments: MasterItem[];
  retireReasons: MasterItem[];
  dispatchCompanies: MasterItem[];
  contractTypes: MasterItem[];
  holidayTypes: MasterItem[];
  contractJobPositions: MasterItem[];
}

export const CANDIDATE_STATUSES = ['応募受付', '面談予定', '選考中', '内定', '内定承諾', '不採用', '辞退'] as const;
export interface Candidate {
  postalCode?: string;
  address?: string;
  building?: string;

  applicationSource?: string;
  applicationSourceNote?: string;
  decision?: '' | '採用' | '不採用';
  resultNotifiedDate?: string;
  birthDate?: string;
  gender?: string;
  id: string;
  name: string;
  kana: string;
  email: string;
  phone: string;
  jobTitle: string;
  applicationDate: string;
  interviewDate: string;
  status: typeof CANDIDATE_STATUSES[number];
  plannedHireDate: string;
  nextActionDate: string;
  owner: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
  employeeId: string | null;
}

export interface AppData {
  candidates?: Candidate[];
  employees: Employee[];
  contracts: Contract[];
  transfers: Transfer[];
  masters: Masters;
}

// Names for master keys used in the app.
export type MasterKey =
  | 'internalPositions'
  | 'billingPositions'
  | 'roles'
  | 'departments'
  | 'retireReasons'
  | 'dispatchCompanies'
  | 'contractTypes'
  | 'holidayTypes'
  | 'contractJobPositions';

export const MASTER_LABELS: Record<MasterKey, string> = {
  internalPositions: '社内職位',
  billingPositions: '請求職位',
  roles: '役割区分',
  departments: '部署',
  retireReasons: '退職理由',
  dispatchCompanies: '受け入れ派遣会社',
  contractTypes: '契約形態',
  holidayTypes: '休日区分',
  contractJobPositions: '契約書用職区分',
};

export const MASTER_KEY_ORDER: MasterKey[] = [
  'internalPositions',
  'billingPositions',
  'roles',
  'departments',
  'retireReasons',
  'dispatchCompanies',
  'contractTypes',
  'holidayTypes',
  'contractJobPositions',
];
