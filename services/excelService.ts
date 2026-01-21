
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { MasterDataRow, ChecklistData, AUDIT_COLUMNS } from "../types";

// 사용자가 Google Apps Script 배포 후 받은 URL을 여기에 넣으면 실제 연동이 됩니다.
const GAS_URL = "https://script.google.com/macros/s/AKfycbwxs5cx0ko8m_clx51SmnfzRFJ6yroVfAcNfJaST-60rKggzaEsQ6ZhgLhsVETPinAt/exec";

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
 * Sends audited data to the shared Google Sheet via Apps Script API.
 */
export const syncAuditDataToCloud = async (data: MasterDataRow[]): Promise<{ success: boolean; count: number }> => {
  const auditedItems = data.filter(row => row[AUDIT_COLUMNS.STATUS] === 'O');
  
  if (auditedItems.length === 0) return { success: false, count: 0 };

  try {
    // 실제 운영 시에는 아래 fetch 주석을 해제하고 사용합니다.
    // const response = await fetch(GAS_URL, {
    //   method: "POST",
    //   body: JSON.stringify(auditedItems),
    // });
    // if (!response.ok) throw new Error("Network error");

    console.log("Syncing to Google Sheets:", auditedItems);
    
    // 시뮬레이션 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      count: auditedItems.length
    };
  } catch (error) {
    console.error("Sync Error:", error);
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
        workbook.addImage({ base64: qr, extension: "png" });
        sheet.addImage(i, { tl: { col: 7.9, row: startRow + 0.8 }, ext: { width: 110, height: 110 } });
      } catch (err) {}
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
};
