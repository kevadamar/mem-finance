class BudgetService {
  static get SHEET_NAME() { return 'budgets'; }
  static get HEADERS() { return ['id', 'categoryId', 'amount', 'month', 'year', 'createdAt', 'flagActive']; }
  static get NUMERIC_FIELDS() { return ['amount', 'month', 'year']; }

  static _headerMap(headers) {
    const map = {};
    headers.forEach((h, i) => map[h] = i);
    return map;
  }

  static BOOLEAN_FIELDS() { return ['flagActive']; }

  static _toObj(headers, row) {
    const obj = {};
    headers.forEach((h, i) => {
      if (this.NUMERIC_FIELDS.includes(h)) obj[h] = Number(row[i]);
      else if (this.BOOLEAN_FIELDS.includes(h)) obj[h] = row[i] === true || row[i] === 'TRUE' || row[i] === true;
      else obj[h] = row[i];
    });
    return obj;
  }

  static handle(action, id, data) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.SHEET_NAME);
    if (!sheet) throw new Error('Sheet "budgets" not found');

    switch (action) {
      case 'list': return this.list(sheet);
      case 'get': return this.get(sheet, id);
      case 'create': return this.create(sheet, data);
      case 'update': return this.update(sheet, id, data);
      case 'delete': return this.remove(sheet, id);
      case 'restore': return this.restore(sheet, id);
      default: throw new Error('Unknown action: ' + action);
    }
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
    const map = this._headerMap(headers);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][map.id] === id) return this._toObj(headers, rows[i]);
    }
    throw new Error('NOT_FOUND');
  }

  static create(sheet, data) {
    const existing = this.list(sheet);
    const dup = existing.find(b => b.categoryId === data.categoryId && Number(b.month) === Number(data.month) && Number(b.year) === Number(data.year));
    if (dup) return this.update(sheet, dup.id, data);

    const id = Utilities.getUuid();
    const now = new Date().toISOString();
    const headers = sheet.getDataRange().getValues()[0];
    const row = [];
    this.HEADERS.forEach(h => {
      if (h === 'id') row.push(id);
      else if (h === 'createdAt') row.push(now);
      else if (h === 'flagActive') row.push(true);
      else row.push(data && data[h] !== undefined ? (this.NUMERIC_FIELDS.includes(h) ? Number(data[h]) : data[h]) : '');
    });
    sheet.appendRow(row);
    return this._toObj(headers, row);
  }

  static update(sheet, id, data) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const map = this._headerMap(headers);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][map.id] === id) {
        this.NUMERIC_FIELDS.forEach(f => {
          if (data[f] !== undefined) rows[i][map[f]] = Number(data[f]);
        });
        if (data.flagActive !== undefined) rows[i][map.flagActive] = data.flagActive === true || data.flagActive === 'TRUE';
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([rows[i]]);
        return this._toObj(headers, rows[i]);
      }
    }
    throw new Error('NOT_FOUND');
  }

  static remove(sheet, id) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const map = this._headerMap(headers);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][map.id] === id) {
        rows[i][map.flagActive] = false;
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([rows[i]]);
        return this._toObj(headers, rows[i]);
      }
    }
    throw new Error('NOT_FOUND');
  }

  static restore(sheet, id) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const map = this._headerMap(headers);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][map.id] === id) {
        rows[i][map.flagActive] = true;
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([rows[i]]);
        return this._toObj(headers, rows[i]);
      }
    }
    throw new Error('NOT_FOUND');
  }
}
