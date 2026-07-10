var GAS_SHARED_SECRET = 'replace-with-actual-secret';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (!validateSignature(e)) return Utils.errorResponse('INVALID_SIGNATURE', 'Unauthorized');
    const { action, table, id, data, sheetId } = payload;

    // Handle create_sheet before table routing
    if (action === 'create_sheet') {
      return handleCreateSheet(e);
    }

    let result;
    switch (table) {
      case 'transactions': result = TransactionService.handle(action, id, data, sheetId); break;
      case 'categories': result = CategoryService.handle(action, id, data, sheetId); break;
      case 'budgets': result = BudgetService.handle(action, id, data, sheetId); break;
      default: return Utils.errorResponse('INVALID_TABLE', 'Unknown table: ' + table);
    }

    return Utils.successResponse(result);
  } catch (err) {
    return Utils.errorResponse('INTERNAL_ERROR', err.message);
  }
}

function doGet() {
  return Utils.successResponse({ status: 'ok', timestamp: new Date().toISOString() });
}

function validateSignature(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { signature, timestamp } = payload;
    if (!signature || !timestamp) return false;
    if (Math.abs(Date.now() / 1000 - timestamp) > 60) return false;
    const toSign = JSON.stringify({ action: payload.action, table: payload.table, data: payload.data, id: payload.id, timestamp });
    const expected = Utilities.computeHmacSha256Signature(toSign, GAS_SHARED_SECRET)
      .map(function(b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
    return signature === expected;
  } catch(e) {
    return false;
  }
}
