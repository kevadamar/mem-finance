class CategoryService {
  static get SHEET_NAME() { return 'categories'; }
  static get HEADERS() { return ['id', 'name', 'type', 'color', 'icon', 'isDefault', 'flagActive', 'userId']; }

  static handle(action, id, data) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.SHEET_NAME);
    if (!sheet) throw new Error('Sheet "categories" not found');

    switch (action) {
      case 'list': return this.list(sheet);
      case 'get': return this.get(sheet, id);
      case 'create': return this.create(sheet, data);
      case 'update': return this.update(sheet, id, data);
      case 'delete': return this.remove(sheet, id);
      case 'seed': return this.seed(sheet);
      case 'restore': return this.restore(sheet, id);
      default: throw new Error('Unknown action: ' + action);
    }
  }

  static _toObj(headers, row) {
    const obj = {};
    headers.forEach((h, i) => {
      if (h === 'isDefault' || h === 'flagActive') obj[h] = row[i] === true || row[i] === 'TRUE' || row[i] === true;
      else obj[h] = row[i];
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
    const existing = this.list(sheet);
    if (existing.some(c => c.name === data.name && c.type === data.type)) {
      throw new Error('DUPLICATE_NAME');
    }
    const id = Utilities.getUuid();
    const row = [id, data.name, data.type, data.color, data.icon, false, true, data.userId || 'default-admin'];
    sheet.appendRow(row);
    return this._toObj(this.HEADERS, row);
  }

  static update(sheet, id, data) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        if (data.name !== undefined) rows[i][1] = data.name;
        if (data.color !== undefined) rows[i][3] = data.color;
        if (data.icon !== undefined) rows[i][4] = data.icon;
        if (data.flagActive !== undefined) rows[i][6] = data.flagActive === true;
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
        if (rows[i][5] === true || rows[i][5] === 'TRUE') throw new Error('Cannot delete default category');
        rows[i][6] = false;
        sheet.getRange(i + 1, 1, 1, this.HEADERS.length).setValues([rows[i]]);
        return this._toObj(headers, rows[i]);
      }
    }
    throw new Error('NOT_FOUND');
  }

  static restore(sheet, id) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rows[i][6] = true;
        sheet.getRange(i + 1, 1, 1, this.HEADERS.length).setValues([rows[i]]);
        return this._toObj(headers, rows[i]);
      }
    }
    throw new Error('NOT_FOUND');
  }

  static seed(sheet) {
    const existing = this.list(sheet);
    if (existing.length > 0) return existing;

    const defaults = [
      ['Makanan', 'expense', '#FF6B6B', 'utensils-crossed'],
      ['Minuman', 'expense', '#F59E0B', 'cup-soda'],
      ['Jajan & Cemilan', 'expense', '#F97316', 'cookie'],
      ['Transportasi', 'expense', '#4ECDC4', 'car'],
      ['Bensin & Parkir', 'expense', '#06B6D4', 'fuel'],
      ['Ojek & Taksi', 'expense', '#F43F5E', 'bike'],
      ['Belanja', 'expense', '#FFE66D', 'shopping-bag'],
      ['Pulsa & Kuota', 'expense', '#8B5CF6', 'smartphone'],
      ['Hiburan', 'expense', '#A78BFA', 'gamepad-2'],
      ['Streaming', 'expense', '#EC4899', 'tv'],
      ['Tagihan', 'expense', '#F97316', 'receipt'],
      ['Listrik & Air', 'expense', '#FBBF24', 'zap'],
      ['Kesehatan', 'expense', '#22C55E', 'heart-pulse'],
      ['Pendidikan', 'expense', '#3B82F6', 'graduation-cap'],
      ['Rokok', 'expense', '#A1A1AA', 'cigarette'],
      ['Kos/Kontrakan', 'expense', '#F472B6', 'home'],
      ['Investasi', 'expense', '#10B981', 'trending-up'],
      ['E-commerce', 'expense', '#6366F1', 'shopping-cart'],
      ['Donasi', 'expense', '#14B8A6', 'heart'],
      ['Lainnya', 'expense', '#6B7280', 'more-horizontal'],
      ['Gaji', 'income', '#22C55E', 'briefcase'],
      ['Freelance', 'income', '#3B82F6', 'laptop'],
      ['Investasi', 'income', '#A78BFA', 'trending-up'],
      ['Hadiah', 'income', '#FF6B6B', 'gift'],
      ['Refund', 'income', '#4ECDC4', 'rotate-ccw'],
      ['Lainnya', 'income', '#6B7280', 'more-horizontal']
    ];

    const results = [];
    for (const [name, type, color, icon] of defaults) {
      const id = Utilities.getUuid();
      sheet.appendRow([id, name, type, color, icon, true, true]);
      results.push({ id, name, type, color, icon, isDefault: true, flagActive: true });
    }
    return results;
  }
}
