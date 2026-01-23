
import React, { useState, useEffect } from "react";
import { 
  Home as HomeIcon, 
  ClipboardCheck, 
  ScanQrCode, 
  Menu, 
  X,
  RefreshCcw
} from "lucide-react";
import { MasterDataRow } from "./types";
import HomePage from "./pages/HomePage";
import ChecklistPage from "./pages/ChecklistPage";
import AuditPage from "./pages/AuditPage";
import LoadingOverlay from "./components/LoadingOverlay";
import { fetchMasterFromCloud, DEFAULT_GAS_URL } from "./services/excelService";

type ViewType = "home" | "checklist" | "audit";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [masterData, setMasterData] = useState<MasterDataRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [serviceUrl, setServiceUrl] = useState<string>(DEFAULT_GAS_URL);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const loadData = async (customUrl?: string) => {
    const targetUrl = customUrl || serviceUrl;
    setIsInitialLoading(true);
    try {
      const data = await fetchMasterFromCloud(targetUrl);
      setMasterData(data);
      setFileName("구글 클라우드 시트");
      setLastSyncTime(new Date().toLocaleTimeString());
      if (customUrl) setServiceUrl(customUrl);
    } catch (err) {
      console.error(err);
      if (!customUrl) {
         // 에러가 났을 때 마스터 데이터를 비워줌으로써 HomePage에서 에러 UI가 뜨게 유도
         setMasterData([]);
      }
      throw err; // HomePage에서 잡을 수 있게 던짐
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData().catch(() => {});
  }, []);

  const renderView = () => {
    switch (currentView) {
      case "home":
        return (
          <HomePage 
            masterData={masterData} 
            setMasterData={setMasterData} 
            fileName={fileName} 
            setFileName={setFileName}
            onNavigate={(view) => setCurrentView(view)}
            onRefresh={loadData}
            lastSyncTime={lastSyncTime}
            serviceUrl={serviceUrl}
          />
        );
      case "checklist":
        return <ChecklistPage masterData={masterData} serviceUrl={serviceUrl} />;
      case "audit":
        return <AuditPage masterData={masterData} setMasterData={setMasterData} serviceUrl={serviceUrl} />;
      default:
        return <HomePage masterData={masterData} setMasterData={setMasterData} fileName={fileName} setFileName={setFileName} onNavigate={(view) => setCurrentView(view)} onRefresh={loadData} lastSyncTime={lastSyncTime} serviceUrl={serviceUrl} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {isInitialLoading && <LoadingOverlay message="클라우드 마스터 데이터를 불러오는 중..." />}
      
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:justify-center">
            {/* Desktop Menu */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4 items-center">
              <button
                onClick={() => setCurrentView("home")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "home" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <HomeIcon className="w-4 h-4" /> 홈
              </button>
              <button
                onClick={() => setCurrentView("checklist")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "checklist" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <ClipboardCheck className="w-4 h-4" /> 체크리스트 생성
              </button>
              <button
                onClick={() => setCurrentView("audit")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "audit" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <ScanQrCode className="w-4 h-4" /> 자산 실사
              </button>
              <button
                onClick={() => loadData().catch(() => {})}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="데이터 새로고침"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center sm:hidden gap-4">
               <button onClick={() => loadData().catch(() => {})} className="p-2 text-gray-400">
                  <RefreshCcw className="w-5 h-5" />
               </button>
              <button onClick={toggleMenu} className="p-2 text-gray-500">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="sm:hidden bg-white border-t border-gray-100 px-2 pt-2 pb-3 space-y-1 shadow-lg">
            <button
              onClick={() => { setCurrentView("home"); setIsMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-base font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <HomeIcon className="w-5 h-5" /> 홈
            </button>
            <button
              onClick={() => { setCurrentView("checklist"); setIsMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-base font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <ClipboardCheck className="w-5 h-5" /> 체크리스트 생성
            </button>
            <button
              onClick={() => { setCurrentView("audit"); setIsMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-base font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <ScanQrCode className="w-5 h-5" /> 자산 실사
            </button>
          </div>
        )}
      </nav>

      <main className="flex-1 overflow-auto">
        {renderView()}
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          &copy; 2026 ㈜AJ Networks. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default App;
