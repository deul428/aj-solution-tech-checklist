
/**
 * AJ솔루션테크 - 통합 데이터 관리 스크립트
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 계층형 위치 옵션 가져오기 (센터 -> 구역 매핑)
  if (action === 'getLocationOptions') {
    const sheet = ss.getSheetByName("자산위치_데이터");
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({})).setMimeType(ContentService.MimeType.JSON);
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify({})).setMimeType(ContentService.MimeType.JSON);
    
    const headers = data[0].map(h => String(h).trim());
    
    // 헤더 명칭 정밀 매칭: "센터"와 "구분"이 포함된 것 우선, 없으면 "센터" 포함된 것
    let centerIdx = headers.findIndex(h => h.includes("센터") && h.includes("구분"));
    if (centerIdx === -1) centerIdx = headers.findIndex(h => h.includes("센터"));
    
    let zoneIdx = headers.findIndex(h => h.includes("구역") && h.includes("구분"));
    if (zoneIdx === -1) zoneIdx = headers.findIndex(h => h.includes("구역") || h.includes("위치"));
    
    if (centerIdx === -1) centerIdx = 0; 
    if (zoneIdx === -1) zoneIdx = 1;

    let mapping = {};
    
    for (let i = 1; i < data.length; i++) {
      const center = String(data[i][centerIdx] || "").trim();
      const zone = String(data[i][zoneIdx] || "").trim();
      
      if (!center || center === "undefined" || center === "null" || center === "센터 구분") continue;
      
      if (!mapping[center]) {
        mapping[center] = [];
      }
      
      if (zone && zone !== "undefined" && zone !== "null" && zone !== "구역 구분" && !mapping[center].includes(zone)) {
        mapping[center].push(zone);
      }
    }
    
    // 가나다순/숫자순 정렬
    for (let center in mapping) {
      mapping[center].sort();
    }
    
    return ContentService.createTextOutput(JSON.stringify(mapping))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'listSheets') {
    const sheets = ss.getSheets()
      .map(s => s.getName())
      .filter(name => name.includes('마스터파일')); 
    return ContentService.createTextOutput(JSON.stringify(sheets))
      .setMimeType(ContentService.MimeType.JSON);
  }

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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (payload.action === "audit") {
      return handleAuditUpdate(ss, payload.rows);
    } else {
      return handleChecklistSync(ss, payload.rows);
    }
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

function handleChecklistSync(ss, rowsToProcess) {
  const sheetName = "체크리스트_데이터";
  let sheet = ss.getSheetByName(sheetName);
  const targetHeaders = ["관리번호", "자산번호", "상품코드", "상품명", "제조사", "모델", "년식", "차량번호", "차대번호", "자산실사일", "자산실사 여부", "QR", "센터위치", "자산위치"];
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(targetHeaders);
  }
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
      if (qrColIdx > -1) {
        const qrCell = sheet.getRange(currentRowIdx, qrColIdx + 1);
        const qrFormula = '=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(targetMgmtNo) + '")';
        qrCell.setFormula(qrFormula);
      }
    }
  });
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}

function handleAuditUpdate(ss, rowsToProcess) {
  return handleChecklistSync(ss, rowsToProcess);
}

function cleanValue(val) {
  if (val === null || val === undefined) return "";
  var s = String(val).trim();
  if (s.indexOf("'") === 0) s = s.substring(1);
  return s;
}
