import * as XLSX from 'xlsx';

/**
 * Exports an array of objects to an Excel (.xlsx) file.
 * 
 * @param data Array of records to export (each object represents a row)
 * @param fileName Name of the file to save (without the extension)
 * @param sheetName Name of the sheet inside the workbook (defaults to 'Report')
 */
export const exportToExcel = (data: Record<string, unknown>[], fileName: string, sheetName: string = 'Report') => {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }
  
  // Create a new worksheet from the JSON data
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Create a new empty workbook
  const workbook = XLSX.utils.book_new();
  
  // Append the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Trigger file download
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
