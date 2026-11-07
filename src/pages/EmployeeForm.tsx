// Employee new/edit form modal.

import { useState, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { Button, Input, Select, Textarea, FormField, Modal } from '@/components/ui';
import { validateEmployeeNumber, validateRetireDate } from '@/utils/employeeUtils';
import { calculateAge } from '@/utils/dateUtils';
import type { Employee } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  editingEmployee: Employee | null;
  onSaved: (id: string) => void;
  candidateId?: string;
  initialEmployee?: Partial<Employee>;
}

const emptyEmployee: Employee = {
  id: '',
  employeeNumber: '',
  name: '',
  kana: '',
  hireDate: '',
  retireDate: null,
  retireReasonCd: null,
  internalPositionCd: null,
  billingPositionCd: null,
  roleCd: null,
  departmentCd: null,
  dispatchCompanyCd: null,
  memo: '',
};

export function EmployeeForm({ open, onClose, editingEmployee, onSaved, candidateId, initialEmployee }: Props) {
  const { store, data, refresh } = useStore();
  const [form, setForm] = useState<Employee>(emptyEmployee);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(editingEmployee ? { ...editingEmployee } : { ...emptyEmployee, ...initialEmployee });
      setErrors({});
    }
  }, [open, editingEmployee, initialEmployee]);

  const set = <K extends keyof Employee>(key: K, value: Employee[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const masterOptions = (key: 'internalPositions' | 'billingPositions' | 'roles' | 'departments' | 'retireReasons' | 'dispatchCompanies') =>
    data.masters[key].filter((m) => m.active).map((m) => ({ value: m.cd, label: m.name }));

  const handleSave = () => {
    const errs: Record<string, string> = {};
    const empNumErr = validateEmployeeNumber(form.employeeNumber, data.employees, form.id);
    if (empNumErr) errs.employeeNumber = empNumErr;
    if (!form.name.trim()) errs.name = '氏名を入力してください。';
    if (!form.kana.trim()) errs.kana = 'カナを入力してください。';
    if (!form.hireDate) errs.hireDate = '入社日を入力してください。';

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'メールアドレスを確認してください。';
    if (form.birthDate && calculateAge(form.birthDate) === null) errs.birthDate = '今日以前の有効な生年月日を入力してください。';
    if (form.retireDate) {
      const retireErr = validateRetireDate(form.hireDate, form.retireDate);
      if (retireErr) errs.retireDate = retireErr;
      if (!form.retireReasonCd) errs.retireReasonCd = '退職理由を選択してください。';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const toSave: Employee = {
      ...form,
      employeeNumber: form.employeeNumber.trim(),
      name: form.name.trim(),
      kana: form.kana.trim(),
      memo: form.memo,
    };
    try {
      if (candidateId) toSave.id = store.convertCandidate(candidateId, toSave);
      else store.saveEmployee(toSave);
      refresh();
      onSaved(toSave.id);
    } catch (error) {
      setErrors({ save: error instanceof Error ? error.message : '保存できませんでした。' });
    }
  };

  return (
    <Modal
      open={open}
      title={editingEmployee ? '従業員編集' : '従業員新規登録'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave}>保存</Button>
        </>
      }
    >
      {errors.save && <p role="alert" className="text-red-700 mb-4">{errors.save}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="社員番号" required error={errors.employeeNumber}>
          <Input value={form.employeeNumber} onChange={(v) => set('employeeNumber', v)} placeholder="例: 10001" />
        </FormField>
        <FormField label="氏名" required error={errors.name}>
          <Input value={form.name} onChange={(v) => set('name', v)} placeholder="例: 佐藤 健太" />
        </FormField>
        <FormField label="カナ" required error={errors.kana}>
          <Input value={form.kana} onChange={(v) => set('kana', v)} placeholder="例: サトウ ケンタ" />
        </FormField>
        <FormField label="電話番号" hint="先頭の0を保持して保存します。"><Input value={form.phone ?? ''} onChange={v => set('phone', v)} placeholder="例：090-0000-0000" /></FormField>
        <FormField label="メールアドレス" error={errors.email} hint="登録のみです。安否確認メールは送信しません。"><Input value={form.email ?? ''} onChange={v => set('email', v)} placeholder="例：demo@example.com" /></FormField>
        <FormField label="郵便番号"><Input value={form.postalCode ?? ''} onChange={v => set('postalCode', v)} placeholder="例：000-0000" /></FormField>
        <FormField label="住所（都道府県・市区町村・番地）"><Input value={form.address ?? ''} onChange={v => set('address', v)} /></FormField>
        <FormField label="建物名・部屋番号"><Input value={form.building ?? ''} onChange={v => set('building', v)} /></FormField>
        <FormField label="生年月日" error={errors.birthDate}><Input type="date" value={form.birthDate ?? ''} onChange={v => set('birthDate', v)} /></FormField>
        <FormField label="年齢（今日時点）"><p className="py-2">{calculateAge(form.birthDate) === null ? '—' : `${calculateAge(form.birthDate)}歳`}</p></FormField>
        <FormField label="性別（任意）"><Select value={form.gender ?? ''} onChange={v => set('gender', v)} placeholder="未回答" options={['男性','女性','その他','回答しない'].map(v => ({value:v,label:v}))} /></FormField>
        <FormField label="入社日" required error={errors.hireDate}>
          <Input type="date" value={form.hireDate} onChange={(v) => set('hireDate', v)} />
        </FormField>
        <FormField label="退職日" error={errors.retireDate} hint="退職日は最終在籍日として扱います。空欄は在籍中を意味します。">
          <Input type="date" value={form.retireDate ?? ''} onChange={(v) => set('retireDate', v || null)} />
        </FormField>
        <FormField label="退職理由" error={errors.retireReasonCd}>
          <Select
            value={form.retireReasonCd ?? ''}
            onChange={(v) => set('retireReasonCd', v || null)}
            options={masterOptions('retireReasons')}
            placeholder="退職日を入力した場合に選択"
          />
        </FormField>
        <FormField label="社内職位">
          <Select value={form.internalPositionCd ?? ''} onChange={(v) => set('internalPositionCd', v || null)} options={masterOptions('internalPositions')} />
        </FormField>
        <FormField label="請求職位">
          <Select value={form.billingPositionCd ?? ''} onChange={(v) => set('billingPositionCd', v || null)} options={masterOptions('billingPositions')} />
        </FormField>
        <FormField label="役割区分">
          <Select value={form.roleCd ?? ''} onChange={(v) => set('roleCd', v || null)} options={masterOptions('roles')} />
        </FormField>
        <FormField label="部署">
          <Select value={form.departmentCd ?? ''} onChange={(v) => set('departmentCd', v || null)} options={masterOptions('departments')} />
        </FormField>
        <FormField label="受け入れ派遣会社">
          <Select value={form.dispatchCompanyCd ?? ''} onChange={(v) => set('dispatchCompanyCd', v || null)} options={masterOptions('dispatchCompanies')} placeholder="なし" />
        </FormField>
        <div className="md:col-span-2 border-t pt-4 mt-2"><h3 className="font-semibold text-slate-800">保証人情報（任意）</h3><p className="text-xs text-slate-500 mt-1">入社手続きで受領した情報を記録します。緊急連絡先とは別の情報です。デモでは架空情報のみ入力してください。</p></div>
        <FormField label="保証人氏名"><Input value={form.guarantorName ?? ''} onChange={v => set('guarantorName', v)} /></FormField>
        <FormField label="本人との関係"><Input value={form.guarantorRelationship ?? ''} onChange={v => set('guarantorRelationship', v)} placeholder="例：親、配偶者、兄弟姉妹" /></FormField>
        <FormField label="保証人電話番号"><Input value={form.guarantorPhone ?? ''} onChange={v => set('guarantorPhone', v)} /></FormField>
        <FormField label="保証人郵便番号"><Input value={form.guarantorPostalCode ?? ''} onChange={v => set('guarantorPostalCode', v)} /></FormField>
        <FormField label="保証人住所"><Input value={form.guarantorAddress ?? ''} onChange={v => set('guarantorAddress', v)} /></FormField>
        <FormField label="保証人建物名・部屋番号"><Input value={form.guarantorBuilding ?? ''} onChange={v => set('guarantorBuilding', v)} /></FormField>
        <FormField label="提出書類の種類"><Input value={form.guarantorDocumentType ?? ''} onChange={v => set('guarantorDocumentType', v)} placeholder="例：契約書、誓約書" /></FormField>
        <FormField label="書類受領日"><Input type="date" value={form.guarantorReceivedDate ?? ''} onChange={v => set('guarantorReceivedDate', v)} /></FormField>
        <FormField label="メモ" className="md:col-span-2">
          <Textarea value={form.memo} onChange={(v) => set('memo', v)} rows={2} placeholder="特記事項があれば入力" />
        </FormField>
      </div>
    </Modal>
  );
}
