
/**
 * AJ솔루션테크 - 통합 데이터 관리 스크립트
 * 1. 마스터파일 조회
 * 2. 체크리스트 데이터 저장/업데이트 (Upsert)
 * 3. 자산 실사 결과 업데이트
 * 4. 위치 정보 옵션 조회 (자산위치_데이터 시트 참조)
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 시트 목록 가져오기
  if (action === 'listSheets') {
    const sheets = ss.getSheets()
      .map(s => s.getName())
      .filter(name => name.includes('마스터파일')); 
    return ContentService.createTextOutput(JSON.stringify(sheets))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. 위치 옵션 가져오기 (자산위치_데이터 시트 참조)
  if (action === 'getLocationOptions') {
    const sheet = ss.getSheetByName("자산위치_데이터");
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ centers: [], zones: [] })).setMimeType(ContentService.MimeType.JSON);
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify({ centers: [], zones: [] })).setMimeType(ContentService.MimeType.JSON);
    
    const headers = data[0];
    const centerIdx = headers.indexOf("센터 구분");
    const zoneIdx = headers.indexOf("구역 구분");
    
    let centers = [];
    let zones = [];
    
    for (let i = 1; i < data.length; i++) {
      if (centerIdx > -1 && data[i][centerIdx]) centers.push(String(data[i][centerIdx]).trim());
      if (zoneIdx > -1 && data[i][zoneIdx]) zones.push(String(data[i][zoneIdx]).trim());
    }
    
    // 중복 제거 및 정렬
    const uniqueCenters = [...new Set(centers)].sort();
    const uniqueZones = [...new Set(zones)].sort();
    
    return ContentService.createTextOutput(JSON.stringify({ centers: uniqueCenters, zones: uniqueZones }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 3. 특정 시트 데이터 읽기
  const sheetName = e.parameter.sheetName || "마스터파일";
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  const headers = rows[0];
  const resultData = [];
  for (var i = 1; i < rows.length; i++) {
    var rowData = {};
    for (var j = 0; j < headers.length; j++) {
      rowData[headers[j]] = rows[i][j];
    }
    resultData.push(rowData);
  }
  return ContentService.createTextOutput(JSON.stringify(resultData)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const payload = JSON.parse(e.postData.contents);
    const sheetName = "체크리스트_데이터";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    const targetHeaders = [
      "관리번호", "자산번호", "상품코드", "상품명", "제조사", "모델", "년식", 
      "차량번호", "차대번호", "자산실사일", "자산실사 여부", "QR", 
      "센터위치", "자산위치"
    ];

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(targetHeaders);
      sheet.setRowHeight(1, 30);
    }

    const rowsToProcess = Array.isArray(payload.rows) ? payload.rows : [payload];
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const mgmtColIdx = headers.indexOf("관리번호");
    const qrColIdx = headers.indexOf("QR");

    rowsToProcess.forEach(function(item) {
      const targetMgmtNo = cleanValue(item["관리번호"]);
      if (!targetMgmtNo) return;

      let foundRowIndex = -1;
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const mgmtColumnData = sheet.getRange(1, mgmtColIdx + 1, lastRow).getValues();
        for (let i = 1; i < mgmtColumnData.length; i++) {
          if (cleanValue(mgmtColumnData[i][0]) === targetMgmtNo) {
            foundRowIndex = i + 1;
            break;
          }
        }
      }

      if (foundRowIndex > -1) {
        headers.forEach(function(h, idx) {
          if (h === "QR") return;
          if (item[h] !== undefined && item[h] !== null) {
            sheet.getRange(foundRowIndex, idx + 1).setValue(item[h]);
          }
        });
      } else {
        const newRow = headers.map(function(h) {
          if (h === "QR") return ""; 
          return item[h] || "";
        });
        sheet.appendRow(newRow);
        const currentRowIdx = sheet.getLastRow();
        sheet.setRowHeight(currentRowIdx, 80);

        if (qrColIdx > -1) {
          const qrCell = sheet.getRange(currentRowIdx, qrColIdx + 1);
          const qrFormula = '=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(targetMgmtNo) + '")';
          qrCell.setFormula(qrFormula);
          qrCell.setVerticalAlignment("middle").setHorizontalAlignment("center");
        }
      }
    });

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

function cleanValue(val) {
  if (val === null || val === undefined) return "";
  var s = String(val).trim();
  if (s.indexOf("'") === 0) s = s.substring(1);
  return s;
}
