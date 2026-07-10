import { environment } from "app/enviroment/enviroment";
import * as XLSX from 'xlsx';
import { CalibrationSchedule } from "./alfresa.type";

// cehck for valid email address
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

// remove all whitespace
export function normalizeString(input: string): string {
        return input.replace(/\s+/g, '').toLowerCase();
  }

// allow only one space
export function normalizeWhitespace(input: string): string {
    return input
        .trim()                             // Remove leading/trailing spaces
        .replace(/[\t\n\r]+/g, ' ')         // Replace tabs, newlines, carriage returns with space
        .replace(/ {2,}/g, ' ');            // Replace multiple spaces with a single space
}

/*
check if input string is alfresa code
- length should be 4.
- can contain 0~9, and a~z
*/
export function isValidAlfCode(input: string): boolean {
  if(input.length < environment.alfresaCodeMin
    || input.length > environment.alfresaCodeMax
  )
    return false
  return /^[a-zA-Z0-9]+$/.test(input);
}


export function isValidSerial(serial: string): boolean {
    if(!serial)
            return false
    if(serial.length != 15)
            return false
  return /^\d+$/.test(serial);
}

export function dateAfterXDays(date: Date, days: number): Date{
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
}


export function parseCalibrationXlsx(file: File): Promise<CalibrationSchedule[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const binaryStr: string = e.target.result;
        const workbook: XLSX.WorkBook = XLSX.read(binaryStr, { type: 'binary' });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

        const result: CalibrationSchedule[] = [];

        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          const rowNum = i + 2; // +2 to reflect real Excel row (header is row 1)

          // Validate and parse each field
          const calibrated_logger = String(row['calibrated_logger']).trim();
          const calibration_start = new Date(row['calibration_start']);
          const calibration_end = new Date(row['calibration_end']);
          const candidate_logger = String(row['candidate_logger']).trim();
          const candidate_start = new Date(row['candidate_Start']);

          // Validation
          if (!/^\d+$/.test(calibrated_logger)) {
            throw `Row ${rowNum}: Invalid calibrated_logger serial: ${row['calibrated_logger']}`;
          }

          if (isNaN(calibration_start.getTime())) {
            throw `Row ${rowNum}: Invalid calibration_start date: ${row['calibration_start']}`;
          }

          if (isNaN(calibration_end.getTime())) {
            throw `Row ${rowNum}: Invalid calibration_end date: ${row['calibration_end']}`;
          }

          if (!/^\d+$/.test(candidate_logger)) {
            throw `Row ${rowNum}: Invalid candidate_logger serial: ${row['candidate_logger']}`;
          }

          if (isNaN(candidate_start.getTime())) {
            throw `Row ${rowNum}: Invalid candidate_Start date: ${row['candidate_Start']}`;
          }

          result.push({
            calibrated_logger,
            calibration_start,
            calibration_end,
            candidate_logger,
            candidate_start,
          });
        }
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject('Failed to read the file.');
    };

    reader.readAsBinaryString(file);
  });
}



