
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
  MapPin,
  Navigation,
  Send,
  Plus,
  Building
} from "lucide-react";
import { MasterDataRow, MASTER_COLUMNS, AUDIT_COLUMNS } from "../types";
import { syncAuditDataToCloud, fetchLocationOptions } from "../services/excelService";

interface AuditPageProps {
  masterData: MasterDataRow[];
  setMasterData: React.Dispatch<React.SetStateAction<MasterDataRow[]>>;
  serviceUrl: string;
  selectedSheet?: string;
}

const AuditPage: React.FC<AuditPageProps> = ({ masterData, setMasterData, serviceUrl, selectedSheet }) => {
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [foundRow, setFoundRow] = useState<MasterDataRow | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [auditHistory, setAuditHistory] = useState<MasterDataRow[]>([]);
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Dynamic location selection states
  const [locationOptions, setLocationOptions] = useState<{ centers: string[], zones: string[] }>({ centers: [], zones: [] });
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [isCustomCenter, setIsCustomCenter] = useState(false);
  const [isCustomZone, setIsCustomZone] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-container";
  const SHARED_SHEET_URL = "https://docs.google.com/spreadsheets/d/1NXT2EBow1zWxmPsb7frN90e95qRH1mkY9DQUgCrsn2I/edit?usp=sharing";

  useEffect(() => {
    // 실사 내역 필터링
    const audited = masterData.filter(row => row[AUDIT_COLUMNS.STATUS] === 'O');
    setAuditHistory([...audited].reverse());
  }, [masterData]);

  useEffect(() => {
    // 서버에서 위치 옵션 불러오기
    const loadOptions = async () => {
      const options = await fetchLocationOptions(serviceUrl);
      setLocationOptions(options);
    };
    loadOptions();
  }, [serviceUrl]);

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
        () => { }
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
    if (showScanModal || showTransferModal || isCoolingDown || isSyncing) return;

    const trimmedText = decodedText.trim();
    setScannedResult(trimmedText);

    const match = masterData.find(row =>
      String(row[MASTER_COLUMNS.MGMT_NO] || "").trim() === trimmedText ||
      String(row[MASTER_COLUMNS.ASSET_NO] || "").trim() === trimmedText
    );

    setFoundRow(match || null);
    setShowScanModal(true);

    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.pause();
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

    closeScanModal();
  };

  const closeScanModal = () => {
    setShowScanModal(false);
    setScannedResult(null);
    setFoundRow(null);
    
    setIsCoolingDown(true);

    setTimeout(() => {
      setIsCoolingDown(false);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.resume();
      }
    }, 1500);
  };

  const handleOpenTransferModal = () => {
    if (auditHistory.length === 0) {
      alert("전송할 실사 데이터가 없습니다.");
      return;
    }
    setShowTransferModal(true);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedCenter.trim() || !selectedZone.trim()) {
      alert("센터 및 구역 위치를 모두 입력해 주세요.");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncAuditDataToCloud(
        serviceUrl, 
        masterData, 
        selectedSheet, 
        selectedCenter, 
        selectedZone
      );
      
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString());

      // 전송 성공 후 로컬 상태 초기화
      setMasterData(prev => prev.map(row => {
        if (row[AUDIT_COLUMNS.STATUS] === 'O') {
          return {
            ...row,
            [AUDIT_COLUMNS.STATUS]: '',
            [AUDIT_COLUMNS.CENTER]: selectedCenter,
            [AUDIT_COLUMNS.ZONE]: selectedZone
          };
        }
        return row;
      }));

      alert(`${result.count}건의 실사 결과가 [${selectedCenter} / ${selectedZone}] 정보와 함께 성공적으로 전송되었습니다.`);
      setShowTransferModal(false);
    } catch (error) {
      console.error("Transfer error:", error);
      alert("데이터 전송 중 오류가 발생했습니다. Apps Script 권한을 확인하세요.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCenterSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      setIsCustomCenter(true);
      setSelectedCenter("");
    } else {
      setIsCustomCenter(false);
      setSelectedCenter(val);
    }
  };

  const handleZoneSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      setIsCustomZone(true);
      setSelectedZone("");
    } else {
      setIsCustomZone(false);
      setSelectedZone(val);
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
              <span className="text-[11px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                시트: {selectedSheet || "기본"}
              </span>
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
                  <Check className="w-3 h-3" /> 마지막 전송: {lastSyncTime}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden ring-1 ring-gray-100">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <span className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <div className={`w-2 h-2 rounded-full ${cameraStatus === 'ready' ? (isCoolingDown ? 'bg-amber-500 animate-pulse' : 'bg-green-500') : cameraStatus === 'loading' ? 'bg-orange-500 animate-pulse' : 'bg-red-500'}`}></div>
                Smart Scan Mode
              </span>
              <button
                onClick={startScanner}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 flex items-center gap-1 text-xs font-bold"
              >
                <RefreshCcw className={`w-4 h-4 ${cameraStatus === 'loading' ? 'animate-spin' : ''}`} /> 리셋
              </button>
            </div>

            <div className="p-4 bg-black min-h-[400px] flex items-center justify-center relative">
              <div id={scannerId} className="w-full h-full overflow-hidden rounded-2xl"></div>

              {cameraStatus === 'loading' && (
                <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center text-white p-8">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                  <p className="font-bold text-sm">카메라 장치 연결 중...</p>
                </div>
              )}

              {cameraStatus === 'error' && (
                <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center text-white p-8 text-center">
                  <CameraOff className="w-16 h-16 text-red-500 mb-6 opacity-50" />
                  <p className="font-bold text-lg mb-2">카메라를 사용할 수 없음</p>
                  <p className="text-xs text-gray-400 mb-6 leading-relaxed">{errorMessage}</p>
                  <button
                    onClick={startScanner}
                    className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-sm hover:bg-gray-200 transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> 다시 시도
                  </button>
                </div>
              )}

              {cameraStatus === 'ready' && !errorMessage && (
                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-bold px-5 py-2.5 rounded-full pointer-events-none z-10 border shadow-2xl transition-all duration-300 ${
                  isCoolingDown 
                  ? "bg-amber-500 text-white border-amber-400 animate-pulse" 
                  : "text-white/80 bg-black/60 backdrop-blur-md border-white/10"
                }`}>
                  {isCoolingDown ? "잠시만 기다려주세요..." : "QR 코드를 사각형 안에 비춰주세요"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-gray-100 h-full min-h-[500px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" /> 실사 대기 목록
            </h3>
            <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[11px] font-black shadow-md shadow-purple-100">
              {auditHistory.length} 건
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar mb-6 max-h-[350px]">
            {auditHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 opacity-40">
                <Package className="w-16 h-16 mb-4" />
                <p className="text-sm font-bold">스캔된 항목이 없습니다</p>
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
                      <p className="text-[11px] text-gray-500 truncate max-w-[150px] font-medium">{row[MASTER_COLUMNS.PROD_NAME] || '정보 없음'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-purple-700">{row[AUDIT_COLUMNS.DATE]}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <button
            type="button"
            onClick={handleOpenTransferModal}
            disabled={auditHistory.length === 0 || isSyncing}
            className={`w-full flex justify-center items-center gap-3 px-8 py-5 rounded-2xl font-black transition-all shadow-xl active:scale-95 ${auditHistory.length > 0 && !isSyncing
              ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200"
              : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
              }`}
          >
            {isSyncing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CloudUpload className="w-6 h-6" />
            )}
            {isSyncing ? "데이터 전송 중..." : "실사 결과 일괄 전송"}
          </button>
        </div>
      </div>

      {/* 스캔 성공 모달 */}
      {showScanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-400">
            {foundRow ? (
              <>
                <div className="bg-purple-600 p-10 text-white relative">
                  <button onClick={closeScanModal} className="absolute top-8 right-8 p-2 hover:bg-white/20 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-200">Asset Found</span>
                  </div>
                  <h3 className="text-5xl font-black tracking-tighter leading-none">{foundRow[MASTER_COLUMNS.MGMT_NO]}</h3>
                </div>

                <div className="p-10 space-y-8">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">자산번호</span>
                      <p className="font-black text-gray-900 truncate">{foundRow[MASTER_COLUMNS.ASSET_NO] || '-'}</p>
                    </div>
                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">제조사</span>
                      <p className="font-black text-gray-900 truncate">{foundRow[MASTER_COLUMNS.MANUFACTURER] || '-'}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">상품 정보</span>
                    <p className="font-black text-gray-900 text-xl leading-tight">{foundRow[MASTER_COLUMNS.PROD_NAME] || '정보 없음'}</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={closeScanModal}
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
                <div className="bg-red-50 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-10">
                  <XCircle className="w-14 h-14 text-red-500" />
                </div>
                <h4 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">정보를 찾을 수 없음</h4>
                <p className="text-gray-500 mb-2">스캔된 코드: <span className="font-mono font-bold text-red-600 text-lg">{scannedResult}</span></p>
                <p className="text-sm text-gray-400 mb-12 leading-relaxed">마스터 데이터베이스에 등록되지 않은<br />관리번호 또는 자산번호입니다.</p>
                <button
                  type="button"
                  onClick={closeScanModal}
                  className="w-full bg-gray-900 text-white font-black py-6 rounded-3xl hover:bg-black transition-all shadow-2xl active:scale-95 text-xl"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 위치 정보 입력 모달 */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-400">
            <div className="bg-blue-600 p-8 text-white relative">
              <button onClick={() => setShowTransferModal(false)} className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-2 rounded-xl">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black">실사 위치 선택</h3>
              </div>
              <p className="text-blue-100 text-sm font-medium">데이터 전송 전 현재 위치를 선택해 주세요.</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-5">
                {/* 센터 위치 선택 */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Building className="w-3 h-3 text-blue-500" /> 센터 정보
                  </label>
                  {!isCustomCenter ? (
                    <div className="relative group">
                      <select 
                        value={selectedCenter}
                        onChange={handleCenterSelect}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-black text-gray-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">센터를 선택하세요</option>
                        {locationOptions.centers.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        <option value="custom">+ 직접 입력하기</option>
                      </select>
                      <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-gray-400">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 animate-in slide-in-from-right-2">
                      <input 
                        type="text"
                        autoFocus
                        value={selectedCenter}
                        onChange={(e) => setSelectedCenter(e.target.value)}
                        placeholder="직접 입력 (예: 제주 지점)"
                        className="flex-1 bg-white border-2 border-blue-200 rounded-2xl px-5 py-4 font-black text-gray-900 outline-none shadow-lg shadow-blue-50"
                      />
                      <button 
                        onClick={() => { setIsCustomCenter(false); setSelectedCenter(""); }}
                        className="p-4 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200"
                      >
                        <RefreshCcw className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 구역 위치 선택 */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-purple-500" /> 세부 구역 정보
                  </label>
                  {!isCustomZone ? (
                    <div className="relative group">
                      <select 
                        value={selectedZone}
                        onChange={handleZoneSelect}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-black text-gray-900 outline-none focus:ring-4 focus:ring-purple-100 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">구역을 선택하세요</option>
                        {locationOptions.zones.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        <option value="custom">+ 직접 입력하기</option>
                      </select>
                      <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-gray-400">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 animate-in slide-in-from-right-2">
                      <input 
                        type="text"
                        autoFocus
                        value={selectedZone}
                        onChange={(e) => setSelectedZone(e.target.value)}
                        placeholder="직접 입력 (예: A-1 구역)"
                        className="flex-1 bg-white border-2 border-purple-200 rounded-2xl px-5 py-4 font-black text-gray-900 outline-none shadow-lg shadow-purple-50"
                      />
                      <button 
                        onClick={() => { setIsCustomZone(false); setSelectedZone(""); }}
                        className="p-4 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200"
                      >
                        <RefreshCcw className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-4 rounded-2xl transition-all"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  disabled={isSyncing || !selectedCenter || !selectedZone}
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  서버에 저장하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPage;
