
/**
 * AJ솔루션테크 - 통합 데이터 저장 및 조회 스크립트
 * 
 * 1. 마스터파일: 원본 읽기전용
 * 2. 체크리스트_데이터: 저장 및 업데이트용 시트 (이미지 삽입 포함)
 */

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'listSheets') {
    var sheets = ss.getSheets().map(function(s) { return s.getName(); }).filter(function(name) { 
      return name.includes('마스터파일') || name.includes('체크리스트'); 
    });
    return ContentService.createTextOutput(JSON.stringify(sheets)).setMimeType(ContentService.MimeType.JSON);
  }
  
  var sheetName = e.parameter.sheetName || "마스터파일";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  
  var headers = rows[0];
  var data = [];
  for (var i = 1; i < rows.length; i++) {
    var rowData = {};
    for (var j = 0; j < headers.length; j++) { 
      rowData[headers[j]] = rows[i][j]; 
    }
    data.push(rowData);
  }
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "audit"; 
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "체크리스트_데이터";
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var defaultHeaders = [
        "관리번호", "자산번호", "상품코드", "상품명", "제조사", "모델", "년식", 
        "차량번호", "차대번호", "자산실사일", "자산실사 여부", "QR", 
        "자산실사 결과 센터위치", "자산실사 결과 자산위치"
      ];
      sheet.appendRow(defaultHeaders);
      sheet.setRowHeight(1, 30);
    }
    
    var rowsToProcess = Array.isArray(payload.rows) ? payload.rows : [payload];
    var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var mgmtIdx = currentHeaders.indexOf("관리번호");
    var qrIdx = currentHeaders.indexOf("QR");

    rowsToProcess.forEach(function(item) {
      if (action === "checklist") {
        // 1. 데이터 행 추가
        var rowValues = currentHeaders.map(function(h) { 
          // QR 컬럼은 이미지로 삽입할 것이므로 텍스트는 비워둠
          if (h === "QR") return "";
          return item[h] || ""; 
        });
        sheet.appendRow(rowValues);
        var lastRow = sheet.getLastRow();
        sheet.setRowHeight(lastRow, 100); // 이미지 크기에 맞춰 행 높이 조절

        // 2. QR 이미지 삽입 로직
        if (qrIdx > -1 && item["QR"] && item["QR"].indexOf("data:image") === 0) {
          try {
            var base64Data = item["QR"].split(",")[1];
            var decoded = Utilities.base64Decode(base64Data);
            var blob = Utilities.newBlob(decoded, "image/png", "QR_" + item["관리번호"]);
            // 해당 셀 위치에 이미지 삽입 (좌표 미세 조정)
            sheet.insertImage(blob, qrIdx + 1, lastRow).setAnchorCell(sheet.getRange(lastRow, qrIdx + 1)).setHeight(95).setWidth(95);
          } catch (err) {
            sheet.getRange(lastRow, qrIdx + 1).setValue("QR 이미지 오류");
          }
        }
        return;
      }

      // 2. 자산 실사 업데이트
      var targetMgmt = String(item["관리번호"] || "").trim();
      var foundRowIdx = -1;
      if (mgmtIdx > -1 && targetMgmt !== "" && sheet.getLastRow() > 1) {
        var columnData = sheet.getRange(1, mgmtIdx + 1, sheet.getLastRow()).getValues();
        for (var i = 1; i < columnData.length; i++) {
          if (String(columnData[i][0]).trim() === targetMgmt) {
            foundRowIdx = i + 1;
            break;
          }
        }
      }

      if (foundRowIdx > -1) {
        currentHeaders.forEach(function(h, idx) {
          // 실사 시에는 QR 이미지를 새로 삽입하지 않음 (기존 이미지 유지)
          if (h === "QR") return;
          if (item[h] !== undefined && item[h] !== null && String(item[h]).trim() !== "") {
            sheet.getRange(foundRowIdx, idx + 1).setValue(item[h]);
          }
        });
      }
    });

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}
