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
  fileName: string = "checklists.xlsx"
) => {
  const workbook = new ExcelJS.Workbook();
  const ITEMS_PER_SHEET = 3;
  const ROWS_PER_BLOCK = 10; // Each checklist block + 1 row gap = 10 rows

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
    font: { size: 16, name: "Malgun Gothic" },
    alignment: { vertical: "middle" },
  };

  const infoStyle_14: Partial<ExcelJS.Style> = {
    font: { size: 14, name: "Malgun Gothic" },
    alignment: { vertical: "middle" },
  };
  // Group data by 3
  for (let i = 0; i < dataList.length; i += ITEMS_PER_SHEET) {
    const chunk = dataList.slice(i, i + ITEMS_PER_SHEET);
    const sheetIndex = Math.floor(i / ITEMS_PER_SHEET) + 1;
    const sheetName = `Page ${sheetIndex}`;
    const worksheet = workbook.addWorksheet(sheetName);

    // Global column widths for the sheet
    worksheet.columns = [
      { width: 15 },
      { width: 20 },
      { width: 15 },
      { width: 20 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 20 },
    ];

    for (let j = 0; j < chunk.length; j++) {
      const data = chunk[j];
      //   const rowOffset = j * ROWS_PER_BLOCK; // 0, 10, 20...
      const rowOffset = j * (ROWS_PER_BLOCK + 1); // 0, 11, 22...
      const startRow = rowOffset + 1;

      const today = new Date();
      const yyyy_mm_dd = `${today.getFullYear()}.${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}.${today.getDate().toString().padStart(2, "0")}`;

      // Row 1: Title & Mgmt No
      const row1 = worksheet.getRow(startRow);
      row1.height = 100;
      worksheet.mergeCells(`A${startRow}:E${startRow}`);
      const titleCell = worksheet.getCell(`A${startRow}`);
      titleCell.value = "상품/임가/경,중 체크리스트";
      titleCell.font = { bold: true, size: 30, name: "Malgun Gothic" };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };

      const mgmtCell = worksheet.getCell(`H${startRow}`);
      mgmtCell.value = `관리번호: ${data.mgmtNumber}`;
      mgmtCell.font = {
        size: 18,
        name: "Malgun Gothic",
        underline: true,
        bold: true,
      };
      mgmtCell.alignment = { horizontal: "right", vertical: "bottom" };

      // Row 2: Separator
      const row2 = worksheet.getRow(startRow + 1);
      row2.height = 10;
      worksheet.mergeCells(`A${startRow + 1}:H${startRow + 1}`);
      worksheet.getCell(`A${startRow + 1}`).border = {
        bottom: { style: "medium" },
      };

      // Row 3: Info (Date, QR Location)
      const row3 = worksheet.getRow(startRow + 2);
      row3.height = 80;
      const row4 = worksheet.getRow(startRow + 3);
      row4.height = 80;
      worksheet.getCell(`A${startRow + 2}`).value = "정비자:";
      worksheet.getCell(`A${startRow + 2}`).style = infoStyle_14;
      worksheet.getCell(`A${startRow + 3}`).value = `정비 일자:`;
      worksheet.getCell(`A${startRow + 3}`).style = infoStyle_14;
      // worksheet.mergeCells(`A${startRow + 2}:B${startRow + 2}`);
      worksheet.getCell(`D${startRow + 2}`).value = "QC:";
      worksheet.getCell(`D${startRow + 2}`).style = infoStyle_14;
      worksheet.getCell(`D${startRow + 3}`).value = `QC 일자:`;
      worksheet.getCell(`D${startRow + 3}`).style = infoStyle_14;

      // Row 5: Product Info
      const row6 = worksheet.getRow(startRow + 5);
      row6.height = 70;
      worksheet.getCell(`A${startRow + 5}`).value = "상품코드";
      worksheet.getCell(`A${startRow + 5}`).style = headerLabelStyle;
      worksheet.getCell(`B${startRow + 5}`).value = data.productCode;
      worksheet.getCell(`B${startRow + 5}`).style = dataValueStyle;
      worksheet.getCell(`C${startRow + 5}`).value = "상품명";
      worksheet.getCell(`C${startRow + 5}`).style = headerLabelStyle;
      worksheet.mergeCells(`D${startRow + 5}:H${startRow + 5}`);
      for (let c = 5; c <= 8; c++)
        worksheet.getCell(startRow + 5, c).border = thinBorder;
      worksheet.getCell(`D${startRow + 5}`).value = data.productName;
      worksheet.getCell(`D${startRow + 5}`).style = leftAlignDataValueStyle;

      // Row 6: Mfg, Model, Year, Usage
      const row7 = worksheet.getRow(startRow + 6);
      row7.height = 70;
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
      worksheet.getCell(`H${startRow + 6}`).value = "";
      worksheet.getCell(`H${startRow + 6}`).style = dataValueStyle;

      // Row 7: Asset, Vehicle, Serial
      const row8 = worksheet.getRow(startRow + 7);
      row8.height = 70;
      worksheet.getCell(`A${startRow + 8 - 1}`).value = "자산번호";
      worksheet.getCell(`A${startRow + 8 - 1}`).style = headerLabelStyle;
      worksheet.getCell(`B${startRow + 8 - 1}`).value = data.assetNumber;
      worksheet.getCell(`B${startRow + 8 - 1}`).style = dataValueStyle;
      worksheet.getCell(`C${startRow + 8 - 1}`).value = "차량번호";
      worksheet.getCell(`C${startRow + 8 - 1}`).style = headerLabelStyle;
      worksheet.getCell(`D${startRow + 8 - 1}`).value = data.vehicleNumber;
      worksheet.getCell(`D${startRow + 8 - 1}`).style = dataValueStyle;
      worksheet.getCell(`E${startRow + 8 - 1}`).value = "차대번호";
      worksheet.getCell(`E${startRow + 8 - 1}`).style = headerLabelStyle;
      worksheet.mergeCells(`F${startRow + 8 - 1}:H${startRow + 8 - 1}`);
      for (let c = 7; c <= 8; c++)
        worksheet.getCell(startRow + 8 - 1, c).border = thinBorder;
      worksheet.getCell(`F${startRow + 8 - 1}`).value = data.serialNumber;
      worksheet.getCell(`F${startRow + 8 - 1}`).style = leftAlignDataValueStyle;

      // Row 9: Logistics/Construction & Legend
      const row10 = worksheet.getRow(startRow + 9);
      row10.height = 80;
      worksheet.getCell(`A${startRow + 9}`).value = "물류:";
      worksheet.getCell(`A${startRow + 9}`).style = infoStyle;
      worksheet.getCell(`B${startRow + 9}`).value =
        data.category === "물류" ? "O" : "";
      worksheet.getCell(`B${startRow + 9}`).font = {
        bold: true,
        size: 20,
        name: "Malgun Gothic",
      };
      worksheet.getCell(`B${startRow + 9}`).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getCell(`B${startRow + 9}`).border = {
        bottom: { style: "thin" },
      };

      worksheet.getCell(`C${startRow + 9}`).value = "건설:";
      worksheet.getCell(`C${startRow + 9}`).style = infoStyle;
      worksheet.getCell(`D${startRow + 9}`).value =
        data.category === "건설" ? "O" : "";
      worksheet.getCell(`D${startRow + 9}`).font = {
        bold: true,
        size: 20,
        name: "Malgun Gothic",
      };
      worksheet.getCell(`D${startRow + 9}`).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getCell(`D${startRow + 9}`).border = {
        bottom: { style: "thin" },
      };

      worksheet.mergeCells(`F${startRow + 9}:H${startRow + 9}`);
      const legendCell = worksheet.getCell(`F${startRow + 9}`);
      legendCell.value = "양호: o  보통: △  불량: x  해당없음: N";
      legendCell.font = { size: 14, name: "Malgun Gothic" };
      legendCell.alignment = { horizontal: "right", vertical: "middle" };

      if (j < chunk.length - 1) {
        const gapRowNumber = startRow + ROWS_PER_BLOCK; // 11, 22, ...
        const gapRow = worksheet.getRow(gapRowNumber);
        gapRow.height = 120; // 원하는 높이로 조절
      }
      // QR Code insertion for this block
      try {
        const qrDataUrl = await QRCode.toDataURL(data.mgmtNumber, {
          margin: 1,
          width: 300,
        });
        const qrImageId = workbook.addImage({
          base64: qrDataUrl,
          extension: "png",
        });
        worksheet.addImage(qrImageId, {
          tl: { col: 7.8, row: startRow + 1.1 },
          ext: { width: 110, height: 110 },
        });
      } catch (err) {
        console.error("QR insertion failed:", err);
      }
    }
    // Page Setup per Sheet
    worksheet.pageSetup = {
      orientation: "portrait",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0, // Fit to width, let height flow
      horizontalCentered: true,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0,
        footer: 0,
      },
    };
  }

  // Download logic
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
