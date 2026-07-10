/** Persist list filter/search across navigation to device detail and back (session tab). */

export const LIST_BROWSE_DEVICE_MANAGEMENT_KEY = 'landing:listBrowse:device-management';
export const LIST_BROWSE_REAL_TIME_MONITORING_KEY = 'landing:listBrowse:real-time-monitoring';

export type LoggerViewMode = 'list' | 'card';

export interface ListBrowseState {
  filter: number;
  keyword: string;
  pageIndex: number;
  pageSize: number;
  viewMode?: LoggerViewMode;
}

export function readListBrowseState(key: string): ListBrowseState | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const o = JSON.parse(raw);
    if (
      typeof o.filter !== 'number' ||
      typeof o.keyword !== 'string' ||
      typeof o.pageIndex !== 'number' ||
      typeof o.pageSize !== 'number'
    ) {
      return null;
    }
    return o as ListBrowseState;
  } catch {
    return null;
  }
}

export function writeListBrowseState(key: string, state: ListBrowseState): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
