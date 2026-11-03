// SheetManager.gs — Creates user-specific spreadsheet copies from a template
var TEMPLATE_SHEET_ID = 'replace-with-template-sheet-id';

function authorizeMemFinanceAccess() {
  if (!TEMPLATE_SHEET_ID || TEMPLATE_SHEET_ID === 'replace-with-template-sheet-id') {
    throw new Error('Set TEMPLATE_SHEET_ID before authorizing MemFinance access');
  }

  var templateFile = DriveApp.getFileById(TEMPLATE_SHEET_ID);
  var ss = SpreadsheetApp.openById(TEMPLATE_SHEET_ID);

  return {
    ok: true,
    templateName: templateFile.getName(),
    spreadsheetName: ss.getName()
  };
}

function testCreateSheet() {
  return createSheetForUser('manual-test-' + Date.now());
}

function handleCreateSheet(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('handleCreateSheet must be called by doPost. Run authorizeMemFinanceAccess or testCreateSheet manually.');
  }

  const payload = JSON.parse(e.postData.contents);
  const { userId } = payload.data || {};

  return createSheetForUser(userId);
}

function createSheetForUser(userId) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(userId || '')) throw new Error('Invalid userId');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var name = 'MemFinance_' + userId;
    var existing = DriveApp.getFilesByName(name);
    while (existing.hasNext()) {
      var candidate = existing.next();
      if (candidate.getOwner().getEmail() !== Session.getEffectiveUser().getEmail()) {
        throw new Error('SHEET_OWNERSHIP_NEEDS_RECOVERY');
      }
      return Utils.successResponse({ gaSheetId: candidate.getId() });
    }

    var templateFile = DriveApp.getFileById(TEMPLATE_SHEET_ID);
    var copy = templateFile.makeCopy(name);
    var sheetId = copy.getId();
    var ss = SpreadsheetApp.openById(sheetId);
    prepareUserSpreadsheet(ss);
    return Utils.successResponse({ gaSheetId: sheetId });
  } finally {
    lock.releaseLock();
  }
}

function prepareUserSpreadsheet(ss) {
  keepOnlyDefaultCategories(ss.getSheetByName('categories'));
  clearDataRows(ss.getSheetByName('transactions'));
  clearDataRows(ss.getSheetByName('budgets'));
}

function clearDataRows(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
}

function keepOnlyDefaultCategories(sheet) {
  if (!sheet) return;

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    CategoryService.seed(sheet);
    return;
  }

  var headers = values[0];
  var isDefaultIndex = headers.indexOf('isDefault');
  var flagActiveIndex = headers.indexOf('flagActive');
  if (isDefaultIndex === -1 || flagActiveIndex === -1) {
    throw new Error('categories sheet must include isDefault and flagActive columns');
  }

  var defaultRows = values.slice(1).filter(function(row) {
    return isTruthyCell(row[isDefaultIndex]) && isTruthyCell(row[flagActiveIndex]);
  });

  clearDataRows(sheet);
  if (defaultRows.length > 0) {
    sheet.getRange(2, 1, defaultRows.length, headers.length).setValues(defaultRows);
  } else {
    CategoryService.seed(sheet);
  }
}

function isTruthyCell(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}
