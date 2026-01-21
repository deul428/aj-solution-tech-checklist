
import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  ScanQrCode, 
  CheckCircle, 
  History, 
  Package, 
  XCircle, 
  CameraOff, 
  CloudUpload, 
  X, 
  Loader2,
  Check,
  ExternalLink,
  RefreshCcw,
  Camera,
  TestTube
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
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-container";
  const SHARED_SHEET_URL = "https://docs.google.com/spreadsheets/d/1NXT2EBow1zWxmPsb7frN90e95qRH1mkY9DQUgCrsn2I/edit?usp=sharing";

  useEffect(() => {
    const audited = masterData.filter(row => row[AUDIT_COLUMNS.STATUS] === 'O');
    setAuditHistory([...audited].reverse()); 
  }, [masterData]);

  const startScanner = async () => {
    setCameraStatus('loading');
    setErrorMessage(null);

    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (e) {
        console.warn("Stop error", e);
      }
    }

    const html5QrCode = new Html5Qrcode(scannerId);
    html5QrCodeRef.current = html5QrCode;

    const config = { 
      fps: 15, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
    };

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => handleScanSuccess(decodedText),
        () => {}
      );
      setCameraStatus('ready');
    } catch (err: any) {
      console.error("Camera Start Error:", err);
      setCameraStatus('error');
      if (err.includes("NotAllowedError") || err.includes("Permission")) {
        setErrorMessage("카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해 주세요.");
      } else if (err.includes("NotFoundError")) {
        setErrorMessage("카메라 장치를 찾을 수 없습니다.");
      } else {
        setErrorMessage("카메라를 시작할 수 없습니다.");
      }
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error("Unmount cleanup error", e));
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
    
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.pause();
    }
  };

  const loadMockData = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    
    const mock1: MasterDataRow = {
      [MASTER_COLUMNS.MGMT_NO]: "TY15C384",
      [MASTER_COLUMNS.PROD_NO]: "851BXC341",
      [MASTER_COLUMNS.PROD_NAME]: "전동 좌식 1.5톤 2단 3000",
      [MASTER_COLUMNS.ASSET_NO]: "ASSET-001",
      [MASTER_COLUMNS.MANUFACTURER]: "솔루션테크",
      [MASTER_COLUMNS.MODEL_NAME]: "ST-1500",
      [MASTER_COLUMNS.PROD_YEAR]: "2023",
      [MASTER_COLUMNS.VEHICLE_NO]: "12가3456",
      [MASTER_COLUMNS.SERIAL_NO]: "SN-TY15-001",
      [AUDIT_COLUMNS.DATE]: dateStr,
      [AUDIT_COLUMNS.STATUS]: 'O'
    };

    const mock2: MasterDataRow = {
      [MASTER_COLUMNS.MGMT_NO]: "TY15C385",
      [MASTER_COLUMNS.PROD_NO]: "851BXC312",
      [MASTER_COLUMNS.PROD_NAME]: "전동 좌식 2.5톤 3단 4700",
      [MASTER_COLUMNS.ASSET_NO]: "ASSET-002",
      [MASTER_COLUMNS.MANUFACTURER]: "솔루션테크",
      [MASTER_COLUMNS.MODEL_NAME]: "ST-2500",
      [MASTER_COLUMNS.PROD_YEAR]: "2024",
      [MASTER_COLUMNS.VEHICLE_NO]: "98나7654",
      [MASTER_COLUMNS.SERIAL_NO]: "SN-TY25-002",
      [AUDIT_COLUMNS.DATE]: dateStr,
      [AUDIT_COLUMNS.STATUS]: 'O'
    };

    setMasterData(prev => {
      let newData = [...prev];
      [mock1, mock2].forEach(mock => {
        const idx = newData.findIndex(r => r[MASTER_COLUMNS.MGMT_NO] === mock[MASTER_COLUMNS.MGMT_NO]);
        if (idx > -1) newData[idx] = { ...newData[idx], ...mock };
        else newData.push(mock);
      });
      return newData;
    });

    alert("테스트용 목업 데이터 2건이 실사 완료 상태로 추가되었습니다.");
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
    
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.resume();
    }
    
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
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString());
      
      setMasterData(prev => prev.map(row => ({
        ...row,
        [AUDIT_COLUMNS.STATUS]: row[AUDIT_COLUMNS.STATUS] === 'O' ? '' : row[AUDIT_COLUMNS.STATUS]
      })));

      alert(`${result.count}건의 실사 결과가 전송되었습니다. 전송 목록이 초기화되었습니다.`);
    } catch (error) {
      console.error("Transfer error:", error);
      alert("데이터 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-purple-100">
            <ScanQrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 leading-tight">현장 자산 실사</h2>
            <div className="flex items-center gap-3 mt-1">
              <a 
                href={SHARED_SHEET_URL} 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> 공유 시트 보기
              </a>
              {lastSyncTime && (
                <p className="text-[10px] text-green-600 font-black flex items-center gap-1">
                  <Check className="w-3 h-3" /> 마지막 동기화: {lastSyncTime}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          // <button 
          //   onClick={loadMockData}
          //   className="flex items-center gap-2 px-4 py-4 rounded-2xl font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all border border-amber-200 text-sm"
          // >
          //   <TestTube className="w-4 h-4" /> 목업 로드
          // </button>

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
            실사 결과 일괄 전송
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden ring-1 ring-gray-100">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <span className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <div className={`w-2 h-2 rounded-full ${cameraStatus === 'ready' ? 'bg-green-500' : cameraStatus === 'loading' ? 'bg-orange-500 animate-pulse' : 'bg-red-500'}`}></div> 
                Smart Scan
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={startScanner} 
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 flex items-center gap-1 text-xs font-bold"
                >
                  <RefreshCcw className={`w-4 h-4 ${cameraStatus === 'loading' ? 'animate-spin' : ''}`} /> 리셋
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-black min-h-[400px] flex items-center justify-center relative">
              <div id={scannerId} className="w-full h-full overflow-hidden rounded-2xl"></div>

              {cameraStatus === 'loading' && (
                <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center text-white p-8">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                  <p className="font-bold text-sm">카메라 초기화 중...</p>
                </div>
              )}

              {cameraStatus === 'error' && (
                <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center text-white p-8 text-center">
                  <CameraOff className="w-16 h-16 text-red-500 mb-6 opacity-50" />
                  <p className="font-bold text-lg mb-2">카메라 오류</p>
                  <p className="text-xs text-gray-400 mb-6 leading-relaxed">{errorMessage}</p>
                  <button 
                    onClick={startScanner}
                    className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-sm hover:bg-gray-200 transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> 권한 재요청 및 시작
                  </button>
                </div>
              )}
              
              {cameraStatus === 'ready' && !errorMessage && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-bold text-white/80 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full pointer-events-none z-10 border border-white/10 shadow-2xl">
                  {isCoolingDown ? "잠시 대기 중..." : "QR 코드를 사각형 안에 비춰주세요"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-gray-100 h-full min-h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" /> 전송 대기 중인 실사
            </h3>
            <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[11px] font-black">
              {auditHistory.length} ASSETS
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {auditHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 opacity-40">
                <Package className="w-16 h-16 mb-4" />
                <p className="text-sm font-bold">실사 내역이 없습니다</p>
              </div>
            ) : (
              auditHistory.map((row, idx) => (
                <div key={`${row[MASTER_COLUMNS.MGMT_NO]}-${idx}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-xl group">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{row[MASTER_COLUMNS.MGMT_NO]}</p>
                      <p className="text-[11px] text-gray-500 truncate max-w-[150px] font-medium">{row[MASTER_COLUMNS.PROD_NAME]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-purple-400 uppercase tracking-tighter mb-0.5">Scanned</p>
                    <p className="text-xs font-black text-purple-700">{row[AUDIT_COLUMNS.DATE]}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-400">
            {foundRow ? (
              <>
                <div className="bg-purple-600 p-10 text-white relative">
                  <button onClick={closeModal} className="absolute top-8 right-8 p-2 hover:bg-white/20 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <ScanQrCode className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-200">Asset Identifed</span>
                  </div>
                  <h3 className="text-5xl font-black tracking-tighter leading-none">{foundRow[MASTER_COLUMNS.MGMT_NO]}</h3>
                </div>

                <div className="p-10 space-y-8">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">자산번호</span>
                      <p className="font-black text-gray-900">{foundRow[MASTER_COLUMNS.ASSET_NO] || '-'}</p>
                    </div>
                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">제조사</span>
                      <p className="font-black text-gray-900">{foundRow[MASTER_COLUMNS.MANUFACTURER] || '-'}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">상품 정보</span>
                    <p className="font-black text-gray-900 text-xl leading-tight">{foundRow[MASTER_COLUMNS.PROD_NAME]}</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={closeModal}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-5 rounded-3xl transition-all"
                    >
                      취소
                    </button>
                    <button 
                      type="button"
                      onClick={confirmAudit}
                      className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white font-black py-5 rounded-3xl shadow-2xl shadow-purple-200 flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                      <CheckCircle className="w-6 h-6" /> 실사 확인
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center">
                <div className="bg-red-50 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner">
                  <XCircle className="w-14 h-14 text-red-500" />
                </div>
                <h4 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">자산 매칭 실패</h4>
                <p className="text-gray-500 mb-2">코드: <span className="font-mono font-bold text-red-600 text-lg">{scannedResult}</span></p>
                <p className="text-sm text-gray-400 mb-12 leading-relaxed font-medium">현재 데이터베이스에 존재하지 않는<br/>관리번호입니다.</p>
                <button 
                  type="button"
                  onClick={closeModal}
                  className="w-full bg-gray-900 text-white font-black py-6 rounded-3xl hover:bg-black transition-all shadow-2xl active:scale-95 text-xl"
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
