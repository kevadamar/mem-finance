class BudgetService {
  static get SHEET_NAME() { return 'budgets'; }
  static get HEADERS() { return ['id', 'categoryId', 'amount', 'month', 'year', 'createdAt']; }

  static handle(action, id, data) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.SHEET_NAME);
    if (!sheet) throw new Error('Sheet "budgets" not found');

    switch (action) {
      case 'list': return this.list(sheet);
      case 'get': return this.get(sheet, id);
      case 'create': return this.create(sheet, data);
      case 'update': return this.update(sheet, id, data);
      case 'delete': return this.remove(sheet, id);
      default: throw new Error('Unknown action: ' + action);
    }
  }

  static list(sheet) {
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return [];
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = ['amount', 'month', 'year'].includes(h) ? Number(row[i]) : row[i]);
      return obj;
    });
  }

  static get(sheet, id) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        const obj = {};
        headers.forEach((h, j) => obj[h] = ['amount', 'month', 'year'].includes(h) ? Number(rows[i][j]) : rows[i][j]);
        return obj;
      }
    }
    throw new Error('NOT_FOUND');
  }

  static create(sheet, data) {
    const existing = this.list(sheet);
    const dup = existing.find(b => b.categoryId === data.categoryId && Number(b.month) === Number(data.month) && Number(b.year) === Number(data.year));
    if (dup) return this.update(sheet, dup.id, data);

    const id = Utilities.getUuid();
    const now = new Date().toISOString();
    const row = [id, data.categoryId, Number(data.amount), Number(data.month), Number(data.year), now];
    sheet.appendRow(row);
    const obj = {};
    this.HEADERS.forEach((h, i) => obj[h] = ['amount', 'month', 'year'].includes(h) ? row[i] : row[i]);
    return obj;
  }

  static update(sheet, id, data) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        if (data.amount !== undefined) rows[i][2] = Number(data.amount);
        if (data.month !== undefined) rows[i][3] = Number(data.month);
        if (data.year !== undefined) rows[i][4] = Number(data.year);
        sheet.getRange(i + 1, 1, 1, this.HEADERS.length).setValues([rows[i]]);
        const obj = {};
        headers.forEach((h, j) => obj[h] = ['amount', 'month', 'year'].includes(h) ? Number(rows[i][j]) : rows[i][j]);
        return obj;
      }
    }
    throw new Error('NOT_FOUND');
  }

  static remove(sheet, id) {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { deleted: true };
      }
    }
    throw new Error('NOT_FOUND');
  }
}
