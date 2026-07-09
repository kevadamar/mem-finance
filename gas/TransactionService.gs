class TransactionService {
  static get SHEET_NAME() { return 'transactions'; }
  static get HEADERS() { return ['id', 'type', 'amount', 'categoryId', 'date', 'note', 'createdAt', 'updatedAt', 'flagActive', 'userId']; }

  static handle(action, id, data) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.SHEET_NAME);
    if (!sheet) throw new Error('Sheet "transactions" not found');

    const headers = sheet.getDataRange().getValues()[0] || [];
    if (headers.length < this.HEADERS.length) {
      sheet.getRange(1, headers.length + 1, 1, this.HEADERS.length - headers.length).setValues([this.HEADERS.slice(headers.length)]);
    }

    switch (action) {
      case 'list': return this.list(sheet);
      case 'get': return this.get(sheet, id);
      case 'create': return this.create(sheet, data);
      case 'update': return this.update(sheet, id, data);
      case 'delete': return this.remove(sheet, id);
      default: throw new Error('Unknown action: ' + action);
    }
  }

  static _formatDate(value) {
    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof value === 'string') {
      const parts = value.split('T')[0].split(' ')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(parts)) return parts;
    }
    return String(value);
  }

  static _toObj(headers, row) {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = h === 'date' ? this._formatDate(row[i]) : row[i];
    });
    return obj;
  }

  static list(sheet) {
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return [];
    const headers = rows[0];
    return rows.slice(1).map(row => this._toObj(headers, row));
  }

  static get(sheet, id) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) return this._toObj(headers, rows[i]);
    }
    throw new Error('NOT_FOUND');
  }

  static create(sheet, data) {
    const now = new Date().toISOString();
    const id = Utilities.getUuid();
    const row = [id, data.type, Number(data.amount), data.categoryId, data.date, data.note || '', now, now, true, data.userId || 'default-admin'];
    sheet.appendRow(row);
    const obj = {};
    this.HEADERS.forEach((h, i) => obj[h] = h === 'date' ? this._formatDate(row[i]) : row[i]);
    return obj;
  }

  static update(sheet, id, data) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        const now = new Date().toISOString();
        if (data.type !== undefined) rows[i][1] = data.type;
        if (data.amount !== undefined) rows[i][2] = Number(data.amount);
        if (data.categoryId !== undefined) rows[i][3] = data.categoryId;
        if (data.date !== undefined) rows[i][4] = data.date;
        if (data.note !== undefined) rows[i][5] = data.note;
        if (data.flagActive !== undefined) rows[i][8] = data.flagActive;
        rows[i][7] = now;
        sheet.getRange(i + 1, 1, 1, this.HEADERS.length).setValues([rows[i]]);
        return this._toObj(headers, rows[i]);
      }
    }
    throw new Error('NOT_FOUND');
  }

  static remove(sheet, id) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rows[i][8] = false;
        rows[i][7] = new Date().toISOString();
        sheet.getRange(i + 1, 1, 1, this.HEADERS.length).setValues([rows[i]]);
        return { deleted: true };
      }
    }
    throw new Error('NOT_FOUND');
  }
}
