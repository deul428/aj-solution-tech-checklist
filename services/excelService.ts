
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { MasterDataRow, ChecklistData, CHECKLIST_COLUMNS, MASTER_COLUMNS } from "../types";

/**
 * 기본 구글 앱스 스크립트 배포 URL
 */
export const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbwybFpjOQC05mlrUF02C31eJFW5qhNPPSPF43DgUDn_9kgLpuvknQplI0BkGnVEMIP_/exec";

/**
 * 시트 목록 조회
 */
export const fetchSheetList = async (url: string): Promise<string[]> => {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const fetchUrl = `${url}${separator}action=listSheets&t=${Date.now()}`;
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const sheets = await response.json();
    return Array.isArray(sheets) ? sheets.filter(name => name.includes('마스터파일')) : [];
  } catch (error) {
    console.error("Error fetching sheet list:", error);
    throw error;
  }
};

/**
 * 위치 옵션(센터 -> 구역 매핑) 조회
 */
export const fetchLocationOptions = async (url: string): Promise<Record<string, string[]>> => {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const fetchUrl = `${url}${separator}action=getLocationOptions&t=${Date.now()}`;
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching location options:", error);
    return {};
  }
};

/**
 * 마스터 데이터(읽기전용) 가져오기
 */
export const fetchMasterFromCloud = async (url: string, sheetName?: string): Promise<MasterDataRow[]> => {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const sheetParam = sheetName ? `&sheetName=${encodeURIComponent(sheetName)}` : "";
    const fetchUrl = `${url}${separator}action=read${sheetParam}&t=${Date.now()}`;
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json() as MasterDataRow[];
  } catch (error) {
    console.error("Error fetching master from cloud:", error);
    throw error;
  }
};

/**
 * 로컬 엑셀 파일 파싱
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
        resolve(XLSX.utils.sheet_to_json<MasterDataRow>(worksheet));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 체크리스트 생성/업데이트 (Upsert)
 */
export const syncChecklistToCloud = async (url: string, data: ChecklistData[], _unused?: string): Promise<{ success: boolean; count: number }> => {
  if (data.length === 0) return { success: false, count: 0 };

  const rows = data.map((item) => ({
    [CHECKLIST_COLUMNS.MGMT_NO]: String(item.mgmtNumber || "").trim(),
    [CHECKLIST_COLUMNS.ASSET_NO]: String(item.assetNumber || "").trim(),
    [CHECKLIST_COLUMNS.PROD_CODE]: String(item.productCode || "").trim(),
    [CHECKLIST_COLUMNS.PROD_NAME]: String(item.productName || "").trim(),
    [CHECKLIST_COLUMNS.MANUFACTURER]: String(item.manufacturer || "").trim(),
    [CHECKLIST_COLUMNS.MODEL]: String(item.model || "").trim(),
    [CHECKLIST_COLUMNS.YEAR]: String(item.year || "").trim(),
    [CHECKLIST_COLUMNS.VEHICLE_NO]: String(item.vehicleNumber || "").trim(),
    [CHECKLIST_COLUMNS.SERIAL_NO]: String(item.serialNumber || "").trim(),
  }));

  const payload = {
    action: "checklist",
    rows: rows
  };

  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors", 
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
    return { success: true, count: rows.length };
  } catch (error) {
    console.error("Checklist Sync error:", error);
    throw error;
  }
};

/**
 * 자산 실사 데이터 업데이트 (Upsert)
 */
export const syncAuditDataToCloud = async (
  url: string, 
  data: MasterDataRow[], 
  _unused?: string,
  centerLocation?: string,
  assetLocation?: string
): Promise<{ success: boolean; count: number }> => {
  const auditedItems = data.filter(row => row[CHECKLIST_COLUMNS.AUDIT_STATUS] === 'O' || row['자산실사 여부'] === 'O');
  if (auditedItems.length === 0) return { success: false, count: 0 };

  const payload = {
    action: "audit", 
    rows: auditedItems.map((row) => ({
      [CHECKLIST_COLUMNS.MGMT_NO]: String(row[MASTER_COLUMNS.MGMT_NO] || row[CHECKLIST_COLUMNS.MGMT_NO] || "").trim(),
      [CHECKLIST_COLUMNS.AUDIT_DATE]: row[CHECKLIST_COLUMNS.AUDIT_DATE] || row['자산실사일'] || new Date().toLocaleDateString(),
      [CHECKLIST_COLUMNS.AUDIT_STATUS]: "O",
      [CHECKLIST_COLUMNS.CENTER_LOC]: centerLocation || "", 
      [CHECKLIST_COLUMNS.ASSET_LOC]: assetLocation || ""    
    }))
  };

  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors", 
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
    return { success: true, count: payload.rows.length };
  } catch (error) {
    console.error("Audit Sync error:", error);
    throw error;
  }
};

export const exportMasterWithImages = async (data: MasterDataRow[], fileName: string = "master_with_qr.xlsx") => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Asset List");
  sheet.columns = [
    { header: "QR", key: "qr", width: 15 },
    { header: "관리번호", key: "mgmt", width: 20 },
    { header: "자산번호", key: "asset", width: 20 },
    { header: "상품코드", key: "prodCode", width: 20 },
    { header: "상품명", key: "prodName", width: 40 },
    { header: "제조사", key: "brand", width: 20 },
    { header: "모델", key: "model", width: 20 },
    { header: "년식", key: "year", width: 10 },
    { header: "자산실사일", key: "auditDate", width: 15 },
    { header: "실사여부", key: "auditStatus", width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  for (let i = 0; i < data.length; i++) {
    const rowData = data[i];
    const mgmtNo = String(rowData[MASTER_COLUMNS.MGMT_NO] || rowData[CHECKLIST_COLUMNS.MGMT_NO] || "").trim();
    const currentRow = i + 2;
    sheet.getRow(currentRow).height = 80;
    sheet.addRow({
      mgmt: mgmtNo,
      asset: rowData[MASTER_COLUMNS.ASSET_NO] || rowData[CHECKLIST_COLUMNS.ASSET_NO],
      prodCode: rowData[MASTER_COLUMNS.PROD_NO] || rowData[CHECKLIST_COLUMNS.PROD_CODE],
      prodName: rowData[MASTER_COLUMNS.PROD_NAME] || rowData[CHECKLIST_COLUMNS.PROD_NAME],
      brand: rowData[MASTER_COLUMNS.MANUFACTURER] || rowData[CHECKLIST_COLUMNS.MANUFACTURER],
      model: rowData[MASTER_COLUMNS.MODEL_NAME] || rowData[CHECKLIST_COLUMNS.MODEL],
      year: rowData[MASTER_COLUMNS.PROD_YEAR] || rowData[CHECKLIST_COLUMNS.YEAR],
      auditDate: rowData[CHECKLIST_COLUMNS.AUDIT_DATE],
      auditStatus: rowData[CHECKLIST_COLUMNS.AUDIT_STATUS],
    });
    if (mgmtNo) {
      try {
        const qrBase64 = await QRCode.toDataURL(mgmtNo, { margin: 1, width: 200 });
        const imageId = workbook.addImage({ base64: qrBase64, extension: 'png' });
        sheet.addImage(imageId, { tl: { col: 0.1, row: i + 1.1 }, ext: { width: 100, height: 100 } });
      } catch (err) {}
    }
    sheet.getRow(currentRow).alignment = { vertical: 'middle', horizontal: 'center' };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
};

export const downloadChecklistExcel = async (dataList: ChecklistData[], engineerInput: string, fileName: string = "checklists.xlsx") => {
  const workbook = new ExcelJS.Workbook();
  const ITEMS_PER_SHEET = 3;
  const ROWS_PER_BLOCK = 10;
  const thinBorder: Partial<ExcelJS.Borders> = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  const headerStyle: Partial<ExcelJS.Style> = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } }, font: { bold: true, size: 14, name: "Malgun Gothic" }, alignment: { horizontal: "center", vertical: "middle" }, border: thinBorder };
  const valueStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 14, name: "Malgun Gothic" }, alignment: { horizontal: "center", vertical: "middle" }, border: thinBorder };

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
      sheet.mergeCells(`F${startRow}:G${startRow}`);
      sheet.getCell(`F${startRow}`).value = `관리번호: `;
      sheet.getCell(`H${startRow}`).value = data.mgmtNumber;
      sheet.getRow(startRow + 2).height = 160;
      sheet.mergeCells(`A${startRow + 2}:G${startRow + 2}`);
      sheet.getCell(`A${startRow + 2}`).value = `정비일자: ${today.getFullYear()}  정비자: ${engineerInput}  QC일자: ${today.getFullYear()}  QC:`;
      sheet.getRow(startRow + 5).height = 90;
      sheet.getCell(`A${startRow + 5}`).value = "상품코드"; sheet.getCell(`A${startRow + 5}`).style = headerStyle;
      sheet.getCell(`B${startRow + 5}`).value = data.productCode; sheet.getCell(`B${startRow + 5}`).style = valueStyle;
      sheet.getCell(`C${startRow + 5}`).value = "상품명"; sheet.getCell(`C${startRow + 5}`).style = headerStyle;
      sheet.mergeCells(`D${startRow + 5}:H${startRow + 5}`);
      sheet.getCell(`D${startRow + 5}`).value = data.productName; sheet.getCell(`D${startRow + 5}`).style = valueStyle;
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
