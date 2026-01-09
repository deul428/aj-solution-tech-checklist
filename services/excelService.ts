
import XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import QRCode from 'qrcode';
import { MasterDataRow, ChecklistData } from '../types';

/**
 * Parses an uploaded Excel file into JSON data using XLSX for performance.
 */
export const parseMasterExcel = (file: File): Promise<MasterDataRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
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
 * Generates and downloads a stylized Excel file with a QR code using exceljs.
 */
export const downloadChecklistExcel = async (data: ChecklistData, fileName: string = 'checklist.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Checklist');

  // 오늘 날짜 생성
  const today = new Date();
  const yyyy_mm_dd = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`;

  // 1. Column Widths (Adjusted for A4 full width)
  worksheet.columns = [
    { width: 14 }, { width: 18 }, { width: 14 }, { width: 18 },
    { width: 16 }, { width: 16 }, { width: 16 }, { width: 18 }
  ];

  // 2. Styles
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  const headerLabelStyle: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } },
    font: { bold: true, size: 16, name: 'Malgun Gothic' },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: thinBorder
  };

  const dataValueStyle: Partial<ExcelJS.Style> = {
    font: { size: 16, name: 'Malgun Gothic' },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: thinBorder
  };

  const leftAlignDataValueStyle: Partial<ExcelJS.Style> = {
    ...dataValueStyle,
    alignment: { horizontal: 'left', vertical: 'middle', indent: 1 }
  };

  // 3. Populate Rows
  
  // Row 1: Title and MGMT
  const row1 = worksheet.getRow(1);
  row1.height = 120;
  worksheet.mergeCells('A1:D1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '상품/임가/경,중 체크리스트';
  titleCell.font = { bold: true, size: 32, name: 'Malgun Gothic' };
  titleCell.alignment = { horizontal: 'left', vertical: 'bottom' };

  const mgmtCell = worksheet.getCell('H1');
  mgmtCell.value = `관리번호: ${data.mgmtNumber}`;
  mgmtCell.font = { size: 16, name: 'Malgun Gothic', underline: true };
  mgmtCell.alignment = { horizontal: 'right', vertical: 'bottom' };

  // Row 2: Header Border Line (Visual distinction)
  worksheet.getRow(2).height = 10;
  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').border = { bottom: { style: 'medium' } };

  // Row 3: Inspect Info (Spacious for QR and Hand-writing)
  const row3 = worksheet.getRow(3);
  row3.height = 160; 
  
  const infoStyle: Partial<ExcelJS.Style> = { font: { size: 16, name: 'Malgun Gothic' }, alignment: { vertical: 'middle' } };
  
  worksheet.getCell('A3').value = `점검일자:  ${yyyy_mm_dd}`; 
  // worksheet.getCell('A3').font = { size: 11, italic: true, name: 'Malgun Gothic' };
  // worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
 
  worksheet.getCell('C3').value = '정비자:';
  // worksheet.getCell('C3').font = { size: 11, italic: true, name: 'Malgun Gothic' };
  // worksheet.getCell('C3').alignment = { horizontal: 'right', vertical: 'middle' };
  
  worksheet.getCell('E3').value = 'QC:';
  // worksheet.getCell('E3').font = { size: 11, italic: true, name: 'Malgun Gothic' };
  // worksheet.getCell('E3').alignment = { horizontal: 'right', vertical: 'middle' };
  

  // Row 5: Product Code & Name
  const row5 = worksheet.getRow(5);
  row5.height = 90; // Matching h-16 in web (approx 48px)
  worksheet.getCell('A5').value = '상품코드';
  worksheet.getCell('A5').style = headerLabelStyle;
  worksheet.getCell('B5').value = data.productCode;
  worksheet.getCell('B5').style = dataValueStyle;
  worksheet.getCell('C5').value = '상품명';
  worksheet.getCell('C5').style = headerLabelStyle;

  worksheet.mergeCells('D5:H5');
  for (let c = 4; c <= 8; c++) {
    worksheet.getRow(5).getCell(c).border = thinBorder;
  }
  const prodNameCell = worksheet.getCell('D5');
  prodNameCell.value = data.productName;
  prodNameCell.style = leftAlignDataValueStyle;

  // Row 6: Manufacturer, Model, Year, Usage
  const row6 = worksheet.getRow(6);
  row6.height = 90;
  const row6Labels = ['제조사', '모델', '년식', '사용시간'];
  const row6Keys = ['manufacturer', 'model', 'year', 'usageTime'];
  
  worksheet.getCell('A6').value = '제조사';
  worksheet.getCell('A6').style = headerLabelStyle;
  worksheet.getCell('B6').value = data.manufacturer;
  worksheet.getCell('B6').style = dataValueStyle;
  
  worksheet.getCell('C6').value = '모델';
  worksheet.getCell('C6').style = headerLabelStyle;
  worksheet.getCell('D6').value = data.model;
  worksheet.getCell('D6').style = dataValueStyle;
  
  worksheet.getCell('E6').value = '년식';
  worksheet.getCell('E6').style = headerLabelStyle;
  worksheet.getCell('F6').value = data.year;
  worksheet.getCell('F6').style = dataValueStyle;
  
  worksheet.getCell('G6').value = '사용시간';
  worksheet.getCell('G6').style = headerLabelStyle;
  worksheet.getCell('H6').value = ''; // Placeholder
  worksheet.getCell('H6').style = dataValueStyle;

  // Row 7: Asset, Vehicle, Serial
  const row7 = worksheet.getRow(7);
  row7.height = 90;
  worksheet.getCell('A7').value = '자산번호';
  worksheet.getCell('A7').style = headerLabelStyle;
  worksheet.getCell('B7').value = data.assetNumber;
  worksheet.getCell('B7').style = dataValueStyle;
  
  worksheet.getCell('C7').value = '차량번호';
  worksheet.getCell('C7').style = headerLabelStyle;
  worksheet.getCell('D7').value = data.vehicleNumber;
  worksheet.getCell('D7').style = dataValueStyle;
  
  worksheet.getCell('E7').value = '차대번호';
  worksheet.getCell('E7').style = headerLabelStyle;

  worksheet.mergeCells('F7:H7');
  for (let c = 6; c <= 8; c++) {
    worksheet.getRow(7).getCell(c).border = thinBorder;
  }
  const serialCell = worksheet.getCell('F7');
  serialCell.value = data.serialNumber;
  serialCell.style = leftAlignDataValueStyle;

  // Row 9: Footer
  const row9 = worksheet.getRow(9);
  row9.height = 90;
  worksheet.getCell('A9').value = '물류:';
  worksheet.getCell('C9').value = '건설:';
  worksheet.getCell('A9').style = infoStyle;
  worksheet.getCell('C9').style = infoStyle;
  worksheet.mergeCells('F9:H9');
  const legendCell = worksheet.getCell('F9');
  legendCell.value = '양호: o  보통: △  불량: x  해당없음: N';
  legendCell.font = { size: 11, italic: true, name: 'Malgun Gothic' };
  legendCell.alignment = { horizontal: 'right', vertical: 'middle' };

  // 4. Generate & Insert QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL(data.mgmtNumber, { margin: 1, width: 200 });
    const qrImageId = workbook.addImage({
      base64: qrDataUrl,
      extension: 'png',
    }); 
     
    // This provides a clean fit under the mgmt number.
    const IMAGE_SIZE_PX = 90; 

    worksheet.addImage(qrImageId, {
      tl: { col: 7.1, row: 2.1 }, // Column H, Row 3
      ext: { width: IMAGE_SIZE_PX, height: IMAGE_SIZE_PX }
    }); 
  } catch (err) {
    console.error('QR insertion failed:', err);
  }

  // 5. Page Setup for Print
  worksheet.pageSetup = {
    orientation: 'portrait',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0, footer: 0 }
  };

  // 6. Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
