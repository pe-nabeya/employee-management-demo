import type { AppData } from '../types';

export function createInitialData(): AppData {
  return {
    candidates: [
      { id: 'demo-candidate-1', name: '架空 花子', kana: 'カクウ ハナコ', email: 'hanako@example.com', phone: '', jobTitle: '営業事務', applicationDate: '2026-10-15', interviewDate: '', status: '応募受付', plannedHireDate: '', nextActionDate: '2026-10-20', owner: 'デモ担当', memo: '架空の選考例です。', createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z', employeeId: null },
      { id: 'demo-candidate-2', name: '見本 太郎', kana: 'ミホン タロウ', email: 'taro@example.com', phone: '', jobTitle: 'サポート担当', applicationDate: '2026-10-10', interviewDate: '2026-10-14', status: '内定承諾', decision: '採用', resultNotifiedDate: '2026-10-15', plannedHireDate: '2026-11-01', nextActionDate: '', owner: 'デモ担当', memo: '従業員への引き継ぎ確認用。', createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z', employeeId: null },
    ],
    masters: {
      internalPositions: [
        { cd: 'A', name: 'A職', active: true },
        { cd: 'B', name: 'B職', active: true },
        { cd: 'M', name: 'M職', active: true },
        { cd: 'D', name: '派遣', active: true },
      ],
      billingPositions: [
        { cd: 'SE', name: 'SE', active: true },
        { cd: 'PG', name: 'PG', active: true },
        { cd: 'LD', name: 'LD', active: true },
        { cd: 'SV', name: 'SV', active: true },
        { cd: 'OP', name: 'OP', active: true },
      ],
      roles: [
        { cd: 'MEM', name: 'メンバー', active: true },
        { cd: 'LD', name: 'LD', active: true },
        { cd: 'SV', name: 'SV', active: true },
        { cd: 'PL', name: 'PL', active: true },
      ],
      departments: [
        { cd: 'DEV1', name: '開発1課', active: true },
        { cd: 'DEV2', name: '開発2課', active: true },
        { cd: 'INFRA', name: 'インフラ課', active: true },
        { cd: 'SALES', name: '営業課', active: true },
        { cd: 'GEN', name: '総務課', active: true },
        { cd: 'QA', name: '品質保証課', active: true },
      ],
      retireReasons: [
        { cd: '1', name: '自己都合', active: true },
        { cd: '2', name: '契約満了', active: true },
        { cd: '3', name: '定年退職', active: true },
        { cd: '4', name: '退職勧奨', active: true },
        { cd: '5', name: 'その他', active: true },
      ],
      dispatchCompanies: [
        { cd: 'TEC01', name: 'テクノスタッフ株式会社', active: true },
        { cd: 'SYS02', name: 'システムサービス株式会社', active: true },
        { cd: 'HR03', name: 'ヒューマンリソース株式会社', active: true },
        { cd: 'NET04', name: 'ネットワークソリューション株式会社', active: true },
        { cd: 'DATA05', name: 'データテクノロジー株式会社', active: true },
      ],
      contractTypes: [
        { cd: '1', name: '正社員', active: true },
        { cd: '2', name: '契約社員', active: true },
        { cd: '3', name: '派遣', active: true },
        { cd: '4', name: '業務委託', active: true },
      ],
      holidayTypes: [
        { cd: '4W8', name: '4週8休', active: true },
        { cd: '4W16', name: '4週16休', active: true },
        { cd: 'CAL', name: '暦休', active: true },
      ],
      contractJobPositions: [
      { cd: 'D', name: 'D職（無期雇用）', active: true },
        { cd: 'M', name: 'M職', active: true },
        { cd: 'H', name: 'H職', active: true },
        { cd: 'LD', name: 'LD職', active: true },
        { cd: 'SV', name: 'SV職', active: true },
      ],
    },
    employees: [],
    contracts: [],
    transfers: [],
  };
}

