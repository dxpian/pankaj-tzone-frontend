import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { DB_RESULT } from '../../utils/typedef';
import { LicenseService } from '../service/license.service';

type FeatureModel = { id: string; name: string; code: string; category: number; description?: string };
type LicenseStat = {
    id: string;
    name: string;
    code: string;
    description: string;
    featureCount: number;
    userCount: number;
    createdAt: string;
};

@Component({
    selector: 'app-license-models',
    templateUrl: './license-models.component.html',
    styleUrls: ['./license-models.component.scss'],
})
export class LicenseModelsComponent implements OnInit {
    @ViewChild('licenseDialog', { static: true }) licenseDialog!: TemplateRef<any>;
    searchControl = new FormControl('');
    displayedColumns: string[] = ['name', 'code', 'description', 'featureCount', 'userCount', 'createdAt', 'action'];
    dataSource = new MatTableDataSource<LicenseStat>([]);
    licenses: LicenseStat[] = [];
    features: FeatureModel[] = [];
    groupedFeatures: { category: number; list: FeatureModel[] }[] = [];
    copiedFeatureIds: string[] = [];
    editId: string | null = null;
    selectedFeatureIds = new Set<string>();
    saving = false;
    private readonly SEARCH_STORAGE_KEY = 'license-models.search.keyword';

    private readonly categoryNameMap: Record<number, string> = {
        1: 'Device',
        2: 'Center',
        3: 'Branch',
        4: 'User Management',
        5: 'Alarm',
        7: 'Dashboard',
        8: 'Module',
    };

    form = new FormGroup({
        name: new FormControl(''),
        code: new FormControl(''),
        description: new FormControl(''),
    });

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
    }

    async load(): Promise<void> {
        const [f, l] = await Promise.all([
            this.licenseService.getFeatures(),
            this.licenseService.getLicenseStats(),
        ]);
        const fr = f as DB_RESULT;
        const lr = l as DB_RESULT;
        this.features = (fr.object ?? []) as FeatureModel[];
        this.groupedFeatures = this.groupByCategory(this.features);
        this.licenses = (lr.object ?? []) as LicenseStat[];
        this.dataSource.data = this.licenses;
        const cachedSearch = localStorage.getItem(this.SEARCH_STORAGE_KEY) ?? '';
        this.searchControl.setValue(cachedSearch, { emitEvent: false });
        this.applyFilter(cachedSearch);
    }

    openCreate(): void {
        this.editId = null;
        this.form.patchValue({ name: '', code: '', description: '' });
        this.selectedFeatureIds = new Set(this.copiedFeatureIds);
        this.dialog.open(this.licenseDialog, { width: '900px', disableClose: true });
    }

    async openEdit(row: LicenseStat): Promise<void> {
        this.editId = row.id;
        this.form.patchValue({ name: row.name, code: row.code, description: row.description });
        const r = (await this.licenseService.getLicenses()) as DB_RESULT;
        const full = (r.object ?? []).find((x: any) => x.id === row.id);
        this.selectedFeatureIds = new Set((full?.features ?? []).map((x: any) => x.id));
        this.dialog.open(this.licenseDialog, { width: '900px', disableClose: true });
    }

    copy(row: LicenseStat): void {
        this.copiedFeatureIds = [];
        this.licenseService.getLicenses().then((r: any) => {
            const full = (r.object ?? []).find((x: any) => x.id === row.id);
            this.copiedFeatureIds = (full?.features ?? []).map((x: any) => x.id);
            this.notify('Copied license config. Click Create to paste.');
        });
    }

    async delete(row: LicenseStat): Promise<void> {
        const ref = this.dialog.open(FuseConfirmDialogComponent, { width: '500px' });
        ref.componentInstance.data = { title: 'Delete License', message: `Delete ${row.name}?` };
        ref.afterClosed().subscribe(async (ok: boolean) => {
            if (!ok) return;
            const rs = (await this.licenseService.deleteLicense(row.id)) as DB_RESULT;
            if (rs.error_code === 0) {
                this.notify('Deleted');
                this.load();
            } else this.warning(rs.meta ?? 'Delete failed');
        });
    }

    toggleFeature(id: string, checked: boolean): void {
        if (checked) this.selectedFeatureIds.add(id);
        else this.selectedFeatureIds.delete(id);
    }

    async save(): Promise<void> {
        const name = this.form.value.name?.trim();
        const code = this.form.value.code?.trim();
        if (!name || !code) return this.warning('License name and code are required');
        if (this.selectedFeatureIds.size === 0) return this.warning('Select at least one feature');
        this.saving = true;
        const features = this.features.filter((f) => this.selectedFeatureIds.has(f.id));
        let rs: DB_RESULT;
        if (this.editId) {
            rs = (await this.licenseService.updateLicense(this.editId, { features: features.map((f) => f.id) })) as DB_RESULT;
        } else {
            rs = (await this.licenseService.createLicense({
                license: { name, code, description: this.form.value.description ?? '' },
                features,
            })) as DB_RESULT;
        }
        if (rs.error_code === 0) {
            this.notify('Saved');
            this.dialog.closeAll();
            this.load();
        } else this.warning(rs.meta ?? 'Save failed');
        this.saving = false;
    }

    applyFilter(value: string): void {
        const k = value.trim().toLowerCase();
        if (!k) this.dataSource.data = this.licenses;
        else {
            this.dataSource.data = this.licenses.filter(
                (x) =>
                    x.name.toLowerCase().includes(k) ||
                    x.code.toLowerCase().includes(k) ||
                    (x.description ?? '').toLowerCase().includes(k),
            );
        }
    }

    removeTime(date: string): string {
        return date ? date.substring(0, 10) : '';
    }

    getCategoryName(category: number): string {
        return this.categoryNameMap[category] ?? `Category ${category}`;
    }

    canSave(): boolean {
        const name = this.form.value.name?.trim();
        const code = this.form.value.code?.trim();
        return !!name && !!code && this.selectedFeatureIds.size > 0 && !this.saving;
    }

    private groupByCategory(features: FeatureModel[]): { category: number; list: FeatureModel[] }[] {
        const mp = new Map<number, FeatureModel[]>();
        for (const f of features) {
            if (!mp.has(f.category)) mp.set(f.category, []);
            mp.get(f.category)!.push(f);
        }
        return Array.from(mp.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([category, list]) => ({ category, list }));
    }

    private warning(message: string): void {
        this.snackBar.open(message, '', snackBarConfigWarn);
    }
    private notify(message: string): void {
        this.snackBar.open(message, '', snackBarConfig);
    }
}
