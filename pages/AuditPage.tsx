
import React, { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  ScanQrCode, 
  CheckCircle, 
  History, 
  Package, 
  Tag, 
  XCircle, 
  CameraOff, 
  CloudUpload, 
  X, 
  Clock,
  Loader2,
  Check
} from "lucide-react";
import { MasterDataRow, MASTER_COLUMNS, AUDIT_COLUMNS } from "../types";
import { syncAuditDataToCloud } from "../services/excelService";

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const audited = masterData.filter(row => row[AUDIT_COLUMNS.STATUS] === 'O');
    setAuditHistory([...audited].reverse()); 
  }, [masterData]);

  useEffect(() => {
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
        (decodedText) => handleScanSuccess(decodedText),
        () => {}
      );
    } catch (err) {
      setCameraError("스캐너 초기화 중 오류가 발생했습니다.");
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
      }
    };
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    if (showModal || isCoolingDown || isSyncing) return;

    const trimmedText = decodedText.trim();
    setScannedResult(trimmedText);

    const match = masterData.find(row => 
      String(row[MASTER_COLUMNS.MGMT_NO] || "").trim() === trimmedText ||
      String(row[MASTER_COLUMNS.ASSET_NO] || "").trim() === trimmedText
    );

    setFoundRow(match || null);
    setShowModal(true);
    try { scannerRef.current?.pause(true); } catch(e) {}
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
    setIsCoolingDown(true);
    try { scannerRef.current?.resume(); } catch(e) {}
    setTimeout(() => setIsCoolingDown(false), 1500);
  };

  const handleTransfer = async () => {
    if (auditHistory.length === 0) {
      alert("전송할 실사 데이터가 없습니다.");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncAuditDataToCloud(masterData);
      if (result.success) {
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString());
        alert(`${result.count}건의 실사 결과가 공유 시트로 전송되었습니다.`);
      }
    } catch (error) {
      alert("데이터 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg text-white">
            <ScanQrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">현장 자산 실사</h2>
            {lastSyncTime && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
                <Check className="w-3 h-3" /> 마지막 클라우드 동기화: {lastSyncTime}
              </p>
            )}
          </div>
        </div>
        
        <button 
          type="button"
          onClick={handleTransfer}
          disabled={auditHistory.length === 0 || isSyncing}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 ${
            auditHistory.length > 0 && !isSyncing
              ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200" 
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isSyncing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CloudUpload className="w-5 h-5" />
          )}
          공유 시트로 실사 결과 전송
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Scanner Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden ring-1 ring-gray-100">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <span className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <ScanQrCode className="w-4 h-4 text-purple-600" /> Live QR Scanner
              </span>
              {isCoolingDown && (
                <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                  <Clock className="w-3 h-3" /> COOLING DOWN
                </span>
              )}
            </div>
            
            <div className="p-4 bg-black min-h-[380px] flex items-center justify-center relative">
              {cameraError && (
                <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center text-white p-6 text-center">
                  <CameraOff className="w-12 h-12 text-red-500 mb-4" />
                  <p className="font-bold mb-2">카메라를 사용할 수 없습니다</p>
                </div>
              )}
              <div id="qr-reader" className="qr-scanner-container w-full overflow-hidden"></div>
              
              {!cameraError && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-bold text-white/70 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full pointer-events-none z-10 border border-white/10">
                  {isCoolingDown ? "잠시만 대기해 주세요" : "QR 코드를 중앙 사각형에 맞춰주세요"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History Column */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 h-full min-h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" /> 실사 전송 대기 목록
            </h3>
            <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[11px] font-black">
              {auditHistory.length} ASSETS
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {auditHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                <div className="bg-gray-50 p-6 rounded-full mb-4">
                  <Package className="w-10 h-10 opacity-20" />
                </div>
                <p className="text-sm font-medium">실사 완료된 자산이 없습니다.</p>
                <p className="text-[11px] mt-1 opacity-60">QR 스캔을 통해 실사를 진행하세요.</p>
              </div>
            ) : (
              auditHistory.map((row, idx) => (
                <div key={`${row[MASTER_COLUMNS.MGMT_NO]}-${idx}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:border-purple-200 hover:bg-white hover:shadow-md group">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{row[MASTER_COLUMNS.MGMT_NO]}</p>
                      <p className="text-[11px] text-gray-500 truncate max-w-[180px] font-medium">{row[MASTER_COLUMNS.PROD_NAME]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-purple-400 uppercase tracking-tighter mb-0.5">Scanned At</p>
                    <p className="text-xs font-black text-purple-700">{row[AUDIT_COLUMNS.DATE]}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Audit Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            {foundRow ? (
              <>
                <div className="bg-purple-600 p-8 text-white relative">
                  <button onClick={closeModal} className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <ScanQrCode className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-200">Asset Identified</span>
                  </div>
                  <h3 className="text-4xl font-black tracking-tight">{foundRow[MASTER_COLUMNS.MGMT_NO]}</h3>
                </div>

                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-wider">자산번호</span>
                      <p className="font-bold text-gray-900">{foundRow[MASTER_COLUMNS.ASSET_NO] || '-'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-wider">제조사</span>
                      <p className="font-bold text-gray-900">{foundRow[MASTER_COLUMNS.MANUFACTURER] || '-'}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-wider">상품 명칭</span>
                    <p className="font-bold text-gray-900 text-lg leading-tight">{foundRow[MASTER_COLUMNS.PROD_NAME]}</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={closeModal}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-4 rounded-2xl transition-all"
                    >
                      취소
                    </button>
                    <button 
                      type="button"
                      onClick={confirmAudit}
                      className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-purple-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <CheckCircle className="w-5 h-5" /> 실사 확인
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                  <XCircle className="w-12 h-12 text-red-500" />
                </div>
                <h4 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">자산 정보 없음</h4>
                <p className="text-gray-500 mb-1">스캔된 코드: <span className="font-mono font-bold text-red-600 underline decoration-2 underline-offset-4">{scannedResult}</span></p>
                <p className="text-xs text-gray-400 mb-10 leading-relaxed px-4">업로드하신 마스터 엑셀 데이터에<br/>해당 관리번호가 존재하지 않습니다.</p>
                <button 
                  type="button"
                  onClick={closeModal}
                  className="w-full bg-gray-900 text-white font-black py-5 rounded-3xl hover:bg-black transition-all shadow-xl active:scale-95"
                >
                  닫기 및 다시 스캔
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
