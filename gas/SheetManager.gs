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
  if (!userId) throw new Error('Missing userId');

  var templateFile = DriveApp.getFileById(TEMPLATE_SHEET_ID);
  var copy = templateFile.makeCopy('MemFinance_' + userId);
  var sheetId = copy.getId();

  // Seed default categories into the new sheet
  var ss = SpreadsheetApp.openById(sheetId);
  var catSheet = ss.getSheetByName('categories');
  if (catSheet && catSheet.getDataRange().getValues().length <= 1) {
    var existing = CategoryService.list(catSheet);
    if (existing.length === 0) {
      CategoryService.seed(catSheet);
    }
  }

  return Utils.successResponse({ gaSheetId: sheetId });
}
