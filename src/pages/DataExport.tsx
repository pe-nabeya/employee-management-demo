// Data export page: active list, hire list, retire list, contract data for Word merge.
// CSV output with UTF-8 BOM, proper escaping, formula injection prevention, preview.

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { Button, Input, Select, PageHeader, EmptyState } from '@/components/ui';
import { buildCSV, downloadCSV } from '@/utils/csvUtils';
import { formatDateJP, today } from '@/utils/dateUtils';
import { getStatus, masterName, getContractOnDate } from '@/utils/employeeUtils';
import type { Employee, Contract } from '@/types';

type ExportType = 'active' | 'hired' | 'retired' | 'contract' | 'word_contract' | 'word_contract_period';

interface ExportConfig {
  type: ExportType;
  label: string;
  description: string;
  needsDateRange: boolean;
  needsRefDate: boolean;
  needsContractPeriod: boolean;
  needsWordFilters: boolean;
  columns: { key: string; label: string }[];
}

const WORD_CONTRACT_COLUMNS = [
  { key: 'employeeNumber', label: '社員番号' },
  { key: 'name', label: '名前' },
  { key: 'department', label: '部署' },
  { key: 'holidayType', label: '休日' },
  { key: 'holidayDetail', label: '休日詳細' },
  { key: 'applyStart', label: '契約開始日' },
  { key: 'applyEnd', label: '契約終了日' },
  { key: 'hourlyRate', label: '時給' },
  { key: 'allowance', label: '手当額' },
  { key: 'allowanceDesc', label: '手当内容' },
  { key: 'employmentTerm', label: '雇用期間' },
];

const EXPORT_CONFIGS: Record<ExportType, ExportConfig> = {
  active: {
    type: 'active',
    label: '在籍者リスト',
    description: '指定した基準日に在籍している従業員の一覧を出力します。',
    needsDateRange: false,
    needsRefDate: true,
    needsContractPeriod: false,
    needsWordFilters: false,
    columns: [
      { key: 'employeeNumber', label: '社員番号' },
      { key: 'name', label: '氏名' },
      { key: 'kana', label: 'カナ' },
      { key: 'department', label: '部署' },
      { key: 'internalPosition', label: '社内職位' },
      { key: 'billingPosition', label: '請求職位' },
      { key: 'role', label: '役割区分' },
      { key: 'dispatchCompany', label: '派遣会社' },
      { key: 'hireDate', label: '入社日' },
      { key: 'hourlyRate', label: '時給' },
      { key: 'allowance', label: '手当額' },
    ],
  },
  hired: {
    type: 'hired',
    label: '入社者リスト',
    description: '指定した期間に入社した従業員の一覧を出力します（両端の日を含みます）。',
    needsDateRange: true,
    needsRefDate: false,
    needsContractPeriod: false,
    needsWordFilters: false,
    columns: [
      { key: 'employeeNumber', label: '社員番号' },
      { key: 'name', label: '氏名' },
      { key: 'kana', label: 'カナ' },
      { key: 'hireDate', label: '入社日' },
      { key: 'department', label: '部署' },
      { key: 'internalPosition', label: '社内職位' },
      { key: 'dispatchCompany', label: '派遣会社' },
    ],
  },
  retired: {
    type: 'retired',
    label: '退職者リスト',
    description: '指定した期間に退職した従業員の一覧を出力します（両端の日を含みます）。',
    needsDateRange: true,
    needsRefDate: false,
    needsContractPeriod: false,
    needsWordFilters: false,
    columns: [
      { key: 'employeeNumber', label: '社員番号' },
      { key: 'name', label: '氏名' },
      { key: 'kana', label: 'カナ' },
      { key: 'hireDate', label: '入社日' },
      { key: 'retireDate', label: '退職日' },
      { key: 'retireReason', label: '退職理由' },
      { key: 'department', label: '部署' },
    ],
  },
  contract: {
    type: 'contract',
    label: 'Word差し込み印刷用 契約データ',
    description: '指定した基準日に有効な契約データを出力します。該当契約がない人は対象外となります。',
    needsDateRange: false,
    needsRefDate: true,
    needsContractPeriod: false,
    needsWordFilters: false,
    columns: [
      { key: 'employeeNumber', label: '社員番号' },
      { key: 'name', label: '氏名' },
      { key: 'kana', label: 'カナ' },
      { key: 'department', label: '部署' },
      { key: 'contractType', label: '契約形態' },
      { key: 'hourlyRate', label: '時給' },
      { key: 'allowance', label: '手当額' },
      { key: 'allowanceDesc', label: '手当内容' },
      { key: 'transportExpense', label: '交通費額' },
      { key: 'transportUnit', label: '交通費単位' },
      { key: 'transportMethod', label: '交通手段' },
      { key: 'contractDetail', label: '契約詳細' },
      { key: 'applyStart', label: '契約開始日' },
      { key: 'applyEnd', label: '契約終了日' },
    ],
  },
  word_contract: {
    type: 'word_contract',
    label: 'Word契約書用CSV（基準日時点）',
    description: '基準日時点で在籍し、有効な契約がある人を対象とします。契約書用職区分と休日区分で絞り込みできます。',
    needsDateRange: false,
    needsRefDate: true,
    needsContractPeriod: false,
    needsWordFilters: true,
    columns: WORD_CONTRACT_COLUMNS,
  },
  word_contract_period: {
    type: 'word_contract_period',
    label: 'Word契約書用CSV（指定期間）',
    description: '指定した契約開始日・契約終了日に完全一致する契約を抽出します。未来の契約書作成に対応します。在籍状態で除外せず、契約の有無で判定します。',
    needsDateRange: false,
    needsRefDate: false,
    needsContractPeriod: true,
    needsWordFilters: true,
    columns: WORD_CONTRACT_COLUMNS,
  },
};

function getEmployeeValue(
  emp: Employee,
  contract: Contract | null,
  columnKey: string,
  masters: ReturnType<typeof useStore>['data']['masters'],
): string | number {
  switch (columnKey) {
    case 'employmentTerm': return contract?.contractJobPositionCd === 'D' ? '期間の定めなし' : '';
    case 'employeeNumber': return emp.employeeNumber;
    case 'name': return emp.name;
    case 'kana': return emp.kana;
    case 'hireDate': return emp.hireDate;
    case 'retireDate': return emp.retireDate ?? '';
    case 'retireReason': return masterName(masters, 'retireReasons', emp.retireReasonCd);
    case 'department': return masterName(masters, 'departments', emp.departmentCd);
    case 'internalPosition': return masterName(masters, 'internalPositions', emp.internalPositionCd);
    case 'billingPosition': return masterName(masters, 'billingPositions', emp.billingPositionCd);
    case 'role': return masterName(masters, 'roles', emp.roleCd);
    case 'dispatchCompany': return masterName(masters, 'dispatchCompanies', emp.dispatchCompanyCd);
    case 'hourlyRate': return contract ? contract.hourlyRate : '';
    case 'allowance': return contract ? contract.allowance : '';
    case 'allowanceDesc': return contract ? contract.allowanceDesc : '';
    case 'transportExpense': return contract ? contract.transportExpense : '';
    case 'transportUnit': return contract ? contract.transportUnit : '';
    case 'transportMethod': return contract ? contract.transportMethod : '';
    case 'contractDetail': return contract ? contract.contractDetail : '';
    case 'contractType': return contract ? masterName(masters, 'contractTypes', contract.contractTypeCd) : '';
    case 'holidayType': return contract ? masterName(masters, 'holidayTypes', contract.holidayTypeCd) : '';
    case 'holidayDetail': return contract ? contract.holidayDetail : '';
    case 'contractJobPosition': return contract ? masterName(masters, 'contractJobPositions', contract.contractJobPositionCd) : '';
    case 'applyStart': return contract ? contract.applyStart : '';
    case 'applyEnd': return contract ? (contract.applyEnd ?? '') : '';
    default: return '';
  }
}

/** Checks for contradictions between employment period and contract period. */
function checkPeriodContradiction(emp: Employee, contract: Contract): string | null {
  if (contract.applyStart < emp.hireDate) {
    return `契約開始日（${formatDateJP(contract.applyStart)}）が入社日（${formatDateJP(emp.hireDate)}）より前です。`;
  }
  if (emp.retireDate) {
    if (contract.applyEnd && contract.applyEnd > emp.retireDate) {
      return `契約終了日（${formatDateJP(contract.applyEnd)}）が退職日（${formatDateJP(emp.retireDate)}）より後です。`;
    }
    if (!contract.applyEnd) {
      return `退職日（${formatDateJP(emp.retireDate)}）が設定されていますが、契約が継続中（終了日未設定）です。`;
    }
  }
  return null;
}

export function DataExport() {
  const { data, store } = useStore();
  const [exportType, setExportType] = useState<ExportType>('active');
  const [refDate, setRefDate] = useState(today());
  const [startDate, setStartDate] = useState('2024-04-01');
  const [endDate, setEndDate] = useState(today());
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [filterJobPos, setFilterJobPos] = useState('');
  const [filterHolidayType, setFilterHolidayType] = useState('');

  const config = EXPORT_CONFIGS[exportType];
  const isWordContract = exportType === 'word_contract';
  const isWordContractPeriod = exportType === 'word_contract_period';
  const isAnyWordContract = isWordContract || isWordContractPeriod;

  const jobPosOptions = data.masters.contractJobPositions
    .filter((m) => m.active)
    .map((m) => ({ value: m.cd, label: m.name }));
  const holidayOptions = data.masters.holidayTypes
    .filter((m) => m.active)
    .map((m) => ({ value: m.cd, label: m.name }));

  const { rows, excluded, excludedReason, warnings, noMatch } = useMemo(() => {
    const included: { emp: Employee; contract: Contract | null }[] = [];
    const excludedList: { emp: Employee; reason: string }[] = [];
    const warningList: { emp: Employee; message: string }[] = [];
    let matchFound = false;

    for (const emp of data.employees) {
      if (exportType === 'active') {
        const status = getStatus(emp, refDate);
        if (status === 'active') {
          const contracts = store.getContractsByEmployee(emp.id);
          const contract = getContractOnDate(contracts, refDate);
          included.push({ emp, contract });
        }
      } else if (exportType === 'hired') {
        if (emp.hireDate >= startDate && emp.hireDate <= endDate) {
          included.push({ emp, contract: null });
        }
      } else if (exportType === 'retired') {
        if (emp.retireDate && emp.retireDate >= startDate && emp.retireDate <= endDate) {
          included.push({ emp, contract: null });
        }
      } else if (exportType === 'contract') {
        const status = getStatus(emp, refDate);
        if (status !== 'active') {
          if (status === 'retired') {
            excludedList.push({ emp, reason: '退職済み' });
          } else {
            excludedList.push({ emp, reason: '入社前' });
          }
          continue;
        }
        const contracts = store.getContractsByEmployee(emp.id);
        const contract = getContractOnDate(contracts, refDate);
        if (contract) {
          included.push({ emp, contract });
        } else {
          excludedList.push({ emp, reason: '基準日に有効な契約がない' });
        }
      } else if (isWordContract) {
        const status = getStatus(emp, refDate);
        if (status !== 'active') {
          if (status === 'retired') {
            excludedList.push({ emp, reason: '退職済み' });
          } else {
            excludedList.push({ emp, reason: '入社前' });
          }
          continue;
        }
        const contracts = store.getContractsByEmployee(emp.id);
        const contract = getContractOnDate(contracts, refDate);
        if (!contract) {
          excludedList.push({ emp, reason: '基準日に有効な契約がない' });
          continue;
        }
        if (!contract.contractJobPositionCd) {
          excludedList.push({ emp, reason: '契約書用職区分が未設定' });
          continue;
        }
        if (!contract.holidayTypeCd) {
          excludedList.push({ emp, reason: '休日区分が未設定' });
          continue;
        }
        if (filterJobPos && contract.contractJobPositionCd !== filterJobPos) continue;
        if (filterHolidayType && contract.holidayTypeCd !== filterHolidayType) continue;
        included.push({ emp, contract });
      } else if (isWordContractPeriod) {
        const contracts = store.getContractsByEmployee(emp.id);
        // Match contracts where applyStart === periodStart AND applyEnd === periodEnd (exact match)
        // If periodEnd is empty, match contracts with applyEnd === null (ongoing)
        const matched = contracts.filter((c) => {
          if (c.applyStart !== periodStart) return false;
          if (c.contractJobPositionCd === 'D') return true;
          if (periodEnd === '') {
            return c.applyEnd === null;
          }
          return c.applyEnd === periodEnd;
        });

        if (matched.length === 0) continue;

        matchFound = true;

        for (const contract of matched) {
          if (!contract.contractJobPositionCd) {
            excludedList.push({ emp, reason: '契約書用職区分が未設定' });
            continue;
          }
          if (!contract.holidayTypeCd) {
            excludedList.push({ emp, reason: '休日区分が未設定' });
            continue;
          }
          if (filterJobPos && contract.contractJobPositionCd !== filterJobPos) continue;
          if (filterHolidayType && contract.holidayTypeCd !== filterHolidayType) continue;

          // Check for employment/contract period contradictions
          const contradiction = checkPeriodContradiction(emp, contract);
          if (contradiction) {
            warningList.push({ emp, message: contradiction });
          }

          included.push({ emp, contract });
        }
      }
    }

    const csvRows = included.map(({ emp, contract }) =>
      config.columns.map((col) => isAnyWordContract && contract?.contractJobPositionCd === 'D' && ['applyStart', 'applyEnd'].includes(col.key)
        ? '' : getEmployeeValue(emp, contract, col.key, data.masters)),
    );

    return {
      rows: csvRows,
      excluded: excludedList,
      excludedReason: exportType === 'contract' || isAnyWordContract,
      warnings: warningList,
      noMatch: isWordContractPeriod && !matchFound && periodStart !== '',
    };
  }, [exportType, refDate, startDate, endDate, periodStart, periodEnd, data, store, config.columns, filterJobPos, filterHolidayType, isWordContract, isWordContractPeriod, isAnyWordContract]);

  const handleDownload = () => {
    const headers = config.columns.map((c) => c.label);
    const csv = buildCSV(headers, rows);
    const filename = `${config.label}_${isWordContractPeriod ? `${periodStart}_${periodEnd || '継続'}` : config.needsDateRange ? `${startDate}_${endDate}` : refDate}.csv`;
    downloadCSV(filename, csv);
  };

  return (
    <div>
      <PageHeader
        title="データ出力"
        subtitle="在籍者・入社者・退職者リスト、およびWord差し込み印刷用の契約データをCSV出力します。"
      />

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">出力種別</label>
            <Select
              value={exportType}
              onChange={(v) => { setExportType(v as ExportType); setShowPreview(false); }}
              options={Object.values(EXPORT_CONFIGS).map((c) => ({ value: c.type, label: c.label }))}
            />
          </div>
          {config.needsRefDate && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">基準日</label>
              <Input type="date" value={refDate} onChange={(v) => { setRefDate(v); setShowPreview(false); }} />
            </div>
          )}
        </div>
        {config.needsDateRange && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">開始日（含む）</label>
              <Input type="date" value={startDate} onChange={(v) => { setStartDate(v); setShowPreview(false); }} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">終了日（含む）</label>
              <Input type="date" value={endDate} onChange={(v) => { setEndDate(v); setShowPreview(false); }} />
            </div>
          </div>
        )}
        {config.needsContractPeriod && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">契約開始日（完全一致）</label>
              <Input type="date" value={periodStart} onChange={(v) => { setPeriodStart(v); setShowPreview(false); }} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">契約終了日（完全一致）</label>
              <Input type="date" value={periodEnd} onChange={(v) => { setPeriodEnd(v); setShowPreview(false); }} placeholder="空欄で継続中の契約に一致" />
            </div>
          </div>
        )}
        <p className="text-sm text-slate-500 bg-slate-50 rounded p-3">{config.description}</p>
        {isAnyWordContract && <p className="text-sm text-blue-900 bg-blue-50 p-3 mt-3 rounded">D職は無期雇用のため、契約開始日・終了日は空欄、雇用期間は「期間の定めなし」と出力します。指定期間モードのD職は、条件の適用開始日で抽出し、終了日の指定は使用しません。WordのD職用ひな形では契約期間欄を省くか「期間の定めなし」としてください。</p>}
        {config.needsWordFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">契約書用職区分で絞り込み</label>
              <Select
                value={filterJobPos}
                onChange={(v) => { setFilterJobPos(v); setShowPreview(false); }}
                options={jobPosOptions}
                placeholder="すべて"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">休日区分で絞り込み</label>
              <Select
                value={filterHolidayType}
                onChange={(v) => { setFilterHolidayType(v); setShowPreview(false); }}
                options={holidayOptions}
                placeholder="すべて"
              />
            </div>
          </div>
        )}
      </div>

      {noMatch && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-amber-800 mb-1">対象契約が見つかりません</h3>
          <p className="text-sm text-amber-700">
            指定した契約開始日・契約終了日に完全一致する契約履歴がありません。
            既存契約の日付を変更したり、契約を自動作成することはしません。
            該当する契約履歴を従業員詳細画面から登録してください。
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-800">出力対象</h3>
          <Button variant="secondary" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? 'プレビューを閉じる' : 'プレビューを表示'}
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500">対象者数</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{rows.length}<span className="text-sm font-normal text-slate-500 ml-1">件</span></p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500">除外者数</p>
            <p className="text-2xl font-bold text-slate-500 mt-1">{excluded.length}<span className="text-sm font-normal text-slate-500 ml-1">件</span></p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500">列数</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{config.columns.length}<span className="text-sm font-normal text-slate-500 ml-1">列</span></p>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800 mb-2">在籍期間と契約期間の矛盾（{warnings.length}件）:</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {warnings.map((w, i) => (
                <div key={i} className="text-sm text-red-700 flex gap-2">
                  <span className="font-mono text-red-500">{w.emp.employeeNumber}</span>
                  <span>{w.emp.name}</span>
                  <span>— {w.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {excludedReason && excluded.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">対象外の従業員と理由:</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {excluded.map((ex) => (
                <div key={ex.emp.id} className="text-sm text-slate-600 flex gap-2">
                  <span className="font-mono text-slate-500">{ex.emp.employeeNumber}</span>
                  <span>{ex.emp.name}</span>
                  <span className="text-amber-600">— {ex.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showPreview && (
          <div className="mt-4 border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {config.columns.map((c) => (
                    <th key={c.key} className="text-left px-3 py-2 font-medium whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={config.columns.length}><EmptyState message="対象データがありません。" /></td></tr>
                ) : (
                  rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {rows.length > 20 && <p className="text-xs text-slate-400 px-3 py-2">先頭20件を表示中（全{rows.length}件）</p>}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={handleDownload} disabled={rows.length === 0}>
            CSVダウンロード（{rows.length}件）
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">Excelで開く際の注意事項</h3>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>CSVファイルはUTF-8 BOM付きで出力しています。ダブルクリックでExcelに開けます。</li>
          <li>社員番号の先頭ゼロ（例: 01001）がExcelで表示されない場合は、Excelの「データ」→「テキストから」で取り込み、該当列を「文字列」として指定してください。</li>
          <li>CSVインジェクション対策として、セルの先頭文字が =, +, -, @ の場合は自動的に先頭にシングルクォートが付与されます。</li>
          <li>列名は日本語で固定しています。Wordテンプレートに合わせて後から変更可能です。</li>
        </ul>
      </div>
    </div>
  );
}
