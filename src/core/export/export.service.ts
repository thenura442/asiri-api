import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  // ExcelJS + PDFKit will be wired in during Phase 8 (Reports)
  async exportToCsv(data: Record<string, any>[], filename: string): Promise<Buffer> {
    this.logger.log(`CSV export requested: ${filename}`);
    const headers = Object.keys(data[0] ?? {}).join(',');
    const rows = data.map((row) => Object.values(row).join(','));
    return Buffer.from([headers, ...rows].join('\n'));
  }
}