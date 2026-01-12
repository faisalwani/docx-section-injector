
export interface ParagraphMetadata {
  index: number;
  text: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface DocContext {
  zip: any;
  xmlDoc: Document;
  body: Element;
  paragraphs: HTMLCollectionOf<Element>;
}
