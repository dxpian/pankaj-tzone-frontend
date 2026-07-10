import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { DB_RESULT } from '../../utils/typedef';
import { LicenseService } from '../service/license.service';

type LicenseItem = { id: string; name: string; code: string };
type EligibleUser = { id: string; name: string; email: string; permission: number };
type FeatureItem = { id: string; name: string; code: string; category?: number; description?: string };
type LicenseStatus = {
    user: EligibleUser;
    licenses: LicenseItem[];
    expireDate: string | null;
    overrideFeatureCount?: number;
};

@Component({
    selector: 'app-license-allocation',
    templateUrl: './license-allocation.component.html',
    styleUrls: ['./license-allocation.component.scss'],
})
export class LicenseAllocationComponent implements OnInit {
    @ViewChild('allocationDialog', { static: true }) allocationDialog!: TemplateRef<any>;
    displayedColumns: string[] = ['name', 'email', 'licenses', 'overrideFeatureCount', 'expireDate', 'action'];
    dataSource = new MatTableDataSource<LicenseStatus>([]);
    statuses: LicenseStatus[] = [];
    users: EligibleUser[] = [];
    licenses: LicenseItem[] = [];
    features: FeatureItem[] = [];
    searchControl = new FormControl('');
    userSearchControl = new FormControl('');
    licenseSearchControl = new FormControl('');
    featureSearchControl = new FormControl('');
    selectedUserId = '';
    selectedLicenseIds = new Set<string>();
    selectedFeatureIds = new Set<string>();
    selectedExpireDate: Date | null = null;
    copiedLicenseIds: string[] = [];
    copiedFeatureIds: string[] = [];
    copiedExpireDate: Date | null = null;
    saving = false;
    minExpireDate = new Date();
    overrideTooltipMap = new Map<string, string>();
    private readonly SEARCH_STORAGE_KEY = 'license-allocation.search.keyword';

    constructor(
        private licenseService: LicenseService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
    ) {}

    ngOnInit(): void {
        this.load();
        this.searchControl.valueChanges.subscribe((v) => {
            const value = v ?? '';
            localStorage.setItem(this.SEARCH_STORAGE_KEY, value);
            this.applyFilter(value);
        });
        this.userSearchControl.valueChanges.subscribe(() => {
            const list = this.filteredUsers();
            if (list.length > 0) {
                this.selectedUserId = list[0].id;
            }
        });
    }

    async load(): Promise<void> {
        const [u, l, s] = await Promise.all([
            this.licenseService.readEligibleUsers(),
            this.licenseService.getLicenseStats(),
            this.licenseService.readLicenseStatus(),
        ]);
        const f = (await this.licenseService.getFeatures()) as DB_RESULT;
        this.users = (((u as DB_RESULT).object ?? []) as EligibleUser[]);
        this.licenses = (((l as DB_RESULT).object ?? []) as any[]).map((x) => ({ id: x.id, name: x.name, code: x.code }));
        this.statuses = ((s as DB_RESULT).object ?? []) as LicenseStatus[];
        this.features = ((f.object ?? []) as FeatureItem[]) ?? [];
        this.dataSource.data = this.statuses;
        const cachedSearch = localStorage.getItem(this.SEARCH_STORAGE_KEY) ?? '';
        this.searchControl.setValue(cachedSearch, { emitEvent: false });
        this.applyFilter(cachedSearch);
        await this.refreshOverrideTooltips();
    }

    openCreate(): void {
        this.selectedUserId = '';
        this.selectedLicenseIds = new Set(this.copiedLicenseIds);
        this.selectedFeatureIds = new Set(this.copiedFeatureIds);
        this.selectedExpireDate = this.copiedExpireDate;
        this.dialog.open(this.allocationDialog, { width: '900px', disableClose: false });
    }

    async openEdit(row: LicenseStatus): Promise<void> {
        this.selectedUserId = row.user.id;
        const hasOwnConfig = row.licenses.length > 0 || (row.overrideFeatureCount ?? 0) > 0;
        if (!hasOwnConfig && (this.copiedLicenseIds.length > 0 || this.copiedFeatureIds.length > 0)) {
            this.selectedLicenseIds = new Set(this.copiedLicenseIds);
            this.selectedFeatureIds = new Set(this.copiedFeatureIds);
            this.selectedExpireDate = this.copiedExpireDate;
        } else {
            this.selectedLicenseIds = new Set(row.licenses.map((x) => x.id));
            const overrideRes = (await this.licenseService.getOverride(row.user.id)) as DB_RESULT;
            const overrideRows = (overrideRes.object ?? []) as any[];
            this.selectedFeatureIds = new Set(
                overrideRows
                    .filter((x) => Number(x.status) === 1)
                    .map((x) => (typeof x.feature === 'string' ? x.feature : x.feature?.id))
                    .filter((x) => !!x),
            );
            this.selectedExpireDate = row.expireDate ? new Date(row.expireDate) : null;
        }
        this.dialog.open(this.allocationDialog, { width: '900px', disableClose: false });
    }

    copy(row: LicenseStatus): void {
        this.copiedLicenseIds = row.licenses.map((x) => x.id);
        this.copiedExpireDate = row.expireDate ? new Date(row.expireDate) : null;
        this.licenseService.getOverride(row.user.id).then((res: any) => {
            const overrideRows = (res.object ?? []) as any[];
            this.copiedFeatureIds = overrideRows
                .filter((x) => Number(x.status) === 1)
                .map((x) => (typeof x.feature === 'string' ? x.feature : x.feature?.id))
                .filter((x) => !!x);
            this.notify('Copied config. Click edit on another user to apply.');
        });
    }

    async save(): Promise<void> {
        if (!this.selectedUserId) return this.warning('Select a user');
        this.saving = true;
        const rs = (await this.licenseService.readLicenseStatus()) as DB_RESULT;
        const current = ((rs.object ?? []) as LicenseStatus[]).find((x) => x.user.id === this.selectedUserId);
        const currentIds = new Set((current?.licenses ?? []).map((x) => x.id));
        for (const id of currentIds) if (!this.selectedLicenseIds.has(id)) await this.licenseService.unassignLicense(this.selectedUserId, id);
        for (const id of this.selectedLicenseIds) if (!currentIds.has(id)) await this.licenseService.assignLicense(this.selectedUserId, id);
        for (const id of this.selectedLicenseIds) {
            await this.licenseService.setExpireDate(this.selectedUserId, id, this.selectedExpireDate ? this.selectedExpireDate.toISOString() : null);
        }
        await this.licenseService.updateOverride(
            this.selectedUserId,
            Array.from(this.selectedFeatureIds).map((featureId) => ({
                feature: featureId,
                status: 1,
            })),
        );
        this.notify('Saved');
        this.dialog.closeAll();
        this.load();
        this.saving = false;
    }

    applyFilter(v: string): void {
        const k = v.trim().toLowerCase();
        this.dataSource.data = !k
            ? this.statuses
            : this.statuses.filter((x) => x.user.name.toLowerCase().includes(k) || x.user.email.toLowerCase().includes(k));
    }

    filteredUsers(): EligibleUser[] {
        const k = (this.userSearchControl.value ?? '').trim().toLowerCase();
        if (!k) return this.users;
        return this.users.filter((u) => u.name.toLowerCase().includes(k) || u.email.toLowerCase().includes(k));
    }

    filteredLicenses(): LicenseItem[] {
        const k = (this.licenseSearchControl.value ?? '').trim().toLowerCase();
        if (!k) return this.licenses;
        return this.licenses.filter((x) => x.name.toLowerCase().includes(k) || x.code.toLowerCase().includes(k));
    }

    filteredFeatures(): FeatureItem[] {
        const k = (this.featureSearchControl.value ?? '').trim().toLowerCase();
        if (!k) return this.features;
        return this.features.filter(
            (x) =>
                x.name.toLowerCase().includes(k) ||
                x.code.toLowerCase().includes(k) ||
                (x.description ?? '').toLowerCase().includes(k),
        );
    }

    toggleLicense(id: string, checked: boolean): void {
        if (checked) this.selectedLicenseIds.add(id);
        else this.selectedLicenseIds.delete(id);
    }

    toggleFeature(id: string, checked: boolean): void {
        if (checked) this.selectedFeatureIds.add(id);
        else this.selectedFeatureIds.delete(id);
    }

    removeTime(date: string | null): string {
        return date ? date.substring(0, 10) : '-';
    }

    canSave(): boolean {
        return !!this.selectedUserId && !this.saving;
    }

    getSelectedOverrideCount(): number {
        return this.selectedFeatureIds.size;
    }

    getLicenseTooltipText(licenses: LicenseItem[]): string {
        if (!licenses || licenses.length === 0) {
            return 'No license';
        }
        return licenses.map((l) => `${l.name}(${l.code})`).join('\n');
    }

    getOverrideTooltipText(row: LicenseStatus): string {
        return this.overrideTooltipMap.get(row.user.id) ?? 'No overridden feature';
    }

    private async refreshOverrideTooltips(): Promise<void> {
        this.overrideTooltipMap.clear();
        for (const row of this.statuses) {
            const res = (await this.licenseService.getOverride(row.user.id)) as DB_RESULT;
            const overrideRows = (res.object ?? []) as any[];
            const ids = overrideRows
                .filter((x) => Number(x.status) === 1)
                .map((x) => (typeof x.feature === 'string' ? x.feature : x.feature?.id))
                .filter((x) => !!x);
            const text = this.features
                .filter((f) => ids.includes(f.id))
                .map((f) => `${f.name}(${f.code})`)
                .join('\n');
            this.overrideTooltipMap.set(row.user.id, text || 'No overridden feature');
        }
    }

    private warning(message: string): void { this.snackBar.open(message, '', snackBarConfigWarn); }
    private notify(message: string): void { this.snackBar.open(message, '', snackBarConfig); }
}
