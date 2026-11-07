import { useMemo, useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { Button, Input, Select, Textarea, FormField, Modal, PageHeader, Badge } from '@/components/ui';
import { EmployeeForm } from './EmployeeForm';
import { CANDIDATE_STATUSES, type Candidate } from '@/types';
import { today, calculateAge } from '@/utils/dateUtils';

const blank = (): Candidate => ({ id: '', name: '', kana: '', email: '', phone: '', jobTitle: '', applicationDate: today(), interviewDate: '', status: '応募受付', plannedHireDate: '', nextActionDate: '', owner: '', memo: '', createdAt: '', updatedAt: '', employeeId: null });

export function Recruitment({ onOpenEmployee }: { onOpenEmployee: (id: string) => void }) {
  const { data, store, refresh } = useStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<Candidate | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [converting, setConverting] = useState<Candidate | null>(null);
  const [error, setError] = useState('');
  const candidate = data.candidates?.find(c => c.id === selected);
  const rows = (data.candidates ?? []).filter(c => (!status || c.status === status) && [c.name, c.kana, c.jobTitle].some(v => v.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const initialEmployee = useMemo(() => converting ? { name: converting.name, kana: converting.kana, hireDate: converting.plannedHireDate, birthDate: converting.birthDate ?? '', gender: converting.gender ?? '', email: converting.email, phone: converting.phone, postalCode: converting.postalCode ?? '', address: converting.address ?? '', building: converting.building ?? '' } : undefined, [converting]);
  const set = (key: keyof Candidate, value: string) => setForm(f => f ? { ...f, [key]: value } : f);
  const openEdit = (c: Candidate) => { setError(''); setForm({ ...c }); };
  const save = () => {
    if (!form) return;
    if (!form.name.trim() || !form.jobTitle.trim() || !form.applicationDate) { setError('氏名・応募職種・応募日を入力してください。'); return; }
    if (form.resultNotifiedDate && (calculateAge(form.resultNotifiedDate) === null)) { setError('合否連絡日は今日以前の有効な日付を入力してください。予定日は次の対応日に記録してください。'); return; }
    if (form.resultNotifiedDate && !form.decision) { setError('合否連絡日を入力する場合は判定を選択してください。'); return; }
    if (form.birthDate && calculateAge(form.birthDate) === null) { setError('生年月日は今日以前の有効な日付にしてください。'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('メールアドレスを確認してください。'); return; }
    try { store.saveCandidate({ ...form, name: form.name.trim(), jobTitle: form.jobTitle.trim() }); refresh(); setForm(null); }
    catch (e) { setError(e instanceof Error ? e.message : '保存できませんでした。'); }
  };
  const textFields: [keyof Candidate, string, boolean?][] = [['name', '氏名', true], ['kana', 'カナ'], ['jobTitle', '応募職種', true], ['email', 'メールアドレス'], ['phone', '電話番号'], ['postalCode', '郵便番号'], ['address', '住所（都道府県・市区町村・番地）'], ['building', '建物名・部屋番号'], ['owner', '担当者']];
  const dateFields: [keyof Candidate, string, boolean?][] = [['birthDate', '生年月日'], ['applicationDate', '応募日', true], ['interviewDate', '面談日'], ['plannedHireDate', '入社予定日'], ['nextActionDate', '次の対応日'], ['resultNotifiedDate', '合否連絡日']];
  return <>
    <PageHeader title="採用管理" subtitle="応募から内定承諾まで。候補者は従業員集計・契約書出力には含みません。" actions={<Button onClick={() => openEdit(blank())}>＋候補者登録</Button>} />
    <p className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">架空データ専用デモです。実際の個人情報・履歴書は入力しないでください。面談・選考メモは職務に必要な情報のみ記録します。</p>
    <div className="grid sm:grid-cols-2 gap-3 mb-4"><Input value={query} onChange={setQuery} placeholder="氏名・カナ・応募職種で検索" /><Select value={status} onChange={setStatus} placeholder="すべての選考状況" options={CANDIDATE_STATUSES.map(s => ({ value: s, label: s }))} /></div>
    <p className="text-sm text-slate-500 mb-3">候補者 {rows.length}件</p>
    <div className="bg-white border rounded-lg overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50"><tr>{['氏名・応募職種', '応募媒体', '状況・判定', '応募日', '面談日', '次の対応日', '担当者', '従業員登録'].map(h => <th key={h} className="p-3 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{rows.map(c => <tr key={c.id} className="border-t"><td className="p-3"><button className="font-semibold text-slate-800 underline" onClick={() => setSelected(c.id)}>{c.name}</button><div className="text-slate-500">{c.jobTitle}</div></td><td className="p-3">{c.applicationSource || '未設定'}<div className="text-xs text-slate-500">{c.applicationSourceNote}</div></td><td className="p-3"><Badge>{c.status}</Badge><div className="mt-1">判定：{c.decision || '未判定'}</div><div className="text-xs text-slate-500">合否連絡：{c.resultNotifiedDate || '未記録'}</div></td><td className="p-3 whitespace-nowrap">{c.applicationDate}</td><td className="p-3 whitespace-nowrap">{c.interviewDate || '—'}</td><td className="p-3 whitespace-nowrap">{c.nextActionDate || '—'}</td><td className="p-3">{c.owner || '—'}</td><td className="p-3">{c.employeeId ? '登録済み' : '未登録'}</td></tr>)}</tbody></table>{!rows.length && <p className="p-8 text-center text-slate-500">候補者はありません。「候補者登録」から架空の候補者を追加できます。</p>}</div>
    <Modal open={!!form} title={form?.id ? '候補者編集' : '候補者新規登録'} onClose={() => setForm(null)} size="lg" footer={<><Button variant="secondary" onClick={() => setForm(null)}>キャンセル</Button><Button onClick={save}>保存</Button></>}>
      {error && <p role="alert" className="text-red-700 mb-3">{error}</p>}
      {form && <div className="grid sm:grid-cols-2 gap-4">{textFields.map(([key, label, required]) => <FormField key={key} label={label} required={required}><Input value={String(form[key] ?? '')} onChange={v => set(key, v)} /></FormField>)}{dateFields.map(([key, label, required]) => <FormField key={key} label={label} required={required}><Input type="date" value={String(form[key] ?? '')} onChange={v => set(key, v)} /></FormField>)}<FormField label="年齢" hint="今日時点の満年齢です。保存せず自動計算します。"><p className="py-2">{calculateAge(form.birthDate) === null ? '未入力' : `${calculateAge(form.birthDate)}歳`}</p></FormField><FormField label="性別（任意）"><Select value={form.gender ?? ''} onChange={v => set('gender', v)} placeholder="未回答" options={['男性', '女性', 'その他', '回答しない'].map(v => ({value:v,label:v}))} /></FormField><FormField label="応募媒体"><Select value={form.applicationSource ?? ''} onChange={v => set('applicationSource', v)} placeholder="未設定" options={['紹介', 'Indeed', 'タウンワーク', '新聞', 'Webサイト', 'その他'].map(v => ({value:v,label:v}))} /></FormField><FormField label="媒体の補足" hint="紹介元・新聞名・サイト名など。必要な範囲で記録します。"><Input value={form.applicationSourceNote ?? ''} onChange={v => set('applicationSourceNote', v)} placeholder="例：自社ホームページ、○○新聞" /></FormField><FormField label="判定" hint="会社側の採否判定です。選考状況とは別に記録します。"><Select value={form.decision ?? ''} onChange={v => set('decision', v)} placeholder="未判定" options={['採用', '不採用'].map(v => ({value:v,label:v}))} /></FormField><FormField label="選考状況" required><Select value={form.status} onChange={v => set('status', v)} options={CANDIDATE_STATUSES.map(s => ({ value: s, label: s }))} /></FormField><FormField label="面談・選考メモ" className="sm:col-span-2" hint="本人の発言・確認事実と担当者の評価を分けて記録します。従業員へ自動転記しません。"><Textarea value={form.memo} onChange={v => set('memo', v)} rows={8} placeholder={'【本人の発言・確認事実】\n経験・スキル、希望する勤務曜日・時間、入社可能日など\n\n【本人の質問と回答】\n\n【担当者の評価と根拠】\n\n【未確認事項・次回確認】'} /></FormField></div>}
    </Modal>
    <Modal open={!!candidate} title="候補者詳細" onClose={() => setSelected(null)} footer={candidate && <><Button variant="secondary" onClick={() => { openEdit(candidate); setSelected(null); }}>編集</Button>{candidate.employeeId ? <Button disabled={!data.employees.some(e => e.id === candidate.employeeId)} onClick={() => { onOpenEmployee(candidate.employeeId!); setSelected(null); }}>登録先の従業員を開く</Button> : <Button disabled={candidate.status !== '内定承諾' || candidate.decision !== '採用'} onClick={() => { setConverting(candidate); setSelected(null); }}>従業員として登録</Button>}</>}>
      {candidate && <dl className="grid sm:grid-cols-2 gap-4 text-sm">{[...textFields, ...dateFields, ['applicationSource', '応募媒体'], ['applicationSourceNote', '媒体の補足'], ['decision', '判定'], ['gender', '性別'], ['status', '選考状況'], ['memo', '面談・選考メモ'], ['createdAt', '作成日時'], ['updatedAt', '更新日時']].map(([key, label]) => <div key={String(key)}><dt className="text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words mt-1">{String(candidate[key as keyof Candidate] || '—')}</dd></div>)}<div><dt className="text-slate-500">年齢（今日時点）</dt><dd>{calculateAge(candidate.birthDate) === null ? '—' : `${calculateAge(candidate.birthDate)}歳`}</dd></div><p className="sm:col-span-2 text-slate-500">判定「採用」かつ選考状況「内定承諾」の場合に、社員番号・入社日などを確認して登録できます。契約は自動作成しません。</p></dl>}
    </Modal>
    <EmployeeForm open={!!converting} onClose={() => setConverting(null)} editingEmployee={null} candidateId={converting?.id} initialEmployee={initialEmployee} onSaved={id => { setConverting(null); onOpenEmployee(id); }} />
  </>;
}

