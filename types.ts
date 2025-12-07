export interface ProcessedResult {
  markdown: string;
  rawResponse: string;
}

export interface UploadedFile {
  id: string;
  previewUrl: string;
  file: File;
  base64: string;
  mimeType: string;
}

export interface ResultItem {
  imageId: string;
  markdown: string;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
