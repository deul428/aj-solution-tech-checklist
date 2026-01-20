
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
  CameraOff
} from "lucide-react";
import { MasterDataRow, MASTER_COLUMNS, AUDIT_COLUMNS } from "../types";

interface AuditPageProps {
  masterData: MasterDataRow[];
  setMasterData: React.Dispatch<React.SetStateAction<MasterDataRow[]>>;
}

const AuditPage: React.FC<AuditPageProps> = ({ masterData, setMasterData }) => {
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [foundRow, setFoundRow] = useState<MasterDataRow | null>(null);
  const [auditHistory, setAuditHistory] = useState<MasterDataRow[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Filter audited items from masterData
    const audited = masterData.filter(row => row[AUDIT_COLUMNS.STATUS] === 'O');
    setAuditHistory(audited);
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
        /* verbose= */ false
      );

      scannerRef.current.render(
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (error) => {
          // Frame error (no QR in view) - normal behavior
        }
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
    const trimmedText = decodedText.trim();
    setScannedResult(trimmedText);

    // Find in masterData by MGMT_NO or ASSET_NO
    const match = masterData.find(row => 
      String(row[MASTER_COLUMNS.MGMT_NO] || "").trim() === trimmedText ||
      String(row[MASTER_COLUMNS.ASSET_NO] || "").trim() === trimmedText
    );

    if (match) {
      setFoundRow(match);
      // Optional: stop scanning after find to save resources
      // scannerRef.current?.pause(); 
    } else {
      setFoundRow(null);
    }
  };

  const confirmAudit = () => {
    if (!foundRow) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    
    // Update masterData state
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

    setScannedResult(null);
    setFoundRow(null);
    alert("실사 기록이 완료되었습니다.");
  };

  const resetScanner = () => {
    setScannedResult(null);
    setFoundRow(null);
    // if (scannerRef.current) scannerRef.current.resume();
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-purple-600 p-2 rounded-lg text-white">
          <ScanQrCode className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">현장 자산 실사</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Scanner Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <span className="font-semibold text-gray-700 flex items-center gap-2">
                <ScanQrCode className="w-4 h-4 text-purple-600" /> 카메라 스캔
              </span>
              {scannedResult && (
                <button 
                  onClick={resetScanner}
                  className="text-gray-400 hover:text-gray-600 text-xs flex items-center gap-1"
                >
                  <Undo2 className="w-3 h-3" /> 재스캔
                </button>
              )}
            </div>
            
            <div className="p-4 bg-gray-900 min-h-[300px] flex items-center justify-center relative">
              {cameraError && (
                <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center text-white p-6 text-center">
                  <CameraOff className="w-12 h-12 text-red-500 mb-4" />
                  <p className="font-bold mb-2">카메라를 사용할 수 없습니다</p>
                  <p className="text-sm text-gray-400">브라우저 설정에서 카메라 권한을 허용했는지 확인해 주세요.</p>
                </div>
              )}
              <div id="qr-reader" className="qr-scanner-container w-full overflow-hidden"></div>
              
              {!cameraError && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/50 bg-black/40 px-3 py-1 rounded-full pointer-events-none">
                  화면 중앙에 QR 코드를 맞춰주세요
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" /> 실사 현황
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {auditHistory.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">아직 완료된 실사가 없습니다.</p>
              ) : (
                auditHistory.map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100 transition-all hover:bg-green-100">
                    <div>
                      <p className="text-sm font-bold text-green-900">{row[MASTER_COLUMNS.MGMT_NO]}</p>
                      <p className="text-xs text-green-700 truncate max-w-[150px]">{row[MASTER_COLUMNS.PROD_NAME]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-green-600">{row[AUDIT_COLUMNS.DATE]}</p>
                      <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">완료</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Result Column */}
        <div className="space-y-6">
          {!scannedResult ? (
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-20 flex flex-col items-center justify-center text-gray-400">
              <ScanQrCode className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">QR 코드를 스캔해 주세요.</p>
              <p className="text-xs mt-2 opacity-50">자산번호 또는 관리번호가 인식됩니다.</p>
            </div>
          ) : !foundRow ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
              <XCircle className="w-16 h-16 text-red-500 mb-4" />
              <h4 className="text-xl font-bold text-red-900 mb-2">조회 결과 없음</h4>
              <p className="text-red-700 mb-1">스캔한 값: <span className="font-mono font-bold text-red-900 underline">{scannedResult}</span></p>
              <p className="text-red-500 text-xs mb-6">마스터 데이터에 해당 관리번호가 없습니다.</p>
              <button 
                onClick={resetScanner}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-red-700 transition-all"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="bg-purple-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-purple-200 text-xs font-bold uppercase tracking-wider">Scanned Asset</span>
                    <h3 className="text-3xl font-black mt-1 leading-none">{foundRow[MASTER_COLUMNS.MGMT_NO]}</h3>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Package className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Tag className="w-3 h-3" /> <span className="text-[10px] font-bold uppercase">자산번호</span>
                    </div>
                    <p className="font-bold text-gray-800 truncate">{foundRow[MASTER_COLUMNS.ASSET_NO] || '-'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <User className="w-3 h-3" /> <span className="text-[10px] font-bold uppercase">제조사</span>
                    </div>
                    <p className="font-bold text-gray-800 truncate">{foundRow[MASTER_COLUMNS.MANUFACTURER] || '-'}</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">상품 정보</div>
                  <p className="font-bold text-gray-800 text-lg leading-tight mb-1">{foundRow[MASTER_COLUMNS.PROD_NAME]}</p>
                  <p className="text-xs text-gray-500">코드: {foundRow[MASTER_COLUMNS.PROD_NO]}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">제조년도:</span>
                    <span className="font-bold text-gray-800">{foundRow[MASTER_COLUMNS.PROD_YEAR] || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">상태:</span>
                    <span className="font-bold text-gray-800">{foundRow[MASTER_COLUMNS.EQUIP_STATUS] || '-'}</span>
                  </div>
                </div>

                <div className="pt-4">
                  {foundRow[AUDIT_COLUMNS.STATUS] === 'O' ? (
                    <div className="flex flex-col items-center justify-center gap-1 text-green-600 bg-green-50 py-4 rounded-xl font-bold border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> 이미 실사 완료됨
                      </div>
                      <span className="text-xs opacity-70">기록일: {foundRow[AUDIT_COLUMNS.DATE]}</span>
                    </div>
                  ) : (
                    <button 
                      onClick={confirmAudit}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 text-lg active:scale-95"
                    >
                      <CheckCircle className="w-6 h-6" /> 실사 확인 완료
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
