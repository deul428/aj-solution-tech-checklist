
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
  Undo2
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
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Filter audited items from masterData
    const audited = masterData.filter(row => row[AUDIT_COLUMNS.STATUS] === 'O');
    setAuditHistory(audited);
  }, [masterData]);

  useEffect(() => {
    // Initialize Scanner
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        aspectRatio: 1.0
      },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        handleScanSuccess(decodedText);
      },
      (error) => {
        // Quietly handle scan frame errors
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
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
      // Find row by primary key (MGMT_NO)
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
            <div className="p-4 bg-black">
              <div id="qr-reader" className="qr-scanner-container w-full overflow-hidden"></div>
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
                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                    <div>
                      <p className="text-sm font-bold text-green-900">{row[MASTER_COLUMNS.MGMT_NO]}</p>
                      <p className="text-xs text-green-700">{row[MASTER_COLUMNS.PROD_NAME]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-green-600">{row[AUDIT_COLUMNS.DATE]}</p>
                      <span className="text-xs font-black text-green-600">완료(O)</span>
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
            </div>
          ) : !foundRow ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
              <XCircle className="w-16 h-16 text-red-500 mb-4" />
              <h4 className="text-xl font-bold text-red-900 mb-2">조회 결과 없음</h4>
              <p className="text-red-700 mb-6">스캔한 값: <span className="font-mono font-bold">{scannedResult}</span></p>
              <button 
                onClick={resetScanner}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-red-700 transition-all"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-purple-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-purple-200 text-xs font-bold uppercase tracking-wider">Scanned Result</span>
                    <h3 className="text-3xl font-black mt-1">{foundRow[MASTER_COLUMNS.MGMT_NO]}</h3>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Package className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Tag className="w-3 h-3" /> <span className="text-xs font-bold">자산번호</span>
                    </div>
                    <p className="font-bold text-gray-800">{foundRow[MASTER_COLUMNS.ASSET_NO] || '-'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <User className="w-3 h-3" /> <span className="text-xs font-bold">제조사</span>
                    </div>
                    <p className="font-bold text-gray-800">{foundRow[MASTER_COLUMNS.MANUFACTURER] || '-'}</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-gray-400 text-xs font-bold mb-1">상품명</div>
                  <p className="font-bold text-gray-800 text-lg leading-tight">{foundRow[MASTER_COLUMNS.PROD_NAME]}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
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

                <div className="pt-4 border-t border-gray-100">
                  {foundRow[AUDIT_COLUMNS.STATUS] === 'O' ? (
                    <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 py-4 rounded-xl font-bold">
                      <CheckCircle className="w-5 h-5" /> 실사 완료 ({foundRow[AUDIT_COLUMNS.DATE]})
                    </div>
                  ) : (
                    <button 
                      onClick={confirmAudit}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg"
                    >
                      <CheckCircle className="w-6 h-6" /> 실사 확인 (Confirm)
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
