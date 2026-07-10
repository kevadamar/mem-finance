// SheetManager.gs — Creates user-specific spreadsheet copies from a template
var TEMPLATE_SHEET_ID = 'replace-with-template-sheet-id';

function handleCreateSheet(e) {
  const payload = JSON.parse(e.postData.contents);
  const { userId } = payload.data || {};

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
