const Utils = {
  successResponse: function(data) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: data,
      error: null
    })).setMimeType(ContentService.MimeType.JSON);
  },

  errorResponse: function(code, message) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      data: null,
      error: { code: code, message: message }
    })).setMimeType(ContentService.MimeType.JSON);
  }
};
