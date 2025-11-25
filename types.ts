export enum PageState {
  RECON = 'RECON',
  EXTRACTION = 'EXTRACTION',
  THE_RAID = 'THE_RAID'
}

export interface CompetitorInfo {
  name: string;
  address: string;
  rating?: number;
  placeUri?: string;
  userProvidedUrl?: string; // Optional website URL provided by user
}

export interface ScrapeResult {
  rawText: string;
  sources: { title: string; uri: string }[];
  websiteUrl?: string;
  websiteSummary?: string;
  reviewCount?: number;
}

export interface Lead {
  customerName: string;
  complaint: string;
  painPointCategory: 'Price' | 'Service' | 'Quality' | 'Delivery' | 'Other';
  sentimentScore: number; // 1-10 (10 being extremely angry/hot lead)
  suggestedPitchAngle: string;
}

export interface ExtractionResult {
  leads: Lead[];
  summary: string;
}

export interface PitchStrategy {
  subjectLine: string;
  emailBody: string;
  inPersonScript: string;
  keySellingPoints: string[];
}