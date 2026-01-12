
import React, { useState, useRef } from 'react';
import { FileUp, Search, Download, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { MasterDataRow, ChecklistData, MASTER_COLUMNS } from './types';
import { parseMasterExcel, downloadChecklistExcel } from './services/excelService';
import ChecklistPreview from './components/ChecklistPreview';

const App: React.FC = () => {
  const [masterData, setMasterData] = useState<MasterDataRow[]>([]);
  const [mgmtNumbersInput, setMgmtNumbersInput] = useState('');
  const [currentChecklists, setCurrentChecklists] = useState<ChecklistData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [warnText, setWarnText] = useState<string | null>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const data = await parseMasterExcel(file);
      setMasterData(data);
      setFileName(file.name);
      alert('마스터 파일을 성공적으로 불러왔습니다.');
    } catch (error) {
      console.error(error);
      alert('파일을 읽는 도중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearMasterData = () => {
    setMasterData([]);
    setFileName(null);
    setCurrentChecklists([]);
    setMgmtNumbersInput('');
    setWarnText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSearch = () => {
    if (!masterData.length) {
      alert('먼저 마스터 엑셀 파일을 업로드해주세요.');
      return;
    }

    const targetMgmts = mgmtNumbersInput.split(/\s+/).filter(Boolean);
    if (!targetMgmts.length) {
      alert('관리번호를 하나 이상 입력해주세요.');
      return;
    }

    const foundChecklists: ChecklistData[] = [];
    const missingMgmts: string[] = [];

    targetMgmts.forEach(mgmt => {
      const trimmedMgmt = mgmt.trim();
      const foundRow = masterData.find(row =>
        String(row[MASTER_COLUMNS.MGMT_NO] || '').trim() === trimmedMgmt
      );

      if (foundRow) {
        // 장비상태 로직: A가 포함되면 물류, B가 포함되면 건설
        const status = String(foundRow[MASTER_COLUMNS.EQUIP_STATUS] || '');
        let category: '물류' | '건설' | null = null;
        if (status.includes('A')) category = '물류';
        else if (status.includes('B')) category = '건설';

        foundChecklists.push({
          mgmtNumber: trimmedMgmt,
          productCode: String(foundRow[MASTER_COLUMNS.PROD_NO] || ''),
          productName: String(foundRow[MASTER_COLUMNS.PROD_NAME] || ''),
          manufacturer: String(foundRow[MASTER_COLUMNS.MANUFACTURER] || ''),
          model: String(foundRow[MASTER_COLUMNS.MODEL_NAME] || ''),
          year: String(foundRow[MASTER_COLUMNS.PROD_YEAR] || ''),
          usageTime: '',
          assetNumber: String(foundRow[MASTER_COLUMNS.ASSET_NO] || ''),
          vehicleNumber: String(foundRow[MASTER_COLUMNS.VEHICLE_NO] || ''),
          serialNumber: String(foundRow[MASTER_COLUMNS.SERIAL_NO] || ''),
          category: category
        });
      } else {
        missingMgmts.push(trimmedMgmt);
      }
    });

    setCurrentChecklists(foundChecklists);
    
    if (missingMgmts.length > 0) {
      setWarnText(`다음 번호를 찾을 수 없습니다: ${missingMgmts.join(', ')}`);
    } else {
      setWarnText('');
    }
  };

  const handleExport = () => {
    if (currentChecklists.length === 0) return;
    const downloadName = currentChecklists.length === 1 
      ? `Checklist_${currentChecklists[0].mgmtNumber}.xlsx`
      : `Checklists_Batch_${currentChecklists.length}pcs.xlsx`;
    
    downloadChecklistExcel(currentChecklists, downloadName);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 bg-gray-100">
      <header className="max-w-5xl w-full mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-blue-900 mb-2">정비 체크리스트 QR 일괄 생성 봇</h1>
        <p className="text-gray-600">여러 개의 관리번호를 공백으로 구분해 입력하면 일괄 생성이 가능합니다.</p>
      </header>

      <main className="max-w-5xl w-full space-y-8">
        <section className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
              <FileUp className="w-5 h-5 text-blue-600" />
              1. 마스터 파일 업로드
            </h2>
            {masterData.length > 0 && (
              <button
                onClick={clearMasterData}
                className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 초기화
              </button>
            )}
          </div>

          {!fileName ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="w-10 h-10 text-gray-400 mb-2" />
              <p className="text-gray-600 font-medium">Excel 마스터 파일을 선택하세요</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-green-50 p-4 rounded-lg border border-green-100">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <div className="flex-1">
                <p className="text-green-900 font-semibold">{fileName}</p>
                <p className="text-green-700 text-sm">{masterData.length.toLocaleString()}개의 행이 로드됨</p>
              </div>
            </div>
          )}
        </section>

        <section className={`bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-opacity ${!masterData.length ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800 mb-4">
            <Search className="w-5 h-5 text-blue-600" />
            2. 관리번호 입력 (공백으로 구분)
          </h2>
          <div className="flex flex-col gap-3">
            <textarea
              value={mgmtNumbersInput}
              onChange={(e) => setMgmtNumbersInput(e.target.value)}
              placeholder="여러 개의 관리번호를 공백이나 줄바꿈으로 구분해 입력하세요.&#10;(예: 851BX198 900CX200)"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
            <button
              onClick={handleSearch}
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-10 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" /> 일괄 조회
            </button>
          </div>
          {warnText && (
            <div className="mt-3 flex items-center gap-2 text-red-600 text-sm font-medium">
              <AlertCircle className="w-4 h-4" /> {warnText}
            </div>
          )}
        </section>

        {currentChecklists.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between mb-4 sticky top-4 z-10 bg-gray-100/80 backdrop-blur-sm p-2 rounded-lg">
              <h3 className="text-lg font-bold text-gray-800">조회 결과: {currentChecklists.length}건</h3>
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-3 transition-all"
              >
                <Download className="w-5 h-5" /> {currentChecklists.length}건 일괄 다운로드
              </button>
            </div>
            
            <div className="space-y-12">
              {currentChecklists.map((checklist, idx) => (
                <div key={`${checklist.mgmtNumber}-${idx}`}>
                  <ChecklistPreview data={checklist} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div >
  );
};

export default App;
