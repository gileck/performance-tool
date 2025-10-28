export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  [key: string]: any;
}

export interface PerformanceData {
  type: string;
  data: PerformanceEntry[];
  siteModels?: {
    publicModel?: {
      externalBaseUrl?: string;
      siteDisplayName?: string;
    };
  };
}

export type TabType = 'timeline' | 'table' | 'resources' | 'settings';
export type ResourceViewTab = 'all' | 'services' | 'pie';
export type SortDirection = 'asc' | 'desc';

export interface ResourceExtras {
  resource_subtype?: string;
  file_type?: string;
  service?: string;
  file_name?: string;
  file_extension?: string;
  api_name?: string;
}

export interface TimelineBounds {
  min: number;
  max: number;
}

export interface EventWithPosition extends PerformanceEntry {
  lane: number;
}

export interface CursorPosition {
  x: number;
  time: number;
}

