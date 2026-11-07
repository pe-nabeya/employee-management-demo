// Master management page: view, add, edit, deactivate master items.

import { useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { Button, Input, Select, Badge, Modal, PageHeader, EmptyState, FormField } from '@/components/ui';
import { MASTER_LABELS, MASTER_KEY_ORDER, type MasterKey, type MasterItem } from '@/types';

export function MasterManagement() {
  const { store, data, refresh } = useStore();
  const [activeKey, setActiveKey] = useState<MasterKey>('internalPositions');
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterItem | null>(null);

  const [form, setForm] = useState<MasterItem>({ cd: '', name: '', active: true });
  const [isCdEditable, setIsCdEditable] = useState(true);

  const list = data.masters[activeKey];

  // Check if a master item CD is used by any employee/contract
  const isUsed = (cd: string): boolean => {
    if (activeKey === 'departments') {
      return data.employees.some((e) => e.departmentCd === cd) ||
        data.transfers.some((t) => t.fromDeptCd === cd || t.toDeptCd === cd);
    }
    if (activeKey === 'internalPositions') return data.employees.some((e) => e.internalPositionCd === cd);
    if (activeKey === 'billingPositions') return data.employees.some((e) => e.billingPositionCd === cd);
    if (activeKey === 'roles') return data.employees.some((e) => e.roleCd === cd);
    if (activeKey === 'retireReasons') return data.employees.some((e) => e.retireReasonCd === cd);
    if (activeKey === 'dispatchCompanies') return data.employees.some((e) => e.dispatchCompanyCd === cd);
    if (activeKey === 'contractTypes') return data.contracts.some((c) => c.contractTypeCd === cd);
    if (activeKey === 'holidayTypes') return data.contracts.some((c) => c.holidayTypeCd === cd);
    if (activeKey === 'contractJobPositions') return data.contracts.some((c) => c.contractJobPositionCd === cd);
    return false;
  };

  const openNew = () => {
    setEditingItem(null);
    setForm({ cd: '', name: '', active: true });
    setIsCdEditable(true);
    setFormOpen(true);
  };

  const openEdit = (item: MasterItem) => {
    setEditingItem(item);
    setForm({ ...item });
    setIsCdEditable(false);
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.cd.trim() || !form.name.trim()) return;
    store.saveMasterItem(activeKey, { ...form, cd: form.cd.trim(), name: form.name.trim() });
    refresh();
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    store.deleteMasterItem(activeKey, deleteTarget.cd);
    refresh();
    setDeleteTarget(null);
  };

  const handleToggleActive = (item: MasterItem) => {
    store.saveMasterItem(activeKey, { ...item, active: !item.active });
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="マスタ管理"
        subtitle="各マスタの登録・編集・無効化を行います。使用済みのマスタは削除せず無効化できます。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Master selector sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <nav className="space-y-1">
              {MASTER_KEY_ORDER.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveKey(key)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeKey === key
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {MASTER_LABELS[key]}
                  <span className={`ml-2 text-xs ${activeKey === key ? 'text-slate-300' : 'text-slate-400'}`}>
                    ({data.masters[key].length})
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Master items table */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">{MASTER_LABELS[activeKey]}</h3>
              <Button size="sm" onClick={openNew}>+ 追加</Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">CD</th>
                  <th className="text-left px-4 py-3 font-medium">名称</th>
                  <th className="text-left px-4 py-3 font-medium">状態</th>
                  <th className="text-left px-4 py-3 font-medium">使用中</th>
                  <th className="text-right px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState message="データがありません。" /></td></tr>
                ) : (
                  list.map((item) => {
                    const used = isUsed(item.cd);
                    return (
                      <tr key={item.cd} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-700">{item.cd}</td>
                        <td className="px-4 py-3 text-slate-800">{item.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={item.active ? 'active' : 'retired'}>
                            {item.active ? '有効' : '無効'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{used ? 'はい' : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>編集</Button>
                            {item.active ? (
                              <Button variant="ghost" size="sm" onClick={() => handleToggleActive(item)} disabled={used}>
                                {used ? '使用中' : '無効化'}
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleToggleActive(item)}>有効化</Button>
                            )}
                            {!used && (
                              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>削除</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            使用中のマスタは無効化・削除できません。名称や対応の変更は「編集」から行えます。
            社内職位・役割区分の名称は仮登録であり、後から編集可能です。
          </p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={formOpen}
        title={editingItem ? `${MASTER_LABELS[activeKey]} 編集` : `${MASTER_LABELS[activeKey]} 追加`}
        onClose={() => setFormOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={!form.cd.trim() || !form.name.trim()}>保存</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="CD" required hint="半角英数字で入力してください。">
            <Input
              value={form.cd}
              onChange={(v) => setForm({ ...form, cd: v })}
              disabled={!isCdEditable}
              placeholder="例: A"
            />
          </FormField>
          <FormField label="名称" required>
            <Input
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="例: A職"
            />
          </FormField>
          <FormField label="有効フラグ">
            <Select
              value={form.active ? 'true' : 'false'}
              onChange={(v) => setForm({ ...form, active: v === 'true' })}
              options={[
                { value: 'true', label: '有効' },
                { value: 'false', label: '無効' },
              ]}
            />
          </FormField>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={deleteTarget !== null}
        title="削除の確認"
        onClose={() => setDeleteTarget(null)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Button>
            <Button variant="danger" onClick={handleDelete}>削除する</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          「{deleteTarget?.name}」（CD: {deleteTarget?.cd}）を削除します。よろしいですか？
        </p>
      </Modal>
    </div>
  );
}
