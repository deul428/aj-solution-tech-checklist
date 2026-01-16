
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { MasterDataRow, ChecklistData } from "../types";

/**
 * Parses an uploaded Excel file into JSON data using XLSX 0.18.5.
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

  // Styles definition
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

  const infoStyle: Partial<ExcelJS.Style> = {
    font: { size: 14, name: "Malgun Gothic" },
    alignment: { vertical: "middle" },
  };

  // Group data by 3 per sheet
  for (let i = 0; i < dataList.length; i += ITEMS_PER_SHEET) {
    const chunk = dataList.slice(i, i + ITEMS_PER_SHEET);
    const sheetIndex = Math.floor(i / ITEMS_PER_SHEET) + 1;
    const sheetName = `Page ${sheetIndex}`;
    const worksheet = workbook.addWorksheet(sheetName);

    // Updated column widths per request: A,C,E,G = 10 | B,D,F,H = 20
    worksheet.columns = [
      { width: 10 }, // A
      { width: 20 }, // B
      { width: 10 }, // C
      { width: 20 }, // D
      { width: 10 }, // E
      { width: 20 }, // F
      { width: 10 }, // G
      { width: 20 }, // H
    ];

    for (let j = 0; j < chunk.length; j++) {
      const data = chunk[j];
      const rowOffset = j * ROWS_PER_BLOCK;
      const startRow = rowOffset + 1;

      const today = new Date();
      const yyyy = today.getFullYear().toString();

      // Row 1: Title & Mgmt No
      const row1 = worksheet.getRow(startRow);
      row1.height = 80;
      worksheet.mergeCells(`A${startRow}:E${startRow}`);
      const titleCell = worksheet.getCell(`A${startRow}`);
      titleCell.value = "상품/임가/경,중 체크리스트";
      titleCell.font = { bold: true, size: 28, name: "Malgun Gothic" };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };

      worksheet.mergeCells(`F${startRow}:G${startRow}`);
      const mgmtCell_01 = worksheet.getCell(`F${startRow}`);
      mgmtCell_01.value = `관리번호: `;
      mgmtCell_01.style = { font: { size: 16, name: "Malgun Gothic" }, alignment: { horizontal: 'right' } };

      const mgmtCell = worksheet.getCell(`H${startRow}`);
      mgmtCell.value = `${data.mgmtNumber}`;
      mgmtCell.font = { size: 20, bold: true, name: "Malgun Gothic" };
      mgmtCell.alignment = { vertical: "bottom", horizontal: 'center' };

      // Row 2: Visual Separator
      const row2 = worksheet.getRow(startRow + 1);
      row2.height = 10;
      worksheet.mergeCells(`A${startRow + 1}:H${startRow + 1}`);

      // Row 3: Signatures ( 정비자, 정비일자, QC, QC일자 )
      const row3 = worksheet.getRow(startRow + 2);
      row3.height = 160;

      worksheet.mergeCells(`A${startRow + 2}:G${startRow + 2}`);
      worksheet.getCell(`A${startRow + 2}`).value = `정비일자: ${yyyy}                    정비자: ${engineerInput}                    QC일자: ${yyyy}                    QC:`;
      worksheet.getCell(`A${startRow + 2}`).style = infoStyle;
      worksheet.getCell(`A${startRow + 2}`).style = { font: { size: 12 }, alignment: { vertical: 'middle', horizontal: 'left' } };
      // worksheet.getCell(`B${startRow + 2}`).value = engineerInput;
      // worksheet.getCell(`B${startRow + 2}`).style = infoStyle;

      // worksheet.getCell(`C${startRow + 2}`).value = "정비 일자:";
      // worksheet.getCell(`C${startRow + 2}`).style = infoStyle;
      // worksheet.getCell(`D${startRow + 2}`).value = `${yyyy}.`;
      // worksheet.getCell(`D${startRow + 2}`).style = infoStyle;

      // worksheet.getCell(`E${startRow + 2}`).value = "QC:";
      // worksheet.getCell(`E${startRow + 2}`).style = infoStyle;

      // worksheet.getCell(`G${startRow + 2}`).value = "QC 일자:";
      // worksheet.getCell(`G${startRow + 2}`).style = infoStyle;
      // worksheet.getCell(`H${startRow + 2}`).value = `${yyyy}.`;
      // worksheet.getCell(`H${startRow + 2}`).style = infoStyle;

      // Row 5: Blank separator before table
      const row4 = worksheet.getRow(startRow + 3);
      row4.height = 40;

      const row5 = worksheet.getRow(startRow + 4);
      row5.height = 0;

      // Row 6: Product Code & Name
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
      // Apply border to all merged cells
      for (let c = 4; c <= 8; c++) worksheet.getCell(startRow + 5, c).border = thinBorder;

      // Row 7: Mfg, Model, Year, Usage
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
      worksheet.getCell(`H${startRow + 6}`).value = ""; // Empty for manual input
      worksheet.getCell(`H${startRow + 6}`).style = dataValueStyle;

      // Row 8: Asset, Vehicle, Serial
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
      for (let c = 6; c <= 8; c++) worksheet.getCell(startRow + 7, c).border = thinBorder;

      // Row 9: Categories & Legend
      const row9 = worksheet.getRow(startRow + 8);
      row9.height = 90;
      worksheet.getCell(`A${startRow + 8}`).value = "물류:";
      worksheet.getCell(`A${startRow + 8}`).style = infoStyle;
      worksheet.getCell(`A${startRow + 8}`).style = {
        alignment: { vertical: "bottom", horizontal: "left" }
      };

      worksheet.getCell(`B${startRow + 8}`).value = data.category === "물류" ? "O" : "";
      worksheet.getCell(`B${startRow + 8}`).style = {
        font: { bold: true, size: 18, name: "Malgun Gothic" },
        alignment: { vertical: "bottom", horizontal: "left" }
      };

      worksheet.getCell(`C${startRow + 8}`).value = "건설:";
      worksheet.getCell(`C${startRow + 8}`).style = infoStyle;
      worksheet.getCell(`C${startRow + 8}`).style = {
        alignment: { vertical: "bottom", horizontal: "left" }
      };

      worksheet.getCell(`D${startRow + 8}`).value = data.category === "건설" ? "O" : "";
      worksheet.getCell(`D${startRow + 8}`).style = {
        font: { bold: true, size: 18, name: "Malgun Gothic" },
        alignment: { vertical: "bottom", horizontal: "left" }
      };

      worksheet.mergeCells(`E${startRow + 8}:H${startRow + 8}`);
      const legendCell = worksheet.getCell(`E${startRow + 8}`);
      legendCell.value = "양호: V  보통: △  불량: x  교체: O  해당없음: N";
      legendCell.style = {
        font: { size: 14, bold: true, name: "Malgun Gothic" },
        alignment: { vertical: "bottom", horizontal: "right" }
      };

      // Spacing gap row
      worksheet.getRow(startRow + 9).height = 40;

      // Insert QR Code
      try {
        const qrDataUrl = await QRCode.toDataURL(data.mgmtNumber, { margin: 1, width: 250 });
        const qrImageId = workbook.addImage({
          base64: qrDataUrl,
          extension: "png",
        });
        // Anchor QR near the mgmt number area
        worksheet.addImage(qrImageId, {
          tl: { col: 7.9, row: startRow + 0.8 },
          ext: { width: 110, height: 110 },
        });
      } catch (err) {
        console.error("QR Code Error:", err);
      }
    }

    // A4 Portrait scaling
    worksheet.pageSetup = {
      orientation: "portrait",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0, footer: 0 },
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
