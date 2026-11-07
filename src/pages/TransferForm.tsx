// Transfer add/edit form modal.
// Registering a transfer also updates the employee's current department.

import { useState, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { Button, Input, Select, Textarea, FormField, Modal } from '@/components/ui';
import type { Transfer, Employee } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  editingTransfer: Transfer | null;
}

const emptyTransfer: Transfer = {
  id: '',
  employeeId: '',
  transferDate: '',
  fromDeptCd: null,
  toDeptCd: null,
  memo: '',
};

export function TransferForm({ open, onClose, employee, editingTransfer }: Props) {
  const { store, data, refresh } = useStore();
  const [form, setForm] = useState<Transfer>(emptyTransfer);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(
        editingTransfer
          ? { ...editingTransfer }
          : {
              ...emptyTransfer,
              employeeId: employee?.id ?? '',
              fromDeptCd: employee?.departmentCd ?? null,
            },
      );
      setErrors({});
    }
  }, [open, editingTransfer, employee]);

  const set = <K extends keyof Transfer>(key: K, value: Transfer[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const deptOptions = data.masters.departments
    .filter((d) => d.active)
    .map((d) => ({ value: d.cd, label: d.name }));

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.transferDate) errs.transferDate = '異動日を入力してください。';
    if (!form.toDeptCd) errs.toDeptCd = '異動先部署を選択してください。';

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Save the transfer record
    store.saveTransfer({ ...form });

    // Also update the employee's current department (異動登録と現在部署の更新は一つの処理)
    if (employee && !editingTransfer) {
      const updated: Employee = { ...employee, departmentCd: form.toDeptCd };
      store.saveEmployee(updated);
    }

    refresh();
    onClose();
  };

  return (
    <Modal
      open={open}
      title={editingTransfer ? '異動履歴編集' : '異動履歴追加'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave}>保存</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="異動日" required error={errors.transferDate}>
          <Input type="date" value={form.transferDate} onChange={(v) => set('transferDate', v)} />
        </FormField>
        <div className="hidden md:block" />
        <FormField label="異動元部署">
          <Select
            value={form.fromDeptCd ?? ''}
            onChange={(v) => set('fromDeptCd', v || null)}
            options={deptOptions}
            placeholder="なし（新規配属）"
          />
        </FormField>
        <FormField label="異動先部署" required error={errors.toDeptCd}>
          <Select
            value={form.toDeptCd ?? ''}
            onChange={(v) => set('toDeptCd', v || null)}
            options={deptOptions}
          />
        </FormField>
        <FormField label="備考" className="md:col-span-2">
          <Textarea value={form.memo} onChange={(v) => set('memo', v)} rows={2} />
        </FormField>
      </div>
      {!editingTransfer && (
        <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded p-2">
          異動を登録すると、従業員の現在の部署も同時に更新されます。
        </p>
      )}
    </Modal>
  );
}
