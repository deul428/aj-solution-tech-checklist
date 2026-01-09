
import React, { useState, useCallback, useRef } from 'react';
import { FileUp, Search, Download, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { MasterDataRow, ChecklistData, MASTER_COLUMNS } from './types';
import { parseMasterExcel, downloadChecklistExcel } from './services/excelService';
import ChecklistPreview from './components/ChecklistPreview';

const App: React.FC = () => {
  const [masterData, setMasterData] = useState<MasterDataRow[]>([]);
  const [mgmtNumber, setMgmtNumber] = useState('');
  const [currentChecklist, setCurrentChecklist] = useState<ChecklistData | null>(null);
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
    setCurrentChecklist(null);
    setMgmtNumber('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSearch = () => {
    if (!masterData.length) {
      alert('먼저 마스터 엑셀 파일을 업로드해주세요.');
      return;
    }
    const targetMgmt = mgmtNumber.trim();
    if (!targetMgmt) {
      alert('관리번호를 입력해주세요.');
      return;
    }

    // Find exact match
    const foundRow = masterData.find(row =>
      String(row[MASTER_COLUMNS.MGMT_NO] || '').trim() === targetMgmt
    );

    if (!foundRow) {
      setWarnText('입력하신 관리번호와 일치하는 행이 마스터 파일 내에 없습니다.');
      // alert('입력하신 관리번호와 일치하는 행이 마스터 파일 내에 없습니다.');
      setCurrentChecklist(null);
      return;
    }

    // Map master row to ChecklistData
    const checklist: ChecklistData = {
      mgmtNumber: targetMgmt,
      productCode: String(foundRow[MASTER_COLUMNS.PROD_NO] || ''),
      productName: String(foundRow[MASTER_COLUMNS.PROD_NAME] || ''),
      manufacturer: String(foundRow[MASTER_COLUMNS.MANUFACTURER] || ''),
      model: String(foundRow[MASTER_COLUMNS.MODEL_NAME] || ''),
      year: String(foundRow[MASTER_COLUMNS.PROD_YEAR] || ''),
      usageTime: '', // Always empty per requirement
      assetNumber: String(foundRow[MASTER_COLUMNS.ASSET_NO] || ''),
      vehicleNumber: String(foundRow[MASTER_COLUMNS.VEHICLE_NO] || ''),
      serialNumber: String(foundRow[MASTER_COLUMNS.SERIAL_NO] || ''),
    };

    setCurrentChecklist(checklist);
    setWarnText('')
  };

  const handleExport = () => {
    if (!currentChecklist) return;
    const downloadName = `Checklist_${currentChecklist.mgmtNumber}.xlsx`;
    downloadChecklistExcel(currentChecklist, downloadName);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 bg-gray-100">
      <header className="max-w-5xl w-full mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-blue-900 mb-2">자산 체크리스트 생성 도구</h1>
        <p className="text-gray-600">마스터 데이터를 조회하여 공식 양식의 체크리스트를 생성합니다.</p>
      </header>

      <main className="max-w-5xl w-full space-y-8">
        {/* Step 1: Master File Upload */}
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
                <p className="text-green-700 text-sm">{masterData.length}개의 행이 로드됨</p>
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Search */}
        <section className={`bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-opacity ${!masterData.length ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800 mb-4">
            <Search className="w-5 h-5 text-blue-600" />
            2. 관리번호 입력
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={mgmtNumber}
              onChange={(e) => setMgmtNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="관리번호를 입력하세요 (예: 851BX198)"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-lg shadow-md transition-all flex items-center gap-2"
            >
              조회
            </button>
          </div>
          <div>{warnText}</div>
        </section>

        {/* Result Area */}
        {currentChecklist && (
          <section className="animate-in fade-in duration-300">
            <ChecklistPreview data={currentChecklist} />

            <div className="flex justify-center mt-6">
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-12 rounded-lg shadow-lg flex items-center gap-3 transform hover:scale-105 transition-all"
              >
                <Download className="w-6 h-6" /> 엑셀 파일 생성 및 다운로드
              </button>
            </div>
          </section>
        )}
      </main>
    </div >
  );
};

export default App;
