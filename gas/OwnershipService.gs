// Runs only in the admin-deployed web app after its existing HMAC check.
class OwnershipService {
  static request(method, path, body) {
    const response = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/' + path, {
      method: method,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      contentType: 'application/json',
      payload: body ? JSON.stringify(body) : undefined,
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    if (code < 200 || code >= 300) throw new Error('DRIVE_REQUEST_FAILED_' + code);
    return JSON.parse(response.getContentText());
  }

  static metadata(sheetId) {
    if (!/^[a-zA-Z0-9_-]{20,128}$/.test(sheetId || '')) throw new Error('INVALID_SHEET_ID');
    return this.request('get', 'files/' + encodeURIComponent(sheetId) + '?fields=id,owners(emailAddress),permissions(id,emailAddress,role,pendingOwner)&supportsAllDrives=false');
  }

  static status(sheetId, targetEmail) {
    const file = this.metadata(sheetId);
    const admin = Session.getEffectiveUser().getEmail().toLowerCase();
    const owner = (file.owners && file.owners[0] && file.owners[0].emailAddress || '').toLowerCase();
    const permissions = file.permissions || [];
    const adminPermission = permissions.find(p => (p.emailAddress || '').toLowerCase() === admin);
    const targetPermission = targetEmail ? permissions.find(p => (p.emailAddress || '').toLowerCase() === targetEmail.toLowerCase()) : null;
    return { ownerEmail: owner, adminEmail: admin, adminRole: adminPermission && adminPermission.role || (owner === admin ? 'owner' : ''), pendingOwner: !!(targetPermission && targetPermission.pendingOwner) };
  }

  static initiate(sheetId, targetEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail || '')) throw new Error('INVALID_GOOGLE_ACCOUNT');
    const current = this.status(sheetId, targetEmail);
    if (!current.adminEmail || current.ownerEmail !== current.adminEmail) throw new Error('NOT_ADMIN_OWNED');
    if (targetEmail.toLowerCase() === current.adminEmail) throw new Error('SAME_OWNER');
    if (current.pendingOwner) return current;
    const file = this.metadata(sheetId);
    const existing = (file.permissions || []).find(p => (p.emailAddress || '').toLowerCase() === targetEmail.toLowerCase());
    const path = 'files/' + encodeURIComponent(sheetId) + '/permissions' + (existing ? '/' + encodeURIComponent(existing.id) : '') + '?fields=id,pendingOwner&sendNotificationEmail=true';
    this.request(existing ? 'patch' : 'post', path, existing
      ? { role: 'writer', pendingOwner: true }
      : { type: 'user', role: 'writer', emailAddress: targetEmail, pendingOwner: true });
    return this.status(sheetId, targetEmail);
  }
}
