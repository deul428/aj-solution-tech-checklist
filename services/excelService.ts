
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { MasterDataRow, ChecklistData, AUDIT_COLUMNS } from "../types";

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
 * SIMULATION: Sends audited data to a shared cloud sheet.
 * In a real-world app, this would be a fetch() call to a Google Apps Script or a backend API.
 */
export const syncAuditDataToCloud = async (data: MasterDataRow[]): Promise<{ success: boolean; count: number }> => {
  return new Promise((resolve) => {
    // 실사 완료된 데이터만 필터링
    const auditedItems = data.filter(row => row[AUDIT_COLUMNS.STATUS] === 'O');
    
    console.log("Sending to Shared Sheet:", auditedItems);
    
    // API 통신 시뮬레이션 (1.5초 대기)
    setTimeout(() => {
      resolve({
        success: true,
        count: auditedItems.length
      });
    }, 1500);
  });
};

/**
 * Exports the updated master data including audit results to a new Excel file (Fallback).
 */
export const exportMasterWithAudit = (data: MasterDataRow[], fileName: string = "master_audit_result.xlsx") => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Result");
  XLSX.writeFile(workbook, fileName);
};

/**
 * Generates and downloads a stylized Excel file with multiple checklists grouped 3 per sheet.
 */
export const downloadChecklistExcel = async (
  dataList: ChecklistData[],
  engineerInput: string,
  fileName: string = "checklists.xlsx"
) => {
  const workbook = new ExcelJS.Workbook();
  const ITEMS_PER_SHEET = 3;
  const ROWS_PER_BLOCK = 10;

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  const headerLabelStyle: Partial<ExcelJS.Style> = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } },
    font: { bold: true, size: 14, name: "Malgun Gothic" },
    alignment: { horizontal: "center", vertical: "middle" },
    border: thinBorder,
  };

  const dataValueStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 14, name: "Malgun Gothic" },
    alignment: { horizontal: "center", vertical: "middle" },
    border: thinBorder,
  };

  const leftAlignDataValueStyle: Partial<ExcelJS.Style> = {
    ...dataValueStyle,
    alignment: { horizontal: "left", vertical: "middle", indent: 1 },
  };

  for (let i = 0; i < dataList.length; i += ITEMS_PER_SHEET) {
    const chunk = dataList.slice(i, i + ITEMS_PER_SHEET);
    const sheetIndex = Math.floor(i / ITEMS_PER_SHEET) + 1;
    const sheetName = `Page ${sheetIndex}`;
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = [
      { width: 10 }, { width: 20 }, { width: 10 }, { width: 20 },
      { width: 10 }, { width: 20 }, { width: 10 }, { width: 20 },
    ];

    for (let j = 0; j < chunk.length; j++) {
      const data = chunk[j];
      const rowOffset = j * ROWS_PER_BLOCK;
      const startRow = rowOffset + 1;
      const today = new Date();
      const yyyy = today.getFullYear().toString();

      const row1 = worksheet.getRow(startRow);
      row1.height = 80;
      worksheet.mergeCells(`A${startRow}:E${startRow}`);
      const titleCell = worksheet.getCell(`A${startRow}`);
      titleCell.value = "상품/임가/경,중 체크리스트";
      titleCell.font = { bold: true, size: 28, name: "Malgun Gothic" };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };

      worksheet.mergeCells(`F${startRow}:G${startRow}`);
      worksheet.getCell(`F${startRow}`).value = `관리번호: `;
      worksheet.getCell(`F${startRow}`).style = { font: { size: 16, name: "Malgun Gothic" }, alignment: { horizontal: 'right' } };

      const mgmtCell = worksheet.getCell(`H${startRow}`);
      mgmtCell.value = `${data.mgmtNumber}`;
      mgmtCell.font = { size: 20, bold: true, name: "Malgun Gothic" };
      mgmtCell.alignment = { vertical: "bottom", horizontal: 'center' };

      const row3 = worksheet.getRow(startRow + 2);
      row3.height = 160;
      worksheet.mergeCells(`A${startRow + 2}:G${startRow + 2}`);
      worksheet.getCell(`A${startRow + 2}`).value = `정비일자: ${yyyy}                    정비자: ${engineerInput}                    QC일자: ${yyyy}                    QC:`;
      worksheet.getCell(`A${startRow + 2}`).style = { font: { size: 12 }, alignment: { vertical: 'middle', horizontal: 'left' } };

      const row6 = worksheet.getRow(startRow + 5);
      row6.height = 90;
      worksheet.getCell(`A${startRow + 5}`).value = "상품코드";
      worksheet.getCell(`A${startRow + 5}`).style = headerLabelStyle;
      worksheet.getCell(`B${startRow + 5}`).value = data.productCode;
      worksheet.getCell(`B${startRow + 5}`).style = dataValueStyle;
      worksheet.getCell(`C${startRow + 5}`).value = "상품명";
      worksheet.getCell(`C${startRow + 5}`).style = headerLabelStyle;
      worksheet.mergeCells(`D${startRow + 5}:H${startRow + 5}`);
      const nameValCell = worksheet.getCell(`D${startRow + 5}`);
      nameValCell.value = data.productName;
      nameValCell.style = leftAlignDataValueStyle;

      const row7 = worksheet.getRow(startRow + 6);
      row7.height = 90;
      worksheet.getCell(`A${startRow + 6}`).value = "제조사";
      worksheet.getCell(`A${startRow + 6}`).style = headerLabelStyle;
      worksheet.getCell(`B${startRow + 6}`).value = data.manufacturer;
      worksheet.getCell(`B${startRow + 6}`).style = dataValueStyle;
      worksheet.getCell(`C${startRow + 6}`).value = "모델";
      worksheet.getCell(`C${startRow + 6}`).style = headerLabelStyle;
      worksheet.getCell(`D${startRow + 6}`).value = data.model;
      worksheet.getCell(`D${startRow + 6}`).style = dataValueStyle;
      worksheet.getCell(`E${startRow + 6}`).value = "년식";
      worksheet.getCell(`E${startRow + 6}`).style = headerLabelStyle;
      worksheet.getCell(`F${startRow + 6}`).value = data.year;
      worksheet.getCell(`F${startRow + 6}`).style = dataValueStyle;
      worksheet.getCell(`G${startRow + 6}`).value = "사용시간";
      worksheet.getCell(`G${startRow + 6}`).style = headerLabelStyle;
      worksheet.getCell(`H${startRow + 6}`).style = dataValueStyle;

      const row8 = worksheet.getRow(startRow + 7);
      row8.height = 90;
      worksheet.getCell(`A${startRow + 7}`).value = "자산번호";
      worksheet.getCell(`A${startRow + 7}`).style = headerLabelStyle;
      worksheet.getCell(`B${startRow + 7}`).value = data.assetNumber;
      worksheet.getCell(`B${startRow + 7}`).style = dataValueStyle;
      worksheet.getCell(`C${startRow + 7}`).value = "차량번호";
      worksheet.getCell(`C${startRow + 7}`).style = headerLabelStyle;
      worksheet.getCell(`D${startRow + 7}`).value = data.vehicleNumber;
      worksheet.getCell(`D${startRow + 7}`).style = dataValueStyle;
      worksheet.getCell(`E${startRow + 7}`).value = "차대번호";
      worksheet.getCell(`E${startRow + 7}`).style = headerLabelStyle;
      worksheet.mergeCells(`F${startRow + 7}:H${startRow + 7}`);
      const serialValCell = worksheet.getCell(`F${startRow + 7}`);
      serialValCell.value = data.serialNumber;
      serialValCell.style = leftAlignDataValueStyle;

      const row9 = worksheet.getRow(startRow + 8);
      row9.height = 90;
      worksheet.getCell(`A${startRow + 8}`).value = "물류:";
      worksheet.getCell(`B${startRow + 8}`).value = data.category === "물류" ? "O" : "";
      worksheet.getCell(`C${startRow + 8}`).value = "건설:";
      worksheet.getCell(`D${startRow + 8}`).value = data.category === "건설" ? "O" : "";
      worksheet.mergeCells(`E${startRow + 8}:H${startRow + 8}`);
      worksheet.getCell(`E${startRow + 8}`).value = "양호: V  보통: △  불량: x  교체: O  해당없음: N";

      try {
        const qrDataUrl = await QRCode.toDataURL(data.mgmtNumber, { margin: 1, width: 250 });
        const qrImageId = workbook.addImage({ base64: qrDataUrl, extension: "png" });
        worksheet.addImage(qrImageId, { tl: { col: 7.9, row: startRow + 0.8 }, ext: { width: 110, height: 110 } });
      } catch (err) {}
    }

    worksheet.pageSetup = {
      orientation: "portrait",
      paperSize: 9, 
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
};
