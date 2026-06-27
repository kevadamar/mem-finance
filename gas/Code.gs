function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, table, id, data } = payload;

    let result;
    switch (table) {
      case 'transactions': result = TransactionService.handle(action, id, data); break;
      case 'categories': result = CategoryService.handle(action, id, data); break;
      case 'budgets': result = BudgetService.handle(action, id, data); break;
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
