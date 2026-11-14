/**
 * KONFIGURASI APLIKASI SIMULASI TKA
 * Terhubung langsung ke Google Sheets melalui Google Apps Script Web App
 */
const CONFIG = {
  APP_NAME: 'SIMULASI TKA',
  APP_SUBTITLE: 'PUSMENDIK - APLIKASI ANBK',

  // Google Apps Script Web App Deployment URL
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwSLG9EwzZzbHIDWsaCuysPYqAV1Q1g60xFp7CxICK40WSuobFYU5UUq4YsXLh0BWHb/exec',

  // Google Spreadsheet Database URL
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1-lmnt6pcZ_wYjDrPRwZnNYswFMj75TNNuN3IJSXWl00/edit?usp=sharing',

  // Timeout koneksi (milidetik)
  TIMEOUT_MS: 20000
};

Object.freeze(CONFIG);
