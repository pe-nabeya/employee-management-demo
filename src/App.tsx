// Employee Management Web App — main entry point.
// Japanese UI, demo data only, no backend required.

import { useState, useMemo } from 'react';
import { Users, FileOutput, Settings, RotateCcw, Info, Building2 } from 'lucide-react';
import { StoreProvider, useStore } from '@/store/StoreContext';
import { Recruitment } from '@/pages/Recruitment';
import { EmployeeList } from '@/pages/EmployeeList';
import { EmployeeDetail } from '@/pages/EmployeeDetail';
import { EmployeeForm } from '@/pages/EmployeeForm';
import { DataExport } from '@/pages/DataExport';
import { MasterManagement } from '@/pages/MasterManagement';
import { Button, Modal, Input, Badge } from '@/components/ui';
import { today, formatDateJP } from '@/utils/dateUtils';
import { getStatus, statusLabel } from '@/utils/employeeUtils';
import type { Employee } from '@/types';

type Page = 'list' | 'detail' | 'export' | 'masters' | 'recruitment';

function AppContent() {
  const { data, resetData } = useStore();
  const [page, setPage] = useState<Page>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refDate, setRefDate] = useState(today());
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const navItems: { key: Page; label: string; icon: typeof Users }[] = [
    { key: 'recruitment', label: '採用管理', icon: Users },
    { key: 'list', label: '従業員一覧', icon: Users },
    { key: 'export', label: 'データ出力', icon: FileOutput },
    { key: 'masters', label: 'マスタ管理', icon: Settings },
  ];

  const activeCount = useMemo(
    () => data.employees.filter((e) => getStatus(e, refDate) === 'active').length,
    [data.employees, refDate],
  );

  const openDetail = (id: string) => {
    setSelectedId(id);
    setPage('detail');
  };

  const openNewForm = () => {
    setEditingEmployee(null);
    setFormOpen(true);
  };

  const openEditForm = () => {
    if (selectedId) {
      const emp = data.employees.find((e) => e.id === selectedId);
      if (emp) {
        setEditingEmployee(emp);
        setFormOpen(true);
      }
    }
  };

  const handleFormSaved = (id: string) => {
    setFormOpen(false);
    openDetail(id);
  };

  const handleReset = () => {
    resetData();
    setResetConfirmOpen(false);
    setPage('list');
    setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-slate-300" />
              <h1 className="text-base font-semibold">従業員管理システム</h1>
              <Badge variant="default">デモ版</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-300">基準日:</label>
                <input
                  type="date"
                  value={refDate}
                  onChange={(e) => setRefDate(e.target.value)}
                  className="bg-slate-700 text-white text-xs rounded border border-slate-600 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <button
                onClick={() => setShowInfo(true)}
                className="text-slate-300 hover:text-white"
                title="システム情報"
              >
                <Info className="w-5 h-5" />
              </button>
              <Button variant="secondary" size="sm" onClick={() => setResetConfirmOpen(true)}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                初期状態に戻す
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Nav tabs (only show for list/export/masters, not detail) */}
      {page !== 'detail' && (
        <nav className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setPage(item.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    page === item.key
                      ? 'border-slate-700 text-slate-800'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {page === 'list' && (
          <EmployeeList
            onOpenDetail={openDetail}
            onNewEmployee={openNewForm}
            refDate={refDate}
          />
        )}
        {page === 'detail' && selectedId && (
          <EmployeeDetail
            employeeId={selectedId}
            refDate={refDate}
            onBack={() => { setPage('list'); setSelectedId(null); }}
            onEdit={openEditForm}
          />
        )}
        {page === 'recruitment' && <Recruitment onOpenEmployee={openDetail} />}
        {page === 'export' && <DataExport />}
        {page === 'masters' && <MasterManagement />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            在籍者: <strong className="text-slate-700">{activeCount}</strong>名 / 全<strong className="text-slate-700">{data.employees.length}</strong>名
            （基準日 {formatDateJP(refDate)}）
          </p>
          <p className="text-xs text-slate-400">従業員管理システム デモ版 — 架空データのみ使用</p>
        </div>
      </footer>

      {/* Employee form modal */}
      <EmployeeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingEmployee={editingEmployee}
        onSaved={handleFormSaved}
      />

      {/* Reset confirmation */}
      <Modal
        open={resetConfirmOpen}
        title="初期状態に戻す"
        onClose={() => setResetConfirmOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetConfirmOpen(false)}>キャンセル</Button>
            <Button variant="danger" onClick={handleReset}>初期状態に戻す</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          すべてのデータ（採用候補者・従業員・契約・異動・マスタ）が初期デモデータに戻ります。現在の編集内容は失われます。よろしいですか？
        </p>
      </Modal>

      {/* System info modal */}
      <Modal
        open={showInfo}
        title="システム情報"
        onClose={() => setShowInfo(false)}
        size="md"
        footer={<Button onClick={() => setShowInfo(false)}>閉じる</Button>}
      >
        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">このアプリについて</h3>
            <p>既存のAccess業務DBをWeb化したポートフォリオ用デモです。すべてのデータは架空であり、実際の個人情報は入力しないでください。</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">実装済み機能</h3>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>採用候補者の登録・選考管理・内定承諾後の従業員登録</li>
              <li>従業員一覧（検索・絞り込み・ページ切り替え）</li>
              <li>従業員の新規登録・編集・削除</li>
              <li>従業員詳細（基本情報・契約履歴・異動履歴のタブ表示）</li>
              <li>契約履歴の追加・編集・削除（期間重複チェック）</li>
              <li>契約履歴の休日区分・休日詳細・契約書用職区分（組み合わせ制限あり）</li>
              <li>異動履歴の追加・編集・削除（現在部署の自動更新）</li>
              <li>基準日指定による在籍状態の判定</li>
              <li>データ出力（在籍者・入社者・退職者・契約データ・Word契約書用CSV）</li>
              <li>出力プレビュー（対象者・件数・列名の確認）</li>
              <li>マスタ管理（9種類のマスタの追加・編集・無効化・削除）</li>
              <li>初期状態へのリセット機能</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">未実装機能（次の段階で追加予定）</h3>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>Word文書そのものの生成</li>
              <li>給与計算・勤怠集計</li>
              <li>請求書作成</li>
              <li>実在データの取り込み</li>
              <li>派遣契約書専用出力・請求明細用出力</li>
              <li>バックエンドデータベース接続（現在はブラウザ保存）</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">データ保存について</h3>
            <p className="text-slate-600">デモデータはブラウザのlocalStorageに保存されます。データアクセス処理は画面から分離されており、後でデータベースへ置き換えやすい構造になっています。</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
