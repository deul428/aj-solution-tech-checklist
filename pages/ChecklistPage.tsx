
import React, { useState } from "react";
import { 
  Search, 
  Download, 
  UserRoundPen, 
  AlertCircle, 
  FileText, 
  Loader2,
  ListFilter
} from "lucide-react";
import { MasterDataRow, ChecklistData, MASTER_COLUMNS } from "../types";
import { downloadChecklistExcel } from "../services/excelService";
import { downloadChecklistPDF } from "../services/pdfService";
import ChecklistPreview from "../components/ChecklistPreview";

interface ChecklistPageProps {
  masterData: MasterDataRow[];
}

const ChecklistPage: React.FC<ChecklistPageProps> = ({ masterData }) => {
  const [mgmtNumbersInput, setMgmtNumbersInput] = useState("");
  const [engineerInput, setEngineerInput] = useState("");
  const [currentChecklists, setCurrentChecklists] = useState<ChecklistData[]>([]);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [warnText, setWarnText] = useState<string | null>("");

  const removeLeadingQuote = (str: string): string => {
    if (str && str.startsWith("'")) return str.slice(1);
    return str;
  };

  const handleSearch = () => {
    if (!masterData.length) {
      alert("먼저 마스터 엑셀 파일을 업로드해 주세요.");
      return;
    }

    const targetMgmts = mgmtNumbersInput.split(/\s+/).filter(Boolean);
    if (!targetMgmts.length) {
      alert("관리번호를 하나 이상 입력해 주세요.");
      return;
    }

    const foundChecklists: ChecklistData[] = [];
    const missingMgmts: string[] = [];

    targetMgmts.forEach((mgmt) => {
      const trimmedMgmt = mgmt.trim();
      const foundRow = masterData.find(
        (row) => String(row[MASTER_COLUMNS.MGMT_NO] || "").trim() === trimmedMgmt
      );

      if (foundRow) {
        const status = String(foundRow[MASTER_COLUMNS.EQUIP_STATUS] || "");
        let category: "물류" | "건설" | null = null;
        if (status.includes("A")) category = "물류";
        else if (status.includes("B")) category = "건설";

        foundChecklists.push({
          mgmtNumber: removeLeadingQuote(trimmedMgmt),
          productCode: removeLeadingQuote(String(foundRow[MASTER_COLUMNS.PROD_NO] || "")),
          productName: removeLeadingQuote(String(foundRow[MASTER_COLUMNS.PROD_NAME] || "")),
          manufacturer: removeLeadingQuote(String(foundRow[MASTER_COLUMNS.MANUFACTURER] || "")),
          model: removeLeadingQuote(String(foundRow[MASTER_COLUMNS.MODEL_NAME] || "")),
          year: removeLeadingQuote(String(foundRow[MASTER_COLUMNS.PROD_YEAR] || "")),
          usageTime: "",
          assetNumber: removeLeadingQuote(String(foundRow[MASTER_COLUMNS.ASSET_NO] || "")),
          vehicleNumber: removeLeadingQuote(String(foundRow[MASTER_COLUMNS.VEHICLE_NO] || "")),
          serialNumber: removeLeadingQuote(String(foundRow[MASTER_COLUMNS.SERIAL_NO] || "")),
          category: category,
        });
      } else {
        missingMgmts.push(trimmedMgmt);
      }
    });

    setCurrentChecklists(foundChecklists);
    setWarnText(missingMgmts.length > 0 ? `다음 번호를 찾을 수 없습니다: ${missingMgmts.join(", ")}` : "");
  };

  const getDate = () => {
    const today = new Date();
    return `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  };

  const handleExcelExport = () => {
    const yyyy_mm_dd = getDate();
    if (currentChecklists.length === 0) return;
    const downloadName = currentChecklists.length === 1
        ? `정비_체크리스트_${currentChecklists[0].mgmtNumber}_${yyyy_mm_dd}.xlsx`
        : `정비_체크리스트_${yyyy_mm_dd}.xlsx`;

    downloadChecklistExcel(currentChecklists, engineerInput, downloadName);
  };

  const handlePdfExport = async () => {
    const yyyy_mm_dd = getDate();
    if (currentChecklists.length === 0) return;
    setIsExportingPdf(true);
    try {
      const downloadName = currentChecklists.length === 1
          ? `정비_체크리스트_${currentChecklists[0].mgmtNumber}_${yyyy_mm_dd}.pdf`
          : `정비_체크리스트_${yyyy_mm_dd}.pdf`;
      await downloadChecklistPDF("checklist-container", downloadName);
    } catch (err) {
      console.error(err);
      alert("PDF 생성 도중 오류가 발생했습니다.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <ListFilter className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">체크리스트 일괄 생성</h2>
      </div>

      <div className="space-y-6">
        <section className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" /> 1. 관리번호 입력 (공백/줄바꿈 구분)
          </h3>
          <textarea
            value={mgmtNumbersInput}
            onChange={(e) => setMgmtNumbersInput(e.target.value)}
            placeholder="예: 851BX198 900CX200"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
          />
          {warnText && (
            <div className="mt-3 flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" /> {warnText}
            </div>
          )}
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <UserRoundPen className="w-5 h-5 text-blue-600" /> 2. 정비자 정보 (선택)
          </h3>
          <input
            type="text"
            value={engineerInput}
            onChange={(e) => setEngineerInput(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </section>

        <button
          onClick={handleSearch}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 text-lg"
        >
          <Search className="w-6 h-6" /> 데이터 일괄 매칭
        </button>

        {currentChecklists.length > 0 && (
          <div className="mt-12 space-y-8 no-print">
            <div className="flex items-center justify-between sticky top-20 z-30 bg-gray-50/90 backdrop-blur px-4 py-3 rounded-2xl border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-700">매칭 결과: {currentChecklists.length}건</h4>
              <div className="flex gap-2">
                <button onClick={handleExcelExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                  <Download className="w-4 h-4" /> 엑셀
                </button>
                <button onClick={handlePdfExport} disabled={isExportingPdf} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm disabled:bg-gray-400">
                  {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF
                </button>
              </div>
            </div>

            <div id="checklist-container" className="space-y-4">
              {currentChecklists.map((checklist, idx) => (
                <ChecklistPreview key={`${checklist.mgmtNumber}-${idx}`} data={checklist} engineerInput={engineerInput} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChecklistPage;
