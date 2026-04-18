import { AfterViewInit, ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { DB_RESULT,  MobileCluster,   MobileArea,  PERMISSION } from '../../utils/typedef';
import { Language } from '../../service/message-push-service/email/email.component';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, Subject, switchMap, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountService } from '../../account/account.service';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MobileUserService } from '../mobile.service';
import { SharedService } from 'app/services/shared.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FuseConfirmDialogComponent } from '@kitkat/components/confirm-dialog/confirm-dialog.component';
import { snackBarConfig, snackBarConfigWarn } from 'app/constants/globalFunctions';
import { MatCheckboxChange } from '@angular/material/checkbox';


@Component({
  selector: 'app-cluster-area',
  templateUrl: './cluster-area.component.html',
  styleUrls: ['./cluster-area.component.scss']
})
export class ClusterAreaComponent implements AfterViewInit {
  @ViewChild('add', { static: true }) add: any;
    @ViewChild('add_sub', { static: true }) add_clst: any;    // add/edit apk
  
  
    @ViewChild('areaPaginator') areaPaginator!: MatPaginator;
    @ViewChild('clusterPaginator') clusterPaginator!: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort!: MatSort;
   
    areaForm!: FormGroup;
    clstForm!: FormGroup; 
    private dialogRef: any;
    
    displayedAreaColumns: string[] = ['id',  'name', 'clusters', 'created',  'owner', 'action'];
    displayedClusterColumns: string[] = ['id', 'name', 'users', 'loggers',  'created',  'action'];
  
  
    totalAreaRecords: number;
    totalClstRecords: number; 
   
    public areas: MobileArea[] = []             // total areas                
    public clusters: MobileCluster[] = []  // area->cluster map
    public clustersVisible: MobileCluster[] = []
    public dataSrcArea = new MatTableDataSource<MobileArea>()     // table data source
    public dataSrcClst = new MatTableDataSource<MobileCluster>()
  
    public selArea = new SelectionModel<MobileArea>(false, []);
    public selClst = new SelectionModel<MobileCluster>(false, []);
  
  
    public  areaSelected?: MobileArea
    
    private lng = Language.ENG
    private editMode = false
    private updatePwd = false
    private areaTemp! : MobileArea;
    private clstTemp!: MobileCluster
    keyArea = ''
    keyClst = ''
    searchCtrlArea = new FormControl();
    searchCtrlClst = new FormControl();
  
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    public PERMISSION =  PERMISSION
    permission: number; 
    constructor(
        public dialog: MatDialog,
        private fbArea: FormBuilder,
        private fbClst: FormBuilder,
        private _snackBar: MatSnackBar,
        private _mobileService: MobileUserService,
        private _sharedService : SharedService,
        private _cdr: ChangeDetectorRef
    ){
      
      this.permission = this._sharedService.getPermission()
      console.log(`Current permission: ${this.permission}`)
    }
    
    ngOnInit(){
      this.loadAreas()
      this.loadClusters()
      this.totalAreaRecords = 0
      this.totalClstRecords = 0
      this.searchCtrlArea.valueChanges
          .pipe(
          takeUntil(this._unsubscribeAll),
          debounceTime(300),
          switchMap((query) => {
          this.keyArea = query.trim().toLowerCase()
          if (this.keyArea !== '') {
              let filterData = this.areas.filter(x => (x.name).toLowerCase().includes(this.keyArea));
              this.dataSrcArea.data = filterData
              return this.dataSrcArea.data
          } else {
              this.dataSrcArea.data = this.areas
              return this.dataSrcArea.data;
          }
          })
      )
      .subscribe();
  
      this.searchCtrlClst.valueChanges
          .pipe(
          takeUntil(this._unsubscribeAll),
          debounceTime(300),
          switchMap((query) => {
          this.keyClst = query.trim().toLowerCase()
          if (this.keyClst !== '') {
              const filterd = this.clustersVisible.filter(x=>(x.name).toLocaleLowerCase().includes(this.keyClst))
              this.dataSrcClst.data = filterd
              return this.dataSrcClst.data
          } else {
               this.dataSrcClst.data =  this.clustersVisible
              return this.dataSrcClst.data;
          }
          })
      )
      .subscribe();
     
    }

    ngAfterViewInit(): void {
      this.wireTablePaginators();
    }

    /** Area and cluster tables each need their own paginator; a single ViewChild was stealing the connection. */
    private wireTablePaginators(): void {
      if (this.areaPaginator) {
        this.dataSrcArea.paginator = this.areaPaginator;
      }
      if (this.clusterPaginator && this.dataSrcClst) {
        this.dataSrcClst.paginator = this.clusterPaginator;
      }
      if (this.sort && this.dataSrcClst) {
        this.dataSrcClst.sort = this.sort;
      }
    }
    
    loadAreas(){
      console.log(`download areas`)
      this.areas = []
      this.dataSrcArea = new MatTableDataSource<MobileArea>();
      const userId = this._sharedService.getId()
      this._mobileService.getAllAreas(userId).then((response: DB_RESULT)=>{
          if(response && response.error_code == 0){
              this.areas= response.object as MobileArea[]
              this.dataSrcArea.data = this.areas;
              this.totalAreaRecords = this.areas.length;
              this.wireTablePaginators();
              if(this.areas.length > 0){
                this.onSingleSelectArea(this.areas[0])
              } else {
                this.areaSelected = undefined
                this.wireTablePaginators();
              }
          }
          else{
            console.log(`Failed to read users`)
          }
      })
    }

    loadClusters(){
      console.log(`download areas`)
      this.dataSrcClst = new MatTableDataSource<MobileCluster>();
      const userId = this._sharedService.getId()
      this._mobileService.getClusters(userId).then((response: DB_RESULT)=>{
          if(response && response.error_code == 0){
              this.clusters = response.object as MobileCluster[]
              this.onUpdateClusterData()
          }
          else{
            console.log(`Failed to read users`)
          }
      })
    }
    
    
  
    resetAreaForm(){
      this.areaForm = this.fbArea.group({
          name: ['', Validators.required],          
          created: [null]
      })
      this.updatePwd = false
    }

    resetClusterForm(){
      const area_id = (this.areaSelected)? this.areaSelected.id: ''
      this.clstForm = this.fbArea.group({
          area: [area_id, Validators.required],
          name: ['', Validators.required],          
          created: [null]
      })
      this.updatePwd = false
    }

    getCreateButtonLabel(area: boolean): string{
      if(area){
        return 'Create Area'
      }else{
        return 'Create Cluster'
      }
    }
  
    getDialogTitle(area = true): string{
      if(!this.editMode){
        if(area)
          return 'Create new area'
        else
          return 'Create new cluster'
      }else{
        if(area)
          return 'Edit area'
        else
          return  'Edit Cluster'
      }
    }
  
    
    openAreaModal(action: string, data?: any){
        switch (action) {
          case 'add': // create new apk
              this.editMode = false
              this.resetAreaForm()
              this.dialog.open(this.add, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
              break;
  
          case 'edit':  // edit apk version property
            this.editMode = true
            this.areaTemp = data
            this.resetAreaForm()
            if (this.areaTemp){
              this.areaForm.patchValue(this.areaTemp);
            }
            this.dialog.open(this.add, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
            break;
  
          
          case 'delete':  // delete apk
            this.areaTemp = data
            this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
              this.dialogRef.componentInstance.data = {
              title: "Delete Area",
              message: "Are you sure you want to delete this area?"
              }
              this.dialogRef.afterClosed().subscribe((result) => {
              if (result) {
                  this.onDeleteArea()
              }
            })
            break
          default:
            break;
        }
    }
  
    onSubmitAreaData(){
      console.log(`check the user validity of input form fields`)
      if(!this.areaForm.valid)
      {
        console.log(`Invalid parameter`)
        return
      }
      const name = (this.areaForm.value.name as string).trim()

      if(!name){
        this.warning('Invalid area name')
        return;
      }
       
      var formdata : MobileArea = {
        name: this.areaForm.value.name,
      }
      
      if(!this.editMode){ // create new user
        this._mobileService.createArea(formdata).then((res: DB_RESULT)=>{
          if(res && res.error_code == 0){
            const newArea: MobileArea = res.object as MobileArea
            this.areas.push(newArea)
            this.onUpdateAreas()
            if(!this.areaSelected){// no area selected
              this.onSingleSelectArea(this.areas[0])
            }
            this.notify('Usccess to save changes')
            this._cdr.detectChanges()
            this.closeDialog()
          }
          else{
            console.log(`Failed to create area: ${res.meta}`)
            this.warning(res.meta || 'Faled to create new user account')
          }
        })
        
      }
      else{ // update user property
        if(!this.areaTemp.id){ // invalid user selected
          return
        }
        this._mobileService.updateArea(formdata, this.areaTemp.id).then((res: DB_RESULT)=>{
          if(res && res.error_code== 0){
            const newUser = res.object as MobileArea
            Object.assign(this.areaTemp, newUser)
            this.notify('Success to save changes')
            this.closeDialog()
            this.onUpdateAreas()
            this._cdr.detectChanges()
          }else{
            this.warning(res.meta || 'Failed to update user information')
          }
        }
        )
      }
    }
  
    onDeleteArea(){
      console.log(`delete user data`)
      if(!this.areaTemp.id){
        console.log(`Invalid user selected`)
        return
      }
      const selected = this.areaSelected?.id
      const deleted = this.areaTemp.id
      this._mobileService.deleteArea(this.areaTemp.id).then((res:DB_RESULT)=>{
        if(res && res.error_code == 0){ // success to delete user
          this.notify('Success to delete user account')
          this.areas = this.areas.filter(user=>user.id != this.areaTemp.id)
          this.closeDialog()
          this.onUpdateAreas()
          
          if(deleted == selected ){// selected ID is updated
            if(this.areas.length > 0){
              this.onSingleSelectArea(this.areas[0])
            }else{
              this.onSingleSelectArea(null)
            }            
          }
          this._cdr.detectChanges()
        }else{
          this.warning(res.meta)
        }
      })
    }
  
    openClusterModal(action: string, data?: any){
      switch (action) {
        case 'add': // create new apk
            this.editMode = false
            this.resetClusterForm()
            this.dialog.open(this.add_clst, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
            break;
  
        case 'edit':  // edit apk version property
          this.editMode = true
          this.clstTemp = data
          this.resetClusterForm()
          if (this.clstTemp){
            this.clstForm.patchValue(this.clstTemp);
  
          }
          this.dialog.open(this.add_clst, { width: '800px', panelClass: 'custom-modalbox', disableClose: true });
          break;
  
        
        case 'delete':  // delete apk
          this.clstTemp = data
          this.dialogRef = this.dialog.open(FuseConfirmDialogComponent, { width: '500px', panelClass: 'custom-modalbox' });
            this.dialogRef.componentInstance.data = {
            title: "Delete Cluster",
            message: "Are you sure you want to delete this cluster?"
            }
            this.dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.onDeleteCluster()
            }
          })
          break
        default:
          break;
      }
    }
  
    onSubmitClusterData(){
      if(!this.clstForm.valid){
        console.error(`Invalid parameter`)
        return
      }  
      const name = this.clstForm.value.name.trim()
      const area = this.clstForm.value.area.trim()

      if(!name || !area){
        this.warning('Invalid parameter')
        return;
      }
      
      const formdata : MobileCluster = {
        name: name,
        area: area
      }
  
      console.log(`create/update user data: ${JSON.stringify(formdata)}`)
      if(!this.editMode){ // create new user
        this._mobileService.createCluster(formdata).then((res: DB_RESULT)=>{
          if(res && res.error_code == 0){
            const newCluster: MobileCluster = res.object as MobileCluster
            console.log(`Success to create new cluster: ${JSON.stringify(newCluster)}`)
            this.clusters.push(newCluster)
            this.onUpdateClusterData()
            this.notify('Success to create new users account')
            this.closeDialog()
            this._cdr.detectChanges()
          }
          else{
            this.warning(res.meta || 'Faled to create new user account')
          }
        })
      }
      else{ // update user property
        if(!this.clstTemp.id){ // invalid user selected
          return
        }
        this._mobileService.updateCluster(formdata, this.clstTemp.id).then((res: DB_RESULT)=>{
          if(res && res.error_code== 0){
            const newClst = res.object as MobileCluster
            Object.assign(this.clstTemp, newClst)
            this.onUpdateClusterData()
            this.notify('Success to save changes')
            this.closeDialog()
            this._cdr.detectChanges()
          }else{
            this.warning(res.meta || 'Failed to update user information')
          }
        }
        )
      }
    }  
  
    onDeleteCluster(){
      console.log(`delete user data`)
      if(!this.clstTemp.id){
        console.log(`Invalid user selected`)
        return
      }
      this._mobileService.deleteCluster(this.clstTemp.id).then((res:DB_RESULT)=>{
        if(res && res.error_code == 0){ // success to delete user
          this.notify('Success to delete cluster')
          console.log('Original clusters = ', this.clusters.length)
          this.clusters = this.clusters.filter(cls=>cls.id != this.clstTemp.id)
          console.log('clusters after delete:', this.clusters.length, this.clstTemp.id)
          this.closeDialog()
          this.onUpdateClusterData()
          this._cdr.detectChanges()
        }else{
          this.warning(res.meta)
        }
      })
    }
  
  
    closeDialog(){
        this.editMode = false;
        this.dialog.closeAll();
    }
  
    onUpdateAreas(){
        this.dataSrcArea = new MatTableDataSource<MobileArea>();
        const k = (this.keyArea ?? '').trim().toLowerCase();
        if (k !== '') {
            const filterData = this.areas.filter(x => (x.name || '').toLowerCase().includes(k));
            this.dataSrcArea.data = filterData;
        } else {
            this.dataSrcArea.data = this.areas;
        }
        this.totalAreaRecords = this.areas.length;
        this.wireTablePaginators();
    }

    onUpdateClusterData(){
        this.dataSrcClst = new MatTableDataSource<MobileCluster>();
        this.clustersVisible = []
        if(this.areaSelected){
          this.clustersVisible = this.clusters.filter(cls=>cls.area == this.areaSelected.id)
          const k = (this.keyClst ?? '').trim().toLowerCase();
          if (k !== '') {
              this.dataSrcClst.data = this.clustersVisible.filter(x => (x.name || '').toLowerCase().includes(k));
          } else {
              this.dataSrcClst.data = [...this.clustersVisible];
          }
        }else{
            this.dataSrcClst.data = this.clustersVisible
        }
        // update the number of clusters for each areas
        for(let area of this.areas){
          const cls = this.clusters.filter(c=>c.area == area.id)
          area.clusters = cls.length
        }
        this.totalClstRecords = this.clustersVisible.length;
        this._cdr.detectChanges();
        this.wireTablePaginators();
    }
  
  
    onSingleSelectArea(row: MobileArea) {
      if(row){
        if (!this.selArea.isSelected(row)) {
            this.selArea.select(row);
            this.areaSelected = row
                    
            console.log(`Refresh selected area and clusters: ${this.areaSelected.name}`)
        }
      }else{
        this.selArea.select(null)
        this.areaSelected = undefined
      }
      this.onUpdateClusterData()    
      this._cdr.detectChanges()
    }
  
    onSingleSelectClst(row: MobileCluster) {
      if (!this.selClst.isSelected(row)) {
          this.selClst.select(row);
          this._cdr.detectChanges()
      }
    }
  
  
    getSelectedAreaName(): string{
        if(!this.areaSelected)
            return ''
        return this.areaSelected.name || ''
    }
  
    removeTime(date: string): string{
        return date.substring(0, 10)
    }
    
    isOwnedArea(area: MobileArea): Boolean{
      return area.owner_id == this._sharedService.getId()
    }

    isOwnedCluster(cluster: MobileCluster): boolean {
      return Number(cluster?.permission) > 0;
    }

    onClusterEditClick(cluster: MobileCluster): void {
      if (!this.isOwnedCluster(cluster)) {
        return;
      }
      this.openClusterModal('edit', cluster);
    }

    onClusterDeleteClick(cluster: MobileCluster): void {
      if (!this.isOwnedCluster(cluster)) {
        return;
      }
      this.openClusterModal('delete', cluster);
    }

    private warning(message: string[] | string) {
        if(typeof message == 'string')
          this._snackBar.open(message, '', snackBarConfigWarn)
        else
          this._snackBar.open(message[this.lng], '', snackBarConfigWarn)
      }
  
      private notify(message: string[] | string ) {
        if(typeof message == 'string')
          this._snackBar.open(message, '', snackBarConfig)
        else
          this._snackBar.open(message[this.lng], '', snackBarConfig)
      }
}
