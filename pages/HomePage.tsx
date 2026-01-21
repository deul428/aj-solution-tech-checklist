
import React, { useRef, useState } from "react";
import { FileUp, Trash2, CheckCircle2, ArrowRight, Database, ClipboardCheck, ScanQrCode } from "lucide-react";
import { MasterDataRow } from "../types";
import { parseMasterExcel } from "../services/excelService";
import LoadingOverlay from "../components/LoadingOverlay";

interface HomePageProps {
  masterData: MasterDataRow[];
  setMasterData: React.Dispatch<React.SetStateAction<MasterDataRow[]>>;
  fileName: string | null;
  setFileName: React.Dispatch<React.SetStateAction<string | null>>;
  onNavigate: (view: "checklist" | "audit") => void;
}

const HomePage: React.FC<HomePageProps> = ({ 
  masterData, 
  setMasterData, 
  fileName, 
  setFileName,
  onNavigate 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const data = await parseMasterExcel(file);
      setMasterData(data);
      setFileName(file.name);
    } catch (error) {
      console.error(error);
      alert("파일을 읽는 도중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearMasterData = () => {
    setMasterData([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {isProcessing && <LoadingOverlay message="마스터 데이터 업로드 및 분석 중..." />}
      
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">AJ솔루션테크 자산관리 통합 플랫폼</h2>
        <p className="text-lg text-gray-600 font-medium">효율적인 자산 관리를 위해 마스터 데이터를 업로드해 주세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" /> 데이터베이스 구축
            </h3>
            {masterData.length > 0 && (
              <button onClick={clearMasterData} className="text-red-500 hover:text-red-600 text-sm font-bold flex items-center gap-1 transition-all">
                <Trash2 className="w-4 h-4" /> 데이터 초기화
              </button>
            )}
          </div>

          {!fileName ? (
            <div 
              className={`flex-1 border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="w-12 h-12 text-blue-400 mb-4" />
              <p className="text-gray-600 font-bold mb-1">마스터 엑셀 파일 업로드</p>
              <p className="text-gray-400 text-xs text-center leading-relaxed">장비 정보가 담긴 엑셀 파일을<br/>여기에 드래그하거나 클릭하세요.</p>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center bg-green-50 rounded-xl p-8 border border-green-100">
              <div className="bg-green-500 p-3 rounded-full mb-4 shadow-lg shadow-green-200">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-green-900 font-black text-lg mb-1 truncate max-w-full">{fileName}</h4>
              <p className="text-green-700 font-bold">{masterData.length.toLocaleString()}건 로드 완료</p>
            </div>
          )}
        </div>

        {/* Quick Access Section */}
        <div className="space-y-6 flex flex-col h-full">
          <div 
            onClick={() => onNavigate("checklist")}
            className={`p-8 rounded-2xl bg-white shadow-lg border border-gray-100 cursor-pointer group hover:shadow-2xl transition-all flex-1 flex flex-col justify-center ${!masterData.length ? 'opacity-50 grayscale pointer-events-none' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-600 transition-colors">
                <ClipboardCheck className="w-8 h-8 text-blue-600 group-hover:text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">체크리스트 자동 생성</h3>
            <p className="text-gray-500 text-sm leading-relaxed font-medium text-pretty">관리번호를 입력하여 QR코드가 포함된 정비 체크리스트를 즉시 생성하고 클라우드에 등록합니다.</p>
          </div>

          <div 
            onClick={() => onNavigate("audit")}
            className={`p-8 rounded-2xl bg-white shadow-lg border border-gray-100 cursor-pointer group hover:shadow-2xl transition-all flex-1 flex flex-col justify-center ${!masterData.length ? 'opacity-50 grayscale pointer-events-none' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-600 transition-colors">
                <ScanQrCode className="w-8 h-8 text-purple-600 group-hover:text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">실시간 자산 실사</h3>
            <p className="text-gray-500 text-sm leading-relaxed font-medium text-pretty">카메라로 QR을 스캔하여 현장에서 즉시 자산 정보를 확인하고 실사 기록을 실시간으로 동기화합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
