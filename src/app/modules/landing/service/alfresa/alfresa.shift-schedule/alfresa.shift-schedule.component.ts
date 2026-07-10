import { ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { formatAlfresaSiteLabel } from 'app/modules/landing/mobile/alfresa-site.util';
import { MSG } from 'app/modules/landing/utils/message.def';
import { DB_RESULT, isWebAdminPermission, MobileAdmin, MobileUser } from 'app/modules/landing/utils/typedef';
import { SharedService } from 'app/services/shared.service';
import { Language } from '../../message-push-service/email/email.component';
import {
    ALFLOC,
    ALF_SHIFT_TYPE,
    AlfresaBranch,
    AlfresaCenter,
    AlfresaShiftConfig,
    AlfresaShiftScheduleRow,
    AlfresaShiftScheduleSiteView,
    AlfresaShiftTableResult,
    AlfresaShiftWorkerBind,
    getAlfShiftTypeLabel,
    isAlfShiftBranchType,
    isAlfShiftCenterType,
} from '../alfresa.type';
import { AlfresaCenterService } from '../service.center';
import { AlfresaShiftService } from '../service.shift';
import { MobileUserService } from '../../../mobile/service/mobile.service';

interface CenterScheduleGroup {
    center: AlfresaShiftScheduleSiteView;
    branches: AlfresaShiftScheduleSiteView[];
}

@Component({
    selector: 'app-alfresa-shift-schedule',
    templateUrl: './alfresa.shift-schedule.component.html',
    styleUrls: ['./alfresa.shift-schedule.component.scss'],
})
export class AlfresaShiftScheduleComponent implements OnInit {
    @ViewChild('workerDialog', { static: true }) workerDialog!: TemplateRef<unknown>;

    readonly isAdminUser: boolean;
    readonly displayedColumns = ['role', 'name', 'shift', 'hours', 'status', 'actions'];

    centerGroups: CenterScheduleGroup[] = [];
    shifts: AlfresaShiftConfig[] = [];
    shiftOptions: { shift_type: number; label: string }[] = [];

    private mobileAdmins: MobileAdmin[] = [];
    private usersByAdminId = new Map<string, MobileUser[]>();
    private userNameMap = new Map<string, string>();
    private scheduleCache = new Map<string, AlfresaShiftTableResult>();
    private dataSourceCache = new Map<string, MatTableDataSource<AlfresaShiftScheduleRow>>();
    private dialogRef: any;
    private lng = Language.ENG;
    private editState = false;
    private activeSite?: AlfresaShiftScheduleSiteView;
    private activeScheduleId: string | null = null;
    private pendingUserOptions: { id: string; label: string }[] = [];

    workerForm!: FormGroup;
    workerDialogTitle = 'Add shift worker';
    workerUserOptions: { id: string; label: string }[] = [];
    activeShiftOptions: { shift_type: number; label: string }[] = [];

    constructor(
        private _shiftService: AlfresaShiftService,
        private _centerService: AlfresaCenterService,
        private _mobileService: MobileUserService,
        private _sharedService: SharedService,
        private _snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef,
        public dialog: MatDialog,
        private _formBuilder: FormBuilder,
    ) {
        this.isAdminUser = isWebAdminPermission(this._sharedService.getPermission());
    }

    ngOnInit(): void {
        this.workerForm = this._formBuilder.group({
            user: ['', Validators.required],
            shift: ['', Validators.required],
        });
        this.loadInitialData();
    }

    siteKey(site: AlfresaShiftScheduleSiteView): string {
        return `${site.siteType}:${site.siteId}`;
    }

    getDataSource(site: AlfresaShiftScheduleSiteView): MatTableDataSource<AlfresaShiftScheduleRow> {
        const key = this.siteKey(site);
        if (!this.dataSourceCache.has(key)) {
            this.dataSourceCache.set(key, new MatTableDataSource<AlfresaShiftScheduleRow>([]));
        }
        return this.dataSourceCache.get(key)!;
    }

    onSitePanelOpened(site: AlfresaShiftScheduleSiteView): void {
        this.loadSiteSchedule(site);
    }

    canAddWorker(site: AlfresaShiftScheduleSiteView): boolean {
        return this.isAdminUser && site.allowWorkers;
    }

    openWorkerDialog(action: 'add' | 'edit', site: AlfresaShiftScheduleSiteView, row?: AlfresaShiftScheduleRow): void {
        if (!this.isAdminUser || !site.allowWorkers) {
            return;
        }
        const siteShiftOptions = this.getShiftOptionsForSite(site);
        if (siteShiftOptions.length === 0) {
            this.warning('No shift presets configured for this site');
            return;
        }
        this.activeShiftOptions = siteShiftOptions;
        this.activeSite = site;
        if (action === 'add') {
            if (!this.findAdminForSite(site)) {
                this.warning('No mobile admin is bound to this center');
                return;
            }
            this.editState = false;
            this.activeScheduleId = null;
            this.workerDialogTitle = `Add shift worker — ${site.label}`;
            this.workerUserOptions = [...this.pendingUserOptions];
            this.workerForm.reset({
                user: '',
                shift: siteShiftOptions[0]?.shift_type ?? ALF_SHIFT_TYPE.CENTER_DAY,
            });
            this.workerForm.get('user')?.enable();
        } else {
            if (!row?.scheduleId) {
                return;
            }
            this.editState = true;
            this.activeScheduleId = row.scheduleId;
            this.workerDialogTitle = `Edit shift worker — ${site.label}`;
            this.workerUserOptions = row.userId
                ? [{ id: row.userId, label: row.userName }]
                : [];
            this.workerForm.patchValue({
                user: row.userId ?? '',
                shift: row.shiftType ?? siteShiftOptions[0]?.shift_type ?? ALF_SHIFT_TYPE.CENTER_DAY,
            });
            this.workerForm.get('user')?.disable();
        }
        this.dialogRef = this.dialog.open(this.workerDialog, {
            width: '560px',
            panelClass: 'custom-modalbox',
            disableClose: true,
            autoFocus: false,
        });
    }

    confirmRemoveWorker(site: AlfresaShiftScheduleSiteView, row: AlfresaShiftScheduleRow): void {
        if (!row.scheduleId || !row.editable) {
            return;
        }
        this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, {
            width: '500px',
            panelClass: 'custom-modalbox',
        });
        this.dialogRef.componentInstance.data = {
            title: 'Remove shift worker',
            message: `Remove ${row.userName} from ${site.label}?`,
        };
        this.dialogRef.afterClosed().subscribe((confirmed: boolean) => {
            if (!confirmed) {
                return;
            }
            this._shiftService.unbindShiftWorker(row.scheduleId!).then((res: DB_RESULT) => {
                if (res && res.error_code === 0) {
                    this.notify(MSG.OPERATION_SUCCESS);
                    this.scheduleCache.delete(this.siteKey(site));
                    this.loadSiteSchedule(site, true);
                } else {
                    this.warning(res?.meta || MSG.OPERATION_FAILED[this.lng]);
                }
            });
        });
    }

    saveWorker(): void {
        if (!this.activeSite || this.workerForm.invalid) {
            this.warning('Please select a worker and shift');
            return;
        }
        const raw = this.workerForm.getRawValue();
        const payload: AlfresaShiftWorkerBind = {
            user: raw.user,
            site_type: this.activeSite.siteType,
            site_id: this.activeSite.siteId,
            shift_type: Number(raw.shift),
        };

        const request = this.editState && this.activeScheduleId
            ? this._shiftService.updateShiftWorker(this.activeScheduleId, payload)
            : this._shiftService.bindShiftWorker(payload);

        request.then((res: DB_RESULT) => {
            if (res && res.error_code === 0) {
                this.notify(MSG.OPERATION_SUCCESS);
                this.closeWorkerDialog();
                this.scheduleCache.delete(this.siteKey(this.activeSite!));
                this.loadSiteSchedule(this.activeSite!, true);
            } else {
                this.warning(res?.meta || MSG.OPERATION_FAILED[this.lng]);
            }
        });
    }

    closeWorkerDialog(): void {
        this.dialog.closeAll();
        this.editState = false;
        this.activeScheduleId = null;
    }

    getRoleLabel(role: AlfresaShiftScheduleRow['role']): string {
        return role === 'admin' ? 'Admin' : 'Worker';
    }

    formatHours(row: AlfresaShiftScheduleRow): string {
        if (!row.startTime || !row.endTime) {
            return '—';
        }
        const suffix = row.crossMidnight ? ' (+1)' : '';
        return `${row.startTime} – ${row.endTime}${suffix}`;
    }

    isShiftEnabled(row: AlfresaShiftScheduleRow): boolean {
        return row.status;
    }

    reloadShiftPresets(): void {
        this._shiftService.getAllShifts().then((res: DB_RESULT) => {
            this.shifts = this.readArray<AlfresaShiftConfig>(res);
            this.shiftOptions = this.shifts.map((s) => ({
                shift_type: s.shift_type,
                label: `${s.name} (${getAlfShiftTypeLabel(s.shift_type)})`,
            }));
            this.scheduleCache.clear();
            this._cdr.markForCheck();
        });
    }

    private loadInitialData(): void {
        Promise.all([
            this._centerService.getAllCenterNames(),
            this._centerService.getAllBranchNames(),
            this._shiftService.getAllShifts(),
            this._mobileService.getSubUsersOfSelf(),
        ]).then(([centerRes, branchRes, shiftRes, adminRes]) => {
            const centers = this.readArray<AlfresaCenter>(centerRes);
            const branches = this.readArray<AlfresaBranch>(branchRes);
            this.shifts = this.readArray<AlfresaShiftConfig>(shiftRes);
            this.shiftOptions = this.shifts.map((s) => ({
                shift_type: s.shift_type,
                label: `${s.name} (${getAlfShiftTypeLabel(s.shift_type)})`,
            }));

            this.mobileAdmins = this.readArray<MobileAdmin>(adminRes);
            this.mobileAdmins.forEach((admin) => {
                if (admin.id) {
                    this.userNameMap.set(admin.id, admin.name);
                }
            });

            this.centerGroups = this.buildCenterGroups(centers, branches);
            this._cdr.markForCheck();
        }).catch((err) => console.error('Failed to load shift schedule data', err));
    }

    private buildCenterGroups(centers: AlfresaCenter[], branches: AlfresaBranch[]): CenterScheduleGroup[] {
        const sortedCenters = [...centers].sort((a, b) =>
            (a.code ?? a.name ?? '').localeCompare(b.code ?? b.name ?? '')
        );
        return sortedCenters
            .filter((c) => !!c.id)
            .map((center) => {
                const centerSite: AlfresaShiftScheduleSiteView = {
                    siteType: ALFLOC.CENTER,
                    siteId: center.id!,
                    label: formatAlfresaSiteLabel(center.code, center.name),
                    isBranch: false,
                    allowWorkers: true,
                };
                const centerBranches = branches
                    .filter((b) => b.center === center.id && !!b.id)
                    .sort((a, b) => (a.code ?? a.name ?? '').localeCompare(b.code ?? b.name ?? ''))
                    .map((branch) => ({
                        siteType: ALFLOC.BRANCH,
                        siteId: branch.id!,
                        label: formatAlfresaSiteLabel(branch.code, branch.name),
                        isBranch: true,
                        allowWorkers: false,
                    }));
                return { center: centerSite, branches: centerBranches };
            });
    }

    private loadSiteSchedule(site: AlfresaShiftScheduleSiteView, force = false): void {
        const key = this.siteKey(site);
        if (!force && this.scheduleCache.has(key)) {
            this.applyScheduleRows(site, this.scheduleCache.get(key)!);
            return;
        }

        const loadWorkers = site.allowWorkers
            ? this.loadCenterWorkerOptions(site)
            : Promise.resolve();

        loadWorkers.then(() => {
            this._shiftService.queryShiftTable({
                site_type: site.siteType,
                site_id: site.siteId,
            }).then((res: DB_RESULT) => {
                if (res && res.error_code === 0) {
                    const table = res.object as AlfresaShiftTableResult;
                    this.scheduleCache.set(key, table);
                    this.applyScheduleRows(site, table);
                } else {
                    this.warning(res?.meta || 'Failed to load site schedule');
                }
                this._cdr.markForCheck();
            });
        });
    }

    private async loadCenterWorkerOptions(site: AlfresaShiftScheduleSiteView): Promise<void> {
        const admin = this.findAdminForSite(site);
        if (!admin?.id) {
            this.pendingUserOptions = [];
            return;
        }
        if (!this.usersByAdminId.has(admin.id)) {
            const res = await this._mobileService.getSubUsers(admin.id) as DB_RESULT;
            const users = (res && res.error_code === 0 && Array.isArray(res.object))
                ? res.object as MobileUser[]
                : [];
            this.usersByAdminId.set(admin.id, users);
            users.forEach((u) => {
                if (u.id) {
                    this.userNameMap.set(u.id, u.name);
                }
            });
        }
        const users = this.usersByAdminId.get(admin.id) ?? [];
        this.pendingUserOptions = users
            .filter((u) => !!u.id)
            .map((u) => ({ id: u.id!, label: `${u.name} (${u.email})` }));
    }

    private applyScheduleRows(site: AlfresaShiftScheduleSiteView, table: AlfresaShiftTableResult): void {
        const rows: AlfresaShiftScheduleRow[] = [];
        const adminUserId = table.admin?.user ?? null;
        rows.push({
            scheduleId: table.admin?.id ?? null,
            userId: adminUserId,
            userName: this.resolveUserName(adminUserId),
            role: 'admin',
            shiftType: null,
            shiftLabel: '—',
            startTime: '',
            endTime: '',
            crossMidnight: false,
            status: !!table.admin?.status,
            editable: false,
        });

        const scheduledUserIds = new Set(table.users.map((u) => u.user));
        for (const worker of table.users) {
            rows.push({
                scheduleId: worker.id,
                userId: worker.user,
                userName: this.resolveUserName(worker.user),
                role: 'worker',
                shiftType: worker.shift_type,
                shiftLabel: this.resolveShiftLabel(worker.shift_type),
                startTime: worker.start_time,
                endTime: worker.end_time,
                crossMidnight: worker.cross_midnight,
                status: worker.status,
                editable: site.allowWorkers,
            });
        }

        if (site.allowWorkers) {
            this.pendingUserOptions = this.pendingUserOptions.filter((opt) => !scheduledUserIds.has(opt.id));
        }

        const dataSource = this.getDataSource(site);
        dataSource.data = rows;
    }

    private findAdminForSite(site: AlfresaShiftScheduleSiteView): MobileAdmin | undefined {
        return this.mobileAdmins.find((admin) => {
            if (site.siteType === ALFLOC.CENTER) {
                return admin.center === site.siteId
                    || (admin.site_type === ALFLOC.CENTER && admin.site === site.siteId);
            }
            return admin.branch === site.siteId
                || (admin.site_type === ALFLOC.BRANCH && admin.site === site.siteId);
        });
    }

    private resolveUserName(userId: string | null): string {
        if (!userId) {
            return 'Unassigned';
        }
        return this.userNameMap.get(userId) ?? userId;
    }

    private getShiftOptionsForSite(site: AlfresaShiftScheduleSiteView): { shift_type: number; label: string }[] {
        return this.shifts
            .filter((s) => (site.siteType === ALFLOC.CENTER
                ? isAlfShiftCenterType(s.shift_type)
                : isAlfShiftBranchType(s.shift_type)))
            .map((s) => ({
                shift_type: s.shift_type,
                label: `${s.name} (${getAlfShiftTypeLabel(s.shift_type)})`,
            }));
    }

    private resolveShiftLabel(shiftType: number | null): string {
        if (shiftType == null) {
            return '—';
        }
        const shift = this.shifts.find((s) => s.shift_type === shiftType);
        if (shift) {
            return `${shift.name} (${getAlfShiftTypeLabel(shiftType)})`;
        }
        return getAlfShiftTypeLabel(shiftType);
    }

    private readArray<T>(res: unknown): T[] {
        const db = res as DB_RESULT;
        if (db && db.error_code === 0 && Array.isArray(db.object)) {
            return db.object as T[];
        }
        return [];
    }

    private warning(message: string[] | string): void {
        const text = typeof message === 'string' ? message : message[this.lng];
        this._snackBar.open(text, '', snackBarConfigWarn);
    }

    private notify(message: string[] | string): void {
        const text = typeof message === 'string' ? message : message[this.lng];
        this._snackBar.open(text, '', snackBarConfig);
    }
}
