import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { SharedService } from 'app/services/shared.service';
import { DB_RESULT, MobileAdmin, MobileCluster } from '../../utils/typedef';
import { MobileUserService } from '../mobile.service';

/** Table row: cluster plus draft/server permission for the selected web admin. */
export interface ClusterPermissionRow {
  cluster: MobileCluster;
  draftPermission: boolean;
  serverPermission: boolean;
}

@Component({
  selector: 'app-manage-cluster',
  templateUrl: './manage-cluster.component.html',
  styleUrls: ['./manage-cluster.component.scss'],
})
export class ManageClusterComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('userPaginator') userPaginator!: MatPaginator;
  @ViewChild('clusterPaginator') clusterPaginator!: MatPaginator;

  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly displayedUserColumns: string[] = ['select', 'index', 'email', 'name'];
  readonly displayedColumns: string[] = [
    'index',
    'clusterName',
    'ownerName',
    'permission',
    'action',
  ];

  title = 'Cluster Permission';

  users: MobileAdmin[] = [];
  clusters: MobileCluster[] = [];
  dataSrcUsers = new MatTableDataSource<MobileAdmin>([]);
  dataSrcClst = new MatTableDataSource<ClusterPermissionRow>([]);

  /** Selected web admin key (`id` or `email`). */
  selectedUserId: string | null = null;

  searchCtrlUsers = new FormControl<string>('');
  searchCtrlClst = new FormControl<string>('');

  /** userId -> clusterId -> last known server permission (from query or successful save) */
  private readonly permissionCache = new Map<string, Map<string, boolean>>();
  /** Cluster ids with resolved permission for the currently selected user */
  private readonly resolvedClusterIds = new Set<string>();
  /** In-memory draft/server for current user (key = cluster id) */
  private readonly stateByCluster = new Map<
    string,
    { server: boolean; draft: boolean }
  >();

  permissionsLoading = false;
  private loadToken = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly _snackBar: MatSnackBar,
    private readonly _mobileService: MobileUserService,
    private readonly _sharedService: SharedService,
    private readonly _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.dataSrcUsers.filterPredicate = (data: MobileAdmin, filter: string) => {
      const k = (filter ?? '').trim().toLowerCase();
      if (!k) {
        return true;
      }
      return (
        (data.email ?? '').toLowerCase().includes(k) ||
        (data.name ?? '').toLowerCase().includes(k)
      );
    };

    this.loadWebAdminUsers();
    this.loadClusters();

    this.searchCtrlUsers.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe((v) => {
        this.dataSrcUsers.filter = (v ?? '').trim().toLowerCase();
        this.ensureUserSelectionVisible();
        this._cdr.markForCheck();
      });

    this.searchCtrlClst.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.rebuildTableRows();
        this.clusterPaginator?.firstPage();
      });
  }

  ngAfterViewInit(): void {
    if (this.userPaginator) {
      this.dataSrcUsers.paginator = this.userPaginator;
    }
    if (this.clusterPaginator) {
      this.dataSrcClst.paginator = this.clusterPaginator;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  userRowKey(u: MobileAdmin): string {
    return u.id ?? u.email;
  }

  trackByUserId(_: number, u: MobileAdmin): string {
    return this.userRowKey(u);
  }

  userRowIndex(i: number): number {
    const p = this.userPaginator;
    if (!p) {
      return i + 1;
    }
    return p.pageIndex * p.pageSize + i + 1;
  }

  isUserSelected(u: MobileAdmin): boolean {
    return this.userRowKey(u) === this.selectedUserId;
  }

  /** First row on the current user-table page (respects filter + paginator). */
  firstUserOnCurrentPage(): MobileAdmin | null {
    const filtered = this.dataSrcUsers.filteredData;
    if (!filtered.length) {
      return null;
    }
    const p = this.userPaginator;
    const pageIndex = p?.pageIndex ?? 0;
    const pageSize = p?.pageSize ?? filtered.length;
    const start = pageIndex * pageSize;
    return filtered[start] ?? null;
  }

  isFirstOnPageSelected(): boolean {
    const first = this.firstUserOnCurrentPage();
    return !!first && this.userRowKey(first) === this.selectedUserId;
  }

  onUserHeaderCheckbox(ev: MatCheckboxChange): void {
    const first = this.firstUserOnCurrentPage();
    if (!first) {
      queueMicrotask(() => {
        ev.source.checked = false;
      });
      return;
    }
    if (ev.checked) {
      this.selectUser(first, true);
      return;
    }
    if (this.userRowKey(first) === this.selectedUserId) {
      const rest = this.dataSrcUsers.filteredData.filter(
        (u) => this.userRowKey(u) !== this.userRowKey(first)
      );
      const next = rest[0];
      if (next) {
        this.selectUser(next, true);
      } else {
        queueMicrotask(() => {
          ev.source.checked = true;
        });
      }
    }
  }

  /**
   * @param forceRefresh when true, always re-query cluster permissions (e.g. user re-selected).
   */
  selectUser(u: MobileAdmin, forceRefresh = false): void {
    const key = this.userRowKey(u);
    if (!forceRefresh && key === this.selectedUserId) {
      return;
    }
    this.selectedUserId = key;
    this.onUserChanged(forceRefresh);
  }

  onUserRowCheckbox(u: MobileAdmin, ev: MatCheckboxChange): void {
    if (ev.checked) {
      this.selectUser(u, true);
      return;
    }
    const data = this.dataSrcUsers.filteredData;
    if (data.length <= 1) {
      ev.source.checked = true;
      return;
    }
    const others = data.filter((x) => this.userRowKey(x) !== this.userRowKey(u));
    const next = others[0];
    if (next) {
      this.selectUser(next, true);
    }
  }

  onUserChanged(forceRefresh = false): void {
    const uid = this.selectedUserId;
    if (uid && forceRefresh) {
      this.permissionCache.get(uid)?.clear();
    }
    this.resolvedClusterIds.clear();
    this.stateByCluster.clear();
    void this.refreshPermissionsForSelectedUser();
  }

  trackByClusterId(_: number, row: ClusterPermissionRow): string {
    return row.cluster.id ?? '';
  }

  rowIndex(i: number): number {
    const p = this.clusterPaginator;
    if (!p) {
      return i + 1;
    }
    return p.pageIndex * p.pageSize + i + 1;
  }

  isClusterResolved(clusterId: string | undefined): boolean {
    return !!clusterId && this.resolvedClusterIds.has(clusterId);
  }

  isRowDirty(row: ClusterPermissionRow): boolean {
    return row.draftPermission !== row.serverPermission;
  }

  /** Save/cancel only when this row has unsaved edits and cluster permission is resolved. */
  isClusterActionEnabled(row: ClusterPermissionRow): boolean {
    return (
      !this.permissionsLoading &&
      !!row.cluster.id &&
      this.isClusterResolved(row.cluster.id) &&
      this.isRowDirty(row)
    );
  }

  /**
   * If another cluster row has unsaved permission edits, revert those rows to server (initial) state.
   * Called before applying a toggle on `clusterId` so only one row is dirty at a time.
   */
  private revertDirtyRowsExcept(clusterId: string): void {
    let changed = false;
    const rows = this.dataSrcClst.data;
    for (const r of rows) {
      const rid = r.cluster.id;
      if (!rid || rid === clusterId) {
        continue;
      }
      if (!this.isRowDirty(r)) {
        continue;
      }
      r.draftPermission = r.serverPermission;
      const st = this.stateByCluster.get(rid);
      if (st) {
        st.draft = st.server;
      }
      changed = true;
    }
    if (changed) {
      this.dataSrcClst.data = [...rows];
    }
  }

  onPermissionToggle(row: ClusterPermissionRow, ev: MatSlideToggleChange): void {
    const id = row.cluster.id;
    if (!id || !this.isClusterResolved(id)) {
      ev.source.checked = row.draftPermission;
      return;
    }
    this.revertDirtyRowsExcept(id);
    row.draftPermission = ev.checked;
    const st = this.stateByCluster.get(id);
    if (st) {
      st.draft = ev.checked;
    }
    this.dataSrcClst.data = [...this.dataSrcClst.data];
    this._cdr.markForCheck();
  }

  cancelRow(row: ClusterPermissionRow): void {
    const id = row.cluster.id;
    if (!id || !this.isRowDirty(row)) {
      return;
    }
    row.draftPermission = row.serverPermission;
    const st = this.stateByCluster.get(id);
    if (st) {
      st.draft = st.server;
    }
    this.dataSrcClst.data = [...this.dataSrcClst.data];
  }

  saveRow(row: ClusterPermissionRow): void {
    const userId = this.selectedUserId;
    const clusterId = row.cluster.id;
    if (!userId || !clusterId || !this.isRowDirty(row)) {
      return;
    }
    const permission = row.draftPermission ? 1 : 0;
    this._mobileService
      .control_cluster_permission(userId, clusterId, permission)
      .then((response: DB_RESULT) => {
        if (response && response.error_code === 0) {
          row.serverPermission = row.draftPermission;
          const st = this.stateByCluster.get(clusterId);
          if (st) {
            st.server = row.serverPermission;
            st.draft = row.serverPermission;
          }
          this.upsertCache(userId, clusterId, row.serverPermission);
          this.dataSrcClst.data = [...this.dataSrcClst.data];
          this.notify('Permission saved');
        } else {
          this.warning('Failed to save permission');
        }
        this._cdr.markForCheck();
      })
      .catch(() => this.warning('Failed to save permission'));
  }

  private get filteredClusters(): MobileCluster[] {
    const k = (this.searchCtrlClst.value ?? '').trim().toLowerCase();
    if (!k) {
      return this.clusters;
    }
    return this.clusters.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const owner = (c.owner ?? '').toLowerCase();
      return name.includes(k) || owner.includes(k);
    });
  }

  private rebuildTableRows(): void {
    const rows: ClusterPermissionRow[] = this.filteredClusters.map((cl) => {
      const id = cl.id ?? '';
      const st = this.stateByCluster.get(id);
      return {
        cluster: cl,
        serverPermission: st?.server ?? false,
        draftPermission: st?.draft ?? false,
      };
    });
    this.dataSrcClst.data = rows;
    this._cdr.markForCheck();
  }

  private upsertCache(userId: string, clusterId: string, granted: boolean): void {
    if (!this.permissionCache.has(userId)) {
      this.permissionCache.set(userId, new Map());
    }
    this.permissionCache.get(userId)!.set(clusterId, granted);
  }

  /**
   * Query API; returns true only on explicit success (error_code === 0) with permission &gt; 0.
   * Any failure, non-zero error_code (e.g. 1002 "Cluster permission not found"), or bad payload → off.
   */
  private async queryClusterPermission(
    userId: string,
    clusterId: string
  ): Promise<boolean> {
    try {
      const response = (await this._mobileService.query_cluster_permission(
        userId,
        clusterId
      )) as DB_RESULT;
      if (response == null) {
        return false;
      }
      const errorCode = Number(response.error_code);
      if (Number.isNaN(errorCode) || errorCode !== 0) {
        return false;
      }
      const perm = Number(response.object);
      return !Number.isNaN(perm) && perm > 0;
    } catch {
      /* treat as off */
    }
    return false;
  }

  private ensureUserSelectionVisible(): void {
    const data = this.dataSrcUsers.filteredData;
    if (data.length === 0) {
      if (this.selectedUserId !== null) {
        this.selectedUserId = null;
        this.resolvedClusterIds.clear();
        this.stateByCluster.clear();
        void this.refreshPermissionsForSelectedUser();
      }
      return;
    }
    const key = this.selectedUserId;
    const stillHere =
      key && data.some((u) => this.userRowKey(u) === key);
    if (stillHere) {
      return;
    }
    const first = data[0];
    this.selectedUserId = this.userRowKey(first);
    this.onUserChanged(true);
  }

  private async refreshPermissionsForSelectedUser(): Promise<void> {
    const userId = this.selectedUserId;
    const token = ++this.loadToken;

    if (!userId || !this.clusters.length) {
      this.permissionsLoading = false;
      this.rebuildTableRows();
      return;
    }

    this.permissionsLoading = true;
    const ids = this.clusters.map((c) => c.id).filter((id): id is string => !!id);

    if (!this.permissionCache.has(userId)) {
      this.permissionCache.set(userId, new Map());
    }
    const cache = this.permissionCache.get(userId)!;

    if (ids.length === 0) {
      this.permissionsLoading = false;
      this.rebuildTableRows();
      this._cdr.markForCheck();
      return;
    }

    const chunkSize = 6;
    for (let i = 0; i < ids.length; i += chunkSize) {
      if (token !== this.loadToken) {
        return;
      }
      const slice = ids.slice(i, i + chunkSize);
      const results = await Promise.all(
        slice.map(async (cid) => {
          const granted = await this.queryClusterPermission(userId, cid);
          return { cid, granted };
        })
      );
      if (token !== this.loadToken) {
        return;
      }
      for (const { cid, granted } of results) {
        cache.set(cid, granted);
        this.stateByCluster.set(cid, { server: granted, draft: granted });
        this.resolvedClusterIds.add(cid);
      }
      this.rebuildTableRows();
      await new Promise((r) => setTimeout(r, 0));
      this._cdr.markForCheck();
    }

    if (token === this.loadToken) {
      this.permissionsLoading = false;
      this._cdr.markForCheck();
    }
  }

  private loadWebAdminUsers(): void {
    this._mobileService.getWebAdminUsers().then((response: DB_RESULT) => {
      if (response && response.error_code === 0) {
        this.users = (response.object as MobileAdmin[]) ?? [];
        this.dataSrcUsers.data = [...this.users];
        this.dataSrcUsers.filter = (
          this.searchCtrlUsers.value ?? ''
        ).trim().toLowerCase();
        const visible = this.dataSrcUsers.filteredData;
        const first = visible[0] ?? this.users[0];
        this.selectedUserId = first ? this.userRowKey(first) : null;
        if (this.selectedUserId) {
          this.onUserChanged(true);
        } else {
          this.resolvedClusterIds.clear();
          this.stateByCluster.clear();
          void this.refreshPermissionsForSelectedUser();
        }
      } else {
        this.warning('Failed to load web admin users');
      }
      this._cdr.markForCheck();
    });
  }

  private loadClusters(): void {
    const userId = this._sharedService.getId();
    this._mobileService.getAllClustersBySuper(userId).then((response: DB_RESULT) => {
      if (response && response.error_code === 0) {
        this.clusters = (response.object as MobileCluster[]) ?? [];
        this.rebuildTableRows();
        if (this.selectedUserId) {
          this.onUserChanged(true);
        }
      } else {
        this.warning('Failed to load clusters');
      }
      this._cdr.markForCheck();
    });
  }

  private warning(message: string): void {
    this._snackBar.open(message, '', snackBarConfigWarn);
  }

  private notify(message: string): void {
    this._snackBar.open(message, '', snackBarConfig);
  }
}
