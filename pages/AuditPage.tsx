
import React, { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  ScanQrCode, 
  CheckCircle, 
  History, 
  AlertCircle, 
  Package, 
  Tag, 
  User, 
  Calendar,
  XCircle,
  Undo2,
  CameraOff,
  Download,
  X,
  Clock
} from "lucide-react";
import { MasterDataRow, MASTER_COLUMNS, AUDIT_COLUMNS } from "../types";
import { exportMasterWithAudit } from "../services/excelService";

interface AuditPageProps {
  masterData: MasterDataRow[];
  setMasterData: React.Dispatch<React.SetStateAction<MasterDataRow[]>>;
}

const AuditPage: React.FC<AuditPageProps> = ({ masterData, setMasterData }) => {
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [foundRow, setFoundRow] = useState<MasterDataRow | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [auditHistory, setAuditHistory] = useState<MasterDataRow[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Filter audited items and show newest first
    const audited = masterData.filter(row => row[AUDIT_COLUMNS.STATUS] === 'O');
    setAuditHistory([...audited].reverse()); 
  }, [masterData]);

  useEffect(() => {
    // Initialize Scanner
    try {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error("Scanner init error:", err);
      setCameraError("스캐너 초기화 중 오류가 발생했습니다.");
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Scanner clear error:", e));
      }
    };
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    // 쿨다운 중이거나 모달이 이미 열려있으면 스캔 무시
    if (showModal || isCoolingDown) return;

    const trimmedText = decodedText.trim();
    setScannedResult(trimmedText);

    const match = masterData.find(row => 
      String(row[MASTER_COLUMNS.MGMT_NO] || "").trim() === trimmedText ||
      String(row[MASTER_COLUMNS.ASSET_NO] || "").trim() === trimmedText
    );

    if (match) {
      setFoundRow(match);
      setShowModal(true);
      try { scannerRef.current?.pause(true); } catch(e) {}
    } else {
      setFoundRow(null);
      setShowModal(true); 
      try { scannerRef.current?.pause(true); } catch(e) {}
    }
  };

  const confirmAudit = () => {
    if (!foundRow) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    
    setMasterData(prev => prev.map(row => {
      if (row[MASTER_COLUMNS.MGMT_NO] === foundRow[MASTER_COLUMNS.MGMT_NO]) {
        return {
          ...row,
          [AUDIT_COLUMNS.DATE]: dateStr,
          [AUDIT_COLUMNS.STATUS]: 'O'
        };
      }
      return row;
    }));

    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setScannedResult(null);
    setFoundRow(null);
    
    // 모달 닫힌 후 1.5초 쿨다운 시작
    setIsCoolingDown(true);
    
    // 스캐너 재개
    try { scannerRef.current?.resume(); } catch(e) {}

    setTimeout(() => {
      setIsCoolingDown(false);
    }, 1500);
  };

  const handleExport = (e: React.MouseEvent) => {
    // 이벤트 전파 방지 및 기본 동작 방지 (라우팅 방지)
    e.preventDefault();
    e.stopPropagation();

    if (masterData.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }

    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      exportMasterWithAudit(masterData, `자산실사결과_${dateStr}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      alert("엑셀 파일을 생성하는 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg text-white">
            <ScanQrCode className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">현장 자산 실사</h2>
        </div>
        
        <button 
          type="button"
          onClick={handleExport}
          disabled={auditHistory.length === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 ${
            auditHistory.length > 0 
              ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Download className="w-5 h-5" /> 실사 결과 엑셀 다운로드
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Scanner Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <span className="font-semibold text-gray-700 flex items-center gap-2">
                <ScanQrCode className="w-4 h-4 text-purple-600" /> 카메라 스캐너
              </span>
              {isCoolingDown && (
                <span className="text-xs font-bold text-orange-500 flex items-center gap-1 animate-pulse">
                  <Clock className="w-3 h-3" /> 대기 중...
                </span>
              )}
            </div>
            
            <div className="p-4 bg-gray-900 min-h-[350px] flex items-center justify-center relative">
              {cameraError && (
                <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center text-white p-6 text-center">
                  <CameraOff className="w-12 h-12 text-red-500 mb-4" />
                  <p className="font-bold mb-2">카메라를 사용할 수 없습니다</p>
                  <p className="text-sm text-gray-400">권한 설정을 확인해 주세요.</p>
                </div>
              )}
              <div id="qr-reader" className="qr-scanner-container w-full overflow-hidden"></div>
              
              {!cameraError && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/50 bg-black/40 px-3 py-1 rounded-full pointer-events-none z-10">
                  {isCoolingDown ? "잠시만 기다려주세요..." : "화면 중앙에 QR 코드를 맞춰주세요"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History Column */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-full min-h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" /> 실사 완료 리스트
            </h3>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
              총 {auditHistory.length}건
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {auditHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Package className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">실사 완료된 자산이 여기에 표시됩니다.</p>
              </div>
            ) : (
              auditHistory.map((row, idx) => (
                <div key={`${row[MASTER_COLUMNS.MGMT_NO]}-${idx}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:border-purple-200 hover:bg-purple-50 group">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{row[MASTER_COLUMNS.MGMT_NO]}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[180px]">{row[MASTER_COLUMNS.PROD_NAME]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Audit Date</p>
                    <p className="text-xs font-black text-purple-600">{row[AUDIT_COLUMNS.DATE]}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Audit Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            {foundRow ? (
              <>
                <div className="bg-purple-600 p-6 text-white relative">
                  <button onClick={closeModal} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <ScanQrCode className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-200">Asset Identified</span>
                  </div>
                  <h3 className="text-3xl font-black">{foundRow[MASTER_COLUMNS.MGMT_NO]}</h3>
                </div>

                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">자산번호</span>
                      <p className="font-bold text-gray-800">{foundRow[MASTER_COLUMNS.ASSET_NO] || '-'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">제조사</span>
                      <p className="font-bold text-gray-800">{foundRow[MASTER_COLUMNS.MANUFACTURER] || '-'}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">상품 정보</span>
                    <p className="font-bold text-gray-800 text-lg leading-tight">{foundRow[MASTER_COLUMNS.PROD_NAME]}</p>
                    <p className="text-xs text-gray-400 mt-2">Model: {foundRow[MASTER_COLUMNS.MODEL_NAME] || 'N/A'}</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={closeModal}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-all"
                    >
                      취소
                    </button>
                    <button 
                      type="button"
                      onClick={confirmAudit}
                      className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-purple-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <CheckCircle className="w-5 h-5" /> 실사 확인 완료
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-10 text-center">
                <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">자산을 찾을 수 없음</h4>
                <p className="text-gray-500 mb-2">스캔된 코드: <span className="font-mono font-bold text-red-600">{scannedResult}</span></p>
                <p className="text-sm text-gray-400 mb-8">마스터 데이터에 등록되지 않은 관리번호입니다.</p>
                <button 
                  type="button"
                  onClick={closeModal}
                  className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all"
                >
                  닫기 및 재시도
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPage;
