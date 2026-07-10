import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, OnInit } from '@angular/core';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { SystemService } from '../system.service';
import { DeviceManagementService } from '../../device-management/device-management.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackBarConfig } from 'app/constants/globalFunctions';


interface Device {
  id: string;
  name: string;
  group: string;
}

interface Group {
  group: string;
  devices: Device[];
}

interface DeviceNode {
  name: string;
  id?: string;
  children?: DeviceNode[];
}

@Component({
  selector: 'app-big-screen-monitoring-settings',
  templateUrl: './big-screen-monitoring-settings.component.html',
  styleUrls: ['./big-screen-monitoring-settings.component.scss']
})

export class BigScreenMonitoringSettingsComponent implements OnInit { 

  treeControl = new NestedTreeControl<DeviceNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<DeviceNode>();
  deviceListBgScreen: any =[];
  TREE_DATA: DeviceNode[]
  condition: any [];
  selectedDevices: any [];

  constructor(
    private _systemService: SystemService,
    private _deviceService:DeviceManagementService,
    private _snackBar:MatSnackBar
  ) {
    
  }
  hasChild = (_: number, node: DeviceNode) => !!node.children && node.children.length > 0;
  ngOnInit(): void { 
    this.getDevicesGroup()
    this.getSelectedDevices()
    console.log('data', this.dataSource.data)

  }
  mapGroupArrayToTree(groups: Group[]): DeviceNode[] {
    const tree: DeviceNode[] = [];
  
    groups.forEach((group) => {
      const groupNode: DeviceNode = {
        name: group.group,
        children: [],
      };
  
      group.devices.forEach((device) => {
        const deviceNode: DeviceNode = {
          name: device.name,
          id: device.id,
        };
  
        groupNode.children.push(deviceNode);
      });
  
      tree.push(groupNode);
    });
  
    return tree;
  }
  getDeviceStatus(id) {
    if(id !=='') {
      this._deviceService.getDeviceById(id).then((res:any) => {
        if(res && !res.error_code) {
           this.condition =  res.object[0].cond;
           return
        }
      })
    } else {
      return 2
    }
   
  }
  

  getDevicesGroup() {
    this._systemService.getDeviceListBigScreen().then((res:any) => {
      if(res && !res.error_code) {
        this.deviceListBgScreen = res?.object;
        this.TREE_DATA = this.mapGroupArrayToTree(this.deviceListBgScreen);
        this.dataSource.data = this.TREE_DATA;
        console.log('changes',this.deviceListBgScreen)
      }
    })
  } 
  getSelectedDevices() {
    this._systemService.getGetSelectedDevicesBigScreen().then((res:any) => {
      if(res && !res.error_code) {
        this.selectedDevices = res?.object; 
        console.log('changes',this.selectedDevices)
      }
    })
  }
  selectADevice(id) {
    this._systemService.addSelectedDevicesBigScreen(id).then((res:any) => {
      if(res && !res.error_code) {
        this.selectedDevices = res?.object; 
        this._snackBar.open(`Added Successfully!`, '', snackBarConfig);
        this.getSelectedDevices();
      }
    })
  }
  checknode(id) {
    console.log('id', id)
  }
  deleteSelected(id) {
    this._systemService.removeSelectedDevicesBigScreen(id).then((res:any) => {
      if(res && !res.error_code) {
        this.selectedDevices = res?.object; 
        this._snackBar.open(`Removed Successfully!`, '', snackBarConfig);
        this.getSelectedDevices();
      }
    })
  } 
}
