import { AlfresaBranch, AlfresaCenter, ALFLOC } from '../service/alfresa/alfresa.type';
import { MobileAdmin, MobileUser } from '../utils/typedef';

export interface AlfresaSiteOption {
    siteType: number;
    siteId: string;
    code: string;
    name: string;
    label: string;
    isBranch: boolean;
    centerId?: string;
}

export function formatAlfresaSiteLabel(code: string | undefined, name: string | undefined): string {
    const c = (code ?? '').trim();
    const n = (name ?? '').trim();
    if (c && n) {
        return `${c}-${n}`;
    }
    return c || n || '--';
}

export function buildAlfresaSiteOptions(
    centers: AlfresaCenter[],
    branches: AlfresaBranch[]
): AlfresaSiteOption[] {
    const options: AlfresaSiteOption[] = [];
    const sortedCenters = [...centers].sort((a, b) =>
        (a.code ?? a.name ?? '').localeCompare(b.code ?? b.name ?? '')
    );

    for (const center of sortedCenters) {
        if (!center.id) {
            continue;
        }
        options.push({
            siteType: ALFLOC.CENTER,
            siteId: center.id,
            code: center.code ?? '',
            name: center.name ?? '',
            label: formatAlfresaSiteLabel(center.code, center.name),
            isBranch: false,
        });

        const centerBranches = branches
            .filter((b) => b.center === center.id)
            .sort((a, b) => (a.code ?? a.name ?? '').localeCompare(b.code ?? b.name ?? ''));

        for (const branch of centerBranches) {
            if (!branch.id) {
                continue;
            }
            options.push({
                siteType: ALFLOC.BRANCH,
                siteId: branch.id,
                code: branch.code ?? '',
                name: branch.name ?? '',
                label: formatAlfresaSiteLabel(branch.code, branch.name),
                isBranch: true,
                centerId: center.id,
            });
        }
    }

    return options;
}

export function filterAlfresaSiteOptions(
    options: AlfresaSiteOption[],
    query: string
): AlfresaSiteOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
        return options;
    }
    return options.filter((opt) =>
        opt.label.toLowerCase().includes(q)
        || opt.code.toLowerCase().includes(q)
        || opt.name.toLowerCase().includes(q)
    );
}

export function encodeSiteSelection(siteType: number, siteId: string): string {
    return `${siteType}:${siteId}`;
}

export function decodeSiteSelection(value: string | null | undefined): { siteType: number; siteId: string } | null {
    if (!value || !value.includes(':')) {
        return null;
    }
    const [typePart, ...idParts] = value.split(':');
    const siteType = Number(typePart);
    const siteId = idParts.join(':');
    if (!siteId || Number.isNaN(siteType)) {
        return null;
    }
    return { siteType, siteId };
}

export function resolveSiteFromMobileUser(
    user: MobileAdmin | MobileUser
): { siteType: number; siteId: string } | null {
    if (user.site_type != null && user.site) {
        return { siteType: user.site_type, siteId: user.site };
    }
    if (user.branch) {
        return { siteType: ALFLOC.BRANCH, siteId: user.branch };
    }
    if (user.center) {
        return { siteType: ALFLOC.CENTER, siteId: user.center };
    }
    return null;
}

export function findAlfresaSiteOption(
    options: AlfresaSiteOption[],
    user: MobileAdmin | MobileUser
): AlfresaSiteOption | undefined {
    const resolved = resolveSiteFromMobileUser(user);
    if (!resolved) {
        return undefined;
    }
    return options.find(
        (opt) => opt.siteType === resolved.siteType && opt.siteId === resolved.siteId
    );
}
