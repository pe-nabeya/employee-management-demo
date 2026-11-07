// Employee detail page with tabs: basic info, contract history, transfer history.

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { Button, Badge, Tabs, EmptyState, Modal } from '@/components/ui';
import { formatDateJP, calculateAge } from '@/utils/dateUtils';
import { masterName, getStatus, statusLabel, getContractOnDate } from '@/utils/employeeUtils';
import { ContractForm } from './ContractForm';
import { TransferForm } from './TransferForm';
import type { EmployeeStatus } from '@/utils/employeeUtils';
import type { Contract, Transfer } from '@/types';

interface Props {
  employeeId: string;
  refDate: string;
  onBack: () => void;
  onEdit: () => void;
}

export function EmployeeDetail({ employeeId, refDate, onBack, onEdit }: Props) {
  const { store, data, refresh } = useStore();
  const [activeTab, setActiveTab] = useState('basic');
  const [copyContract, setCopyContract] = useState<Contract | null>(null);
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [transferFormOpen, setTransferFormOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'contract' | 'transfer' | 'employee'; id: string } | null>(null);

  const employee = data.employees.find((e) => e.id === employeeId);

  const contracts = useMemo(
    () => (employee ? store.getContractsByEmployee(employeeId) : []),
    [employee, store, employeeId, data.contracts],
  );

  const transfers = useMemo(
    () => (employee ? store.getTransfersByEmployee(employeeId) : []),
    [employee, store, employeeId, data.transfers],
  );

  if (!employee) {
    return (
      <div>
        <EmptyState message="従業員が見つかりません。" />
        <Button variant="secondary" onClick={onBack} className="mt-4">一覧に戻る</Button>
      </div>
    );
  }

  const status = getStatus(employee, refDate);
  const statusVariant = (s: EmployeeStatus) => (s === 'active' ? 'active' : s === 'retired' ? 'retired' : 'not_yet');
  const currentContract = getContractOnDate(contracts, refDate);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'contract') store.deleteContract(deleteTarget.id);
    else if (deleteTarget.type === 'transfer') store.deleteTransfer(deleteTarget.id);
    else if (deleteTarget.type === 'employee') {
      store.deleteEmployee(deleteTarget.id);
      refresh();
      onBack();
      return;
    }
    refresh();
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-sm">← 一覧に戻る</button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>編集</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget({ type: 'employee', id: employee.id })}>
            削除
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-slate-800">{employee.name}</h2>
              <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
            </div>
            <p className="text-sm text-slate-500">{employee.kana}</p>
            <p className="text-sm text-slate-600 mt-1">社員番号: <span className="font-mono">{employee.employeeNumber}</span></p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>基準日: {formatDateJP(refDate)}</p>
            {currentContract ? (
              <p className="mt-1">基準日時点の時給: <span className="font-semibold text-slate-700">{currentContract.hourlyRate.toLocaleString()}円</span></p>
            ) : (
              <p className="mt-1 text-amber-600">基準日に有効な契約がありません</p>
            )}
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'basic', label: '基本情報' },
          { key: 'contract', label: '契約履歴', count: contracts.length },
          { key: 'transfer', label: '異動履歴', count: transfers.length },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      <div className="bg-white rounded-lg border border-slate-200 border-t-0 p-6">
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow label="社員番号" value={employee.employeeNumber} />
            <InfoRow label="氏名" value={employee.name} />
            <InfoRow label="カナ" value={employee.kana} />
            <InfoRow label="電話番号" value={employee.phone || '—'} />
            <InfoRow label="メールアドレス" value={employee.email || '—'} />
            <InfoRow label="郵便番号" value={employee.postalCode || '—'} />
            <InfoRow label="住所" value={employee.address || '—'} />
            <InfoRow label="建物名・部屋番号" value={employee.building || '—'} />
            <InfoRow label="生年月日" value={employee.birthDate ? formatDateJP(employee.birthDate) : '—'} />
            <InfoRow label="年齢（今日時点）" value={calculateAge(employee.birthDate) === null ? '—' : `${calculateAge(employee.birthDate)}歳`} />
            <InfoRow label="性別" value={employee.gender || '未回答'} />
            <InfoRow label="入社日" value={formatDateJP(employee.hireDate)} />
            <InfoRow label="退職日" value={employee.retireDate ? formatDateJP(employee.retireDate) : '—（在籍中）'} />
            <InfoRow label="退職理由" value={masterName(data.masters, 'retireReasons', employee.retireReasonCd)} />
            <InfoRow label="社内職位" value={masterName(data.masters, 'internalPositions', employee.internalPositionCd)} />
            <InfoRow label="請求職位" value={masterName(data.masters, 'billingPositions', employee.billingPositionCd)} />
            <InfoRow label="役割区分" value={masterName(data.masters, 'roles', employee.roleCd)} />
            <InfoRow label="部署" value={masterName(data.masters, 'departments', employee.departmentCd)} />
            <InfoRow label="派遣会社" value={masterName(data.masters, 'dispatchCompanies', employee.dispatchCompanyCd)} />
            <InfoRow label="メモ" value={employee.memo || '—'} />
            <h3 className="md:col-span-2 font-semibold border-t pt-4 mt-2">保証人情報</h3>
            <InfoRow label="保証人氏名" value={employee.guarantorName || '—'} />
            <InfoRow label="本人との関係" value={employee.guarantorRelationship || '—'} />
            <InfoRow label="保証人電話番号" value={employee.guarantorPhone || '—'} />
            <InfoRow label="保証人郵便番号" value={employee.guarantorPostalCode || '—'} />
            <InfoRow label="保証人住所" value={employee.guarantorAddress || '—'} />
            <InfoRow label="保証人建物名・部屋番号" value={employee.guarantorBuilding || '—'} />
            <InfoRow label="提出書類の種類" value={employee.guarantorDocumentType || '—'} />
            <InfoRow label="書類受領日" value={employee.guarantorReceivedDate ? formatDateJP(employee.guarantorReceivedDate) : '—'} />
          </div>
        )}

        {activeTab === 'contract' && (
          <div>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => { setCopyContract(null); setEditingContract(null); setContractFormOpen(true); }}>
                + 契約追加
              </Button>
            </div>
            {contracts.length === 0 ? (
              <EmptyState message="契約履歴がありません。" />
            ) : (
              <div className="space-y-3">
                {contracts.map((c) => (
                  <div key={c.id} className={`border rounded-lg p-4 ${currentContract?.id === c.id ? 'border-slate-700 bg-slate-50' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-slate-700">
                            {formatDateJP(c.applyStart)} 〜 {c.applyEnd ? formatDateJP(c.applyEnd) : '現在'}
                          </span>
                          {currentContract?.id === c.id && (
                            <Badge variant="active">基準日有効</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                          <span className="text-slate-500">時給: <span className="text-slate-800 font-medium">{c.hourlyRate.toLocaleString()}円</span></span>
                          <span className="text-slate-500">手当: <span className="text-slate-800">{c.allowance.toLocaleString()}円</span> {c.allowanceDesc}</span>
                          <span className="text-slate-500">契約形態: <span className="text-slate-800">{masterName(data.masters, 'contractTypes', c.contractTypeCd)}</span></span>
                          <span className="text-slate-500">交通費: <span className="text-slate-800">{c.transportExpense.toLocaleString()}円 / {c.transportUnit}</span></span>
                          <span className="text-slate-500">交通手段: <span className="text-slate-800">{c.transportMethod}</span></span>
                          <span className="text-slate-500">詳細: <span className="text-slate-800">{c.contractDetail}</span></span>
                          <span className="text-slate-500">契約書用職区分: <span className="text-slate-800">{masterName(data.masters, 'contractJobPositions', c.contractJobPositionCd)}</span></span>
                          <span className="text-slate-500">休日区分: <span className="text-slate-800">{masterName(data.masters, 'holidayTypes', c.holidayTypeCd)}</span></span>
                          {c.holidayDetail && <span className="text-slate-500 md:col-span-3">休日詳細: <span className="text-slate-800">{c.holidayDetail}</span></span>}
                        </div>
                        {c.contractMemo && <p className="text-sm text-slate-500 mt-2">備考: {c.contractMemo}</p>}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="sm" onClick={() => { setCopyContract(c); setEditingContract(null); setContractFormOpen(true); }}>コピーして更新</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setCopyContract(null); setEditingContract(c); setContractFormOpen(true); }}>編集</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'contract', id: c.id })}>削除</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transfer' && (
          <div>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => { setEditingTransfer(null); setTransferFormOpen(true); }}>
                + 異動追加
              </Button>
            </div>
            {transfers.length === 0 ? (
              <EmptyState message="異動履歴がありません。" />
            ) : (
              <div className="relative">
                {transfers.map((t, idx) => (
                  <div key={t.id} className="flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-slate-400 mt-1" />
                      {idx < transfers.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{formatDateJP(t.transferDate)}</p>
                          <p className="text-sm text-slate-600 mt-1">
                            {masterName(data.masters, 'departments', t.fromDeptCd) || '（なし）'}
                            {' → '}
                            <span className="text-slate-800 font-medium">{masterName(data.masters, 'departments', t.toDeptCd)}</span>
                          </p>
                          {t.memo && <p className="text-xs text-slate-500 mt-1">{t.memo}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingTransfer(t); setTransferFormOpen(true); }}>編集</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'transfer', id: t.id })}>削除</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ContractForm
        open={contractFormOpen}
        onClose={() => setContractFormOpen(false)}
        employeeId={employeeId}
        editingContract={editingContract}
        copyFrom={copyContract}
      />
      <TransferForm
        open={transferFormOpen}
        onClose={() => setTransferFormOpen(false)}
        employee={employee}
        editingTransfer={editingTransfer}
      />

      <Modal
        open={deleteTarget !== null}
        title="削除の確認"
        onClose={() => setDeleteTarget(null)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Button>
            <Button variant="danger" onClick={confirmDelete}>削除する</Button>
          </>
        }
      >
        {deleteTarget?.type === 'employee' ? (
          <p className="text-sm text-slate-700">
            従業員「{employee.name}」を削除します。関連する契約履歴・異動履歴もすべて削除されます。この操作は取り消せません。
          </p>
        ) : (
          <p className="text-sm text-slate-700">この記録を削除します。よろしいですか？</p>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-400 mb-0.5">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}
