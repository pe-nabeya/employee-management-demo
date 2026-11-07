// Employee list page with search, filters, pagination.

import { useMemo, useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { getStatus, statusLabel, masterName } from '@/utils/employeeUtils';
import { today, formatDateJP } from '@/utils/dateUtils';
import { Button, Input, Select, Badge, EmptyState } from '@/components/ui';
import type { EmployeeStatus } from '@/utils/employeeUtils';

const PAGE_SIZE = 10;

interface Props {
  onOpenDetail: (id: string) => void;
  onNewEmployee: () => void;
  refDate: string;
}

export function EmployeeList({ onOpenDetail, onNewEmployee, refDate }: Props) {
  const { data } = useStore();
  const { employees, masters } = data;

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [dispatchFilter, setDispatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (q) {
        const match =
          e.employeeNumber.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.kana.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (deptFilter && e.departmentCd !== deptFilter) return false;
      if (dispatchFilter && e.dispatchCompanyCd !== dispatchFilter) return false;
      if (statusFilter) {
        const status = getStatus(e, refDate);
        if (status !== statusFilter) return false;
      }
      return true;
    });
  }, [employees, search, deptFilter, dispatchFilter, statusFilter, refDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const statusVariant = (s: EmployeeStatus) =>
    s === 'active' ? 'active' : s === 'retired' ? 'retired' : 'not_yet';

  const deptOptions = masters.departments.filter((d) => d.active).map((d) => ({ value: d.cd, label: d.name }));
  const dispatchOptions = masters.dispatchCompanies.filter((d) => d.active).map((d) => ({ value: d.cd, label: d.name }));

  const resetPage = () => setPage(0);

  return (
    <div>
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="社員番号・氏名・カナで検索"
          />
          <Select
            value={deptFilter}
            onChange={(v) => { setDeptFilter(v); resetPage(); }}
            options={deptOptions}
            placeholder="すべての部署"
          />
          <Select
            value={dispatchFilter}
            onChange={(v) => { setDispatchFilter(v); resetPage(); }}
            options={dispatchOptions}
            placeholder="すべての派遣会社"
          />
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); resetPage(); }}
            options={[
              { value: 'active', label: '在籍' },
              { value: 'retired', label: '退職' },
              { value: 'not_yet_hired', label: '入社前' },
            ]}
            placeholder="すべての在籍状態"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            検索結果：<strong className="text-slate-700">{filtered.length}</strong>件
            （基準日 {formatDateJP(refDate)}）
          </span>
          <Button onClick={onNewEmployee}>+ 新規登録</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">社員番号</th>
              <th className="text-left px-4 py-3 font-medium">氏名</th>
              <th className="text-left px-4 py-3 font-medium">カナ</th>
              <th className="text-left px-4 py-3 font-medium">部署</th>
              <th className="text-left px-4 py-3 font-medium">社内職位</th>
              <th className="text-left px-4 py-3 font-medium">派遣会社</th>
              <th className="text-left px-4 py-3 font-medium">入社日</th>
              <th className="text-left px-4 py-3 font-medium">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState message="条件に一致する従業員がいません。" />
                </td>
              </tr>
            ) : (
              pageItems.map((e) => {
                const status = getStatus(e, refDate);
                return (
                  <tr
                    key={e.id}
                    onClick={() => onOpenDetail(e.id)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-slate-700">{e.employeeNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{e.name}</td>
                    <td className="px-4 py-3 text-slate-500">{e.kana}</td>
                    <td className="px-4 py-3 text-slate-600">{masterName(masters, 'departments', e.departmentCd)}</td>
                    <td className="px-4 py-3 text-slate-600">{masterName(masters, 'internalPositions', e.internalPositionCd)}</td>
                    <td className="px-4 py-3 text-slate-600">{masterName(masters, 'dispatchCompanies', e.dispatchCompanyCd)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateJP(e.hireDate)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            前へ
          </Button>
          <span className="text-sm text-slate-600 px-2">
            {currentPage + 1} / {totalPages} ページ
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
