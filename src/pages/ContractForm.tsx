// Contract add/edit form modal.

import { useState, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { Button, Input, Select, Textarea, FormField, Modal } from '@/components/ui';
import { validateContractPeriod, validateJobPositionHolidayCombo, isHolidayAllowed, HOLIDAY_DEFAULT_DETAILS } from '@/utils/employeeUtils';
import type { Contract } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  editingContract: Contract | null;
  copyFrom?: Contract | null;
}

const emptyContract: Contract = {
  id: '',
  employeeId: '',
  applyStart: '',
  applyEnd: null,
  hourlyRate: 0,
  allowance: 0,
  allowanceDesc: '',
  contractTypeCd: null,
  contractDetail: '',
  contractMemo: '',
  transportExpense: 0,
  transportUnit: '月額',
  transportMethod: '',
  holidayTypeCd: null,
  holidayDetail: '',
  contractJobPositionCd: null,
};

export function ContractForm({ open, onClose, employeeId, editingContract, copyFrom }: Props) {
  const { store, data, refresh } = useStore();
  const [form, setForm] = useState<Contract>(emptyContract);
  const [closePrevious, setClosePrevious] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(editingContract ? { ...editingContract } : copyFrom ? { ...copyFrom, id: '', applyStart: '', applyEnd: null } : { ...emptyContract, employeeId });
      setClosePrevious(false);
      setErrors({});
    }
  }, [open, editingContract, employeeId, copyFrom]);

  const set = <K extends keyof Contract>(key: K, value: Contract[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const contractTypeOptions = data.masters.contractTypes
    .filter((m) => m.active)
    .map((m) => ({ value: m.cd, label: m.name }));

  const holidayTypeOptions = data.masters.holidayTypes
    .filter((m) => m.active)
    .map((m) => ({ value: m.cd, label: m.name }));

  const contractJobPosOptions = data.masters.contractJobPositions
    .filter((m) => m.active)
    .map((m) => ({ value: m.cd, label: m.name }));

  // Filter holiday options based on selected contract job position
  const filteredHolidayOptions = contractJobPosOptions.length > 0 && form.contractJobPositionCd
    ? holidayTypeOptions.filter((o) => isHolidayAllowed(form.contractJobPositionCd, o.value))
    : holidayTypeOptions;

  const handleHolidayTypeChange = (cd: string) => {
    const desc = HOLIDAY_DEFAULT_DETAILS[cd] ?? '';
    // Only auto-fill if holidayDetail is empty or matches a previous default
    const wasDefault = Object.values(HOLIDAY_DEFAULT_DETAILS).includes(form.holidayDetail);
    setForm((f) => ({
      ...f,
      holidayTypeCd: cd || null,
      holidayDetail: wasDefault || !f.holidayDetail ? desc : f.holidayDetail,
    }));
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.applyStart) errs.applyStart = '適用開始日を入力してください。';
    if (form.applyEnd && form.applyEnd < form.applyStart) {
      errs.applyEnd = '適用終了日は適用開始日以降にしてください。';
    }
    if (form.hourlyRate < 0) errs.hourlyRate = '時給は0以上の数値を入力してください。';
    if (form.allowance < 0) errs.allowance = '手当額は0以上の数値を入力してください。';
    if (form.transportExpense < 0) errs.transportExpense = '交通費額は0以上の数値を入力してください。';

    const checkedContracts = closePrevious && copyFrom && !copyFrom.applyEnd && form.applyStart > copyFrom.applyStart
      ? data.contracts.filter(c => c.id !== copyFrom.id) : data.contracts;
    const overlapErr = validateContractPeriod(checkedContracts, form, form.id);
    if (overlapErr) errs.applyStart = overlapErr;

    const comboErr = validateJobPositionHolidayCombo(form.contractJobPositionCd, form.holidayTypeCd);
    if (comboErr) errs.holidayTypeCd = comboErr;

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      if (copyFrom && !editingContract) store.renewContract({ ...form }, closePrevious && !copyFrom.applyEnd ? copyFrom.id : null);
      else store.saveContract({ ...form });
      refresh();
      onClose();
    } catch (e) { setErrors({ save: e instanceof Error ? e.message : '保存できませんでした。' }); }
  };

  return (
    <Modal
      open={open}
      title={editingContract ? '契約履歴編集' : copyFrom ? '前回の契約をコピーして更新' : '契約履歴追加'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave}>保存</Button>
        </>
      }
    >
      {errors.save && <p role="alert" className="text-red-700 mb-3">{errors.save}</p>}
      {copyFrom && <div className="bg-amber-50 p-3 mb-4 text-sm rounded">
        <p>前回の時給・手当などをコピーしています。新しい期間を指定し、変更する金額だけ修正してください。変更しない場合は同額で保存します。</p>
        {!copyFrom.applyEnd && <label className="flex gap-2 mt-3"><input type="checkbox" checked={closePrevious} onChange={e => setClosePrevious(e.target.checked)} />旧契約（開始 {copyFrom.applyStart}）の終了日を、新契約開始日の前日に変更して保存する</label>}
        {closePrevious && form.applyStart && <p className="mt-2">保存すると旧契約の期間も変更します。キャンセルした場合は変更しません。</p>}
      </div>}
      {form.contractJobPositionCd === 'D' && <p className="bg-blue-50 text-blue-900 p-3 mb-4 text-sm">D職は期間の定めのない雇用です。下の適用開始・終了日は時給・手当等の条件履歴の管理用で、雇用の終了日ではありません。Word契約書用CSVでは契約開始日・終了日を空欄にします。</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="適用開始日" required error={errors.applyStart}>
          <Input type="date" value={form.applyStart} onChange={(v) => set('applyStart', v)} />
        </FormField>
        <FormField label="適用終了日" error={errors.applyEnd} hint="空欄は現在進行中の契約を意味します。">
          <Input type="date" value={form.applyEnd ?? ''} onChange={(v) => set('applyEnd', v || null)} />
        </FormField>
        <FormField label="時給（円）" required error={errors.hourlyRate}>
          <Input type="number" value={String(form.hourlyRate)} onChange={(v) => set('hourlyRate', Number(v) || 0)} />
        </FormField>
        <FormField label="契約形態">
          <Select value={form.contractTypeCd ?? ''} onChange={(v) => set('contractTypeCd', v || null)} options={contractTypeOptions} />
        </FormField>
        <FormField label="手当額（円）" error={errors.allowance}>
          <Input type="number" value={String(form.allowance)} onChange={(v) => set('allowance', Number(v) || 0)} />
        </FormField>
        <FormField label="手当の内容・単位">
          <Input value={form.allowanceDesc} onChange={(v) => set('allowanceDesc', v)} placeholder="例: 役職手当 月額" />
        </FormField>
        <FormField label="交通費額（円）" error={errors.transportExpense}>
          <Input type="number" value={String(form.transportExpense)} onChange={(v) => set('transportExpense', Number(v) || 0)} />
        </FormField>
        <FormField label="交通費の単位">
          <Input value={form.transportUnit} onChange={(v) => set('transportUnit', v)} placeholder="例: 月額" />
        </FormField>
        <FormField label="交通手段">
          <Input value={form.transportMethod} onChange={(v) => set('transportMethod', v)} placeholder="例: 電車" />
        </FormField>
        <FormField label="契約詳細">
          <Input value={form.contractDetail} onChange={(v) => set('contractDetail', v)} placeholder="例: 正社員 PL" />
        </FormField>
        <FormField label="契約書用職区分" hint="M職・H職・LD職・SV職・D職から選択します。D職は無期雇用です。">
          <Select value={form.contractJobPositionCd ?? ''} onChange={(v) => set('contractJobPositionCd', v || null)} options={contractJobPosOptions} placeholder="選択してください" />
        </FormField>
        <FormField label="休日区分" error={errors.holidayTypeCd} hint={form.contractJobPositionCd ? '選択中の職区分で選べる休日区分のみ表示します。' : undefined}>
          <Select value={form.holidayTypeCd ?? ''} onChange={(v) => handleHolidayTypeChange(v)} options={filteredHolidayOptions} placeholder="選択してください" />
        </FormField>
        <FormField label="休日詳細" className="md:col-span-2" hint="休日区分を選ぶと説明文が自動入力されます。個別に編集できます。">
          <Textarea value={form.holidayDetail} onChange={(v) => set('holidayDetail', v)} rows={2} placeholder="休日条件の詳細説明" />
        </FormField>
        <FormField label="契約備考" className="md:col-span-2">
          <Textarea value={form.contractMemo} onChange={(v) => set('contractMemo', v)} rows={2} />
        </FormField>
      </div>
    </Modal>
  );
}
