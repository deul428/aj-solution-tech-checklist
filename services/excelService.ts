
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { MasterDataRow, ChecklistData, AUDIT_COLUMNS, MASTER_COLUMNS } from "../types";

/**
 * [주의] 반드시 Google Apps Script 배포 후 받은 새로운 '웹 앱 URL'을 여기에 넣으세요.
 */
const GAS_URL = "https://script.google.com/macros/s/AKfycbxjwzzS3ICXplXppA1Yjw5WP-WW0dOGzBaaq2NVkTcnXStZHoFJzUDRfrCtQRqQimLH/exec";

/**
 * Parses an uploaded Excel file into JSON data.
 */
export const parseMasterExcel = (file: File): Promise<MasterDataRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<MasterDataRow>(worksheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Sends audited data to Google Sheets via Apps Script.
 * Appends new rows with all specified asset details.
 */
export const syncAuditDataToCloud = async (data: MasterDataRow[]): Promise<{ success: boolean; count: number }> => {
  // 실사 여부가 'O'인 데이터만 필터링
  const auditedItems = data.filter(row => row[AUDIT_COLUMNS.STATUS] === 'O');
  
  if (auditedItems.length === 0) {
    console.warn("No items marked as audited ('O') to sync.");
    return { success: false, count: 0 };
  }

  // 사용자 요청에 따른 엑셀 시트 헤더명과 1:1 매칭 변환
  const payload = auditedItems.map(row => ({
    "자산번호": String(row[MASTER_COLUMNS.ASSET_NO] || "").trim(),
    "관리번호": String(row[MASTER_COLUMNS.MGMT_NO] || "").trim(),
    "상품코드": String(row[MASTER_COLUMNS.PROD_NO] || "").trim(),
    "상품명": String(row[MASTER_COLUMNS.PROD_NAME] || "").trim(),
    "제조사": String(row[MASTER_COLUMNS.MANUFACTURER] || "").trim(),
    "모델": String(row[MASTER_COLUMNS.MODEL_NAME] || "").trim(),
    "년식": String(row[MASTER_COLUMNS.PROD_YEAR] || "").trim(),
    "차량번호": String(row[MASTER_COLUMNS.VEHICLE_NO] || "").trim(),
    "차대번호": String(row[MASTER_COLUMNS.SERIAL_NO] || "").trim(),
    "자산실사일": row[AUDIT_COLUMNS.DATE] || new Date().toLocaleDateString(),
    "자산실사 여부": "O"
  }));

  console.log("Attempting to sync payload:", payload);

  try {
    // Google Apps Script는 Redirect(302)를 사용하므로 
    // 브라우저에서 응답 본문을 읽으려면 no-cors를 써야 하는 경우가 많습니다.
    // 하지만 데이터 전송 자체는 이뤄집니다.
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: {
        "Content-Type": "text/plain", 
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      count: payload.length
    };
  } catch (error) {
    console.error("Sync fetch error:", error);
    throw error;
  }
};

/**
 * Fallback Excel export
 */
export const exportMasterWithAudit = (data: MasterDataRow[], fileName: string = "master_audit_result.xlsx") => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Result");
  XLSX.writeFile(workbook, fileName);
};

export const downloadChecklistExcel = async (
  dataList: ChecklistData[],
  engineerInput: string,
  fileName: string = "checklists.xlsx"
) => {
  const workbook = new ExcelJS.Workbook();
  const ITEMS_PER_SHEET = 3;
  const ROWS_PER_BLOCK = 10;
  const thinBorder: Partial<ExcelJS.Borders> = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  const headerLabelStyle: Partial<ExcelJS.Style> = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } }, font: { bold: true, size: 14, name: "Malgun Gothic" }, alignment: { horizontal: "center", vertical: "middle" }, border: thinBorder };
  const dataValueStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 14, name: "Malgun Gothic" }, alignment: { horizontal: "center", vertical: "middle" }, border: thinBorder };
  const leftAlignDataValueStyle: Partial<ExcelJS.Style> = { ...dataValueStyle, alignment: { horizontal: "left", vertical: "middle", indent: 1 } };

  for (let i = 0; i < dataList.length; i += ITEMS_PER_SHEET) {
    const chunk = dataList.slice(i, i + ITEMS_PER_SHEET);
    const sheet = workbook.addWorksheet(`Page ${Math.floor(i / ITEMS_PER_SHEET) + 1}`);
    sheet.columns = [{ width: 10 }, { width: 20 }, { width: 10 }, { width: 20 }, { width: 10 }, { width: 20 }, { width: 10 }, { width: 20 }];

    for (let j = 0; j < chunk.length; j++) {
      const data = chunk[j];
      const startRow = (j * ROWS_PER_BLOCK) + 1;
      const today = new Date();
      sheet.getRow(startRow).height = 80;
      sheet.mergeCells(`A${startRow}:E${startRow}`);
      sheet.getCell(`A${startRow}`).value = "상품/임가/경,중 체크리스트";
      sheet.getCell(`A${startRow}`).font = { bold: true, size: 28, name: "Malgun Gothic" };
      sheet.getCell(`A${startRow}`).alignment = { horizontal: "left", vertical: "middle" };
      sheet.mergeCells(`F${startRow}:G${startRow}`);
      sheet.getCell(`F${startRow}`).value = `관리번호: `;
      sheet.getCell(`H${startRow}`).value = data.mgmtNumber;
      sheet.getCell(`H${startRow}`).font = { size: 20, bold: true };
      sheet.getRow(startRow + 2).height = 160;
      sheet.mergeCells(`A${startRow + 2}:G${startRow + 2}`);
      sheet.getCell(`A${startRow + 2}`).value = `정비일자: ${today.getFullYear()}                    정비자: ${engineerInput}                    QC일자: ${today.getFullYear()}                    QC:`;
      sheet.getRow(startRow + 5).height = 90;
      sheet.getCell(`A${startRow + 5}`).value = "상품코드"; sheet.getCell(`A${startRow + 5}`).style = headerLabelStyle;
      sheet.getCell(`B${startRow + 5}`).value = data.productCode; sheet.getCell(`B${startRow + 5}`).style = dataValueStyle;
      sheet.getCell(`C${startRow + 5}`).value = "상품명"; sheet.getCell(`C${startRow + 5}`).style = headerLabelStyle;
      sheet.mergeCells(`D${startRow + 5}:H${startRow + 5}`);
      sheet.getCell(`D${startRow + 5}`).value = data.productName; sheet.getCell(`D${startRow + 5}`).style = leftAlignDataValueStyle;
      try {
        const qr = await QRCode.toDataURL(data.mgmtNumber, { margin: 1, width: 250 });
        const imgId = workbook.addImage({ base64: qr, extension: "png" });
        sheet.addImage(imgId, { tl: { col: 7.9, row: startRow + 0.8 }, ext: { width: 110, height: 110 } });
      } catch (err) {}
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
};
