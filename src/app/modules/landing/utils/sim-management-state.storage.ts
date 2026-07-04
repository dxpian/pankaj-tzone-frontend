/** Persist SIM Management filters, pagination, and row selection (session tab). */

export const SIM_MANAGEMENT_STATE_KEY = 'landing:simManagement:state';

export interface SimManagementBrowseState {
    keyword: string;
    expireBeforeDate: string;
    includeUnknownEndDate: boolean;
    pageIndex: number;
    pageSize: number;
    uncheckedSerials: string[];
    applyResultText?: string;
}

export function readSimManagementState(): SimManagementBrowseState | null {
    try {
        const raw = sessionStorage.getItem(SIM_MANAGEMENT_STATE_KEY);
        if (!raw) {
            return null;
        }
        const o = JSON.parse(raw);
        if (
            typeof o.keyword !== 'string' ||
            typeof o.expireBeforeDate !== 'string' ||
            typeof o.includeUnknownEndDate !== 'boolean' ||
            typeof o.pageIndex !== 'number' ||
            typeof o.pageSize !== 'number' ||
            !Array.isArray(o.uncheckedSerials)
        ) {
            return null;
        }
        return o as SimManagementBrowseState;
    } catch {
        return null;
    }
}

export function writeSimManagementState(state: SimManagementBrowseState): void {
    try {
        sessionStorage.setItem(SIM_MANAGEMENT_STATE_KEY, JSON.stringify(state));
    } catch {
        /* ignore */
    }
}
