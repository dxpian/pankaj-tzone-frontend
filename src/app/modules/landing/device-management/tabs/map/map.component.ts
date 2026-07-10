import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceManagementService } from '../../device-management.service';

import moment from 'moment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackBarConfigWarn } from 'app/constants/globalFunctions';

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
    endDate: Date;
    startDate: Date;
    @Input() deviceId: string;
    gpsData = [];

    zoom = 6.0
    center: google.maps.LatLngLiteral = {lat: 35.778042336472616, lng: 139.6493180124624};
    mapOptions: google.maps.MapOptions = {
        mapTypeControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    mapReady = false;
    markers: google.maps.Marker[] = []
    map: any

    constructor(
        public _route: ActivatedRoute,
        public _router: Router,
        private _deviceManagementService: DeviceManagementService,
        private _snackBar:MatSnackBar,
        private cdr: ChangeDetectorRef)
    {
        this.endDate = new Date(); // current date and time
        this.startDate = new Date(this.endDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // before 7 days
    }

    ngOnInit(): void {

        this._route.paramMap.subscribe((params) => {
            // Get the 'id' parameter value
            this.deviceId = params.get('id');
        });

        this.getGpsData();
    }

    ngOnChanges(){
        if(!this.deviceId){ // device id
            this.clearData()
        }
        else{
            this.getGpsData()
        }
    }

    onMapInitialized(mapInstance: google.maps.Map){
        console.log(`Map is initialized`)
        this.map = mapInstance;
        this.mapReady = true;
        // add event handler
        this.loadLocationData()
        this.map.addListener('zoom_changed', () => {
            this.zoom = this.map.getZoom();
        });
        this.cdr.detectChanges()
    }

    loadMap() {
        const map = new window['Microsoft'].Maps.Map(document.getElementById('bingMap'), {
            credentials: 'AtRTuGh0YggtKnpWfVsFZEb409OeknHP7Cp8Yc99CfdoNt0RoaCUOces8sMWUP4M', // Replace with your Bing Maps API key
        });

        // Check if there is at least one GPS reading
        // Create an array to store location objects
        const locations = [];
        if (this.gpsData.length > 0) {
            // Iterate through the array and add pushpins for each GPS location
            for (const data of this.gpsData) {
                const coordinates = data.gps.split(',');
                const latitude = parseFloat(coordinates[0].split(' ')[1]);
                const longitude = parseFloat(coordinates[1].split(' ')[1]);

                const location = new window['Microsoft'].Maps.Location(latitude, longitude);
                const pushpin = new window['Microsoft'].Maps.Pushpin(location, {
                    color: 'red', // Customize the marker color if needed
                });

                // Add a custom metadata property to store the time
                pushpin.metadata = { servertime: data.servertime };

                // Add an event listener for mouseover to show a tooltip-like element
                window['Microsoft'].Maps.Events.addHandler(pushpin, 'mouseover', (e) => {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'marker-tooltip';
                    tooltip.textContent = `Time: ${pushpin.metadata.servertime}`;

                    const locationPixel = map.tryLocationToPixel(location, window['Microsoft'].Maps.PixelReference.control);
                    tooltip.style.position = 'absolute';
                    tooltip.style.left = locationPixel.x + 'px';
                    tooltip.style.top = locationPixel.y + 'px';
                    document.getElementById('bingMap').appendChild(tooltip);
                });

                // Add an event listener for mouseout to remove the tooltip-like element
                window['Microsoft'].Maps.Events.addHandler(pushpin, 'mouseout', (e) => {
                    const tooltip = document.querySelector('.marker-tooltip');
                    if (tooltip) {
                        tooltip.remove();
                    }
                });
                map.entities.push(pushpin);
                // Add the location to the array
                locations.push(location);
            }

            // Draw track using a polyline
            if (locations.length > 1) {
                const track = new window['Microsoft'].Maps.Polyline(locations, {
                    strokeColor: 'blue', // Customize the line color if needed
                    strokeThickness: 3
                });
                map.entities.push(track);
            }
        }

        // Set the map view to display all GPS markers and the track
        if (locations.length > 0) {
            const bounds = window['Microsoft'].Maps.LocationRect.fromLocations(locations);
            map.setView({ bounds: bounds, padding: 50 });
        }
    }

    checkForRoute() {
        if (this._router.url.includes('reports/reports-view')) {
            // let item = document.getElementById('map-parent');
            // item.classList.add('map-width')
            return true
        } else {
            // let item = document.getElementById('map-parent');
            // item.classList.remove('map-width')
            return false;
        }
    }

    getEalestTimeofDay(date: Date):Date{
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());

    }

    getLatestTimeofDay(date: Date): Date{
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59,59, 999);
    }

    /*
    read all gps data within time range
    */
    getGpsData() {
        if(!this.deviceId){
            return this.clearData()
        }
        this.gpsData = []
        let object = {
            from: this.getEalestTimeofDay(this.startDate),
            to: this.getLatestTimeofDay(this.endDate),
        }
        this._deviceManagementService.getGpshistory(object, this.deviceId).then((res: any) => {
            if (res && !res.error_code) {
                console.log(`success to read gps data: data length = ${res.object.length}`);
                this.gpsData = res.object
                this.loadLocationData();
            } else {
                this._snackBar.open('Failed to load map data', '', snackBarConfigWarn);

            }
        })
    }

    private clearData(){
        this.gpsData = []
        this.loadLocationData()
    }

    private loadLocationData(){
        if(!this.mapReady)
            return

        const locations: google.maps.LatLngLiteral[] = [];
        const bounds = new google.maps.LatLngBounds();

        if (this.gpsData.length > 0) {
            for (const data of this.gpsData) {
                const coordinates = data.gps.split(',');
                const latitude = parseFloat(coordinates[0].split(' ')[1]);
                const longitude = parseFloat(coordinates[1].split(' ')[1]);

                const position: google.maps.LatLngLiteral = { lat: latitude, lng: longitude };
                locations.push(position);
                bounds.extend(position);

                const marker = new google.maps.Marker({
                    position,
                    map: this.map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 6,
                        fillColor: 'red',
                        fillOpacity: 1,
                        strokeWeight: 0
                    }
                });

                const contentString = `
                    <div
                        class="marker-tooltip"
                    >
                        ${data.servertime}
                    </div>
                    `;

                const infowindow = new google.maps.InfoWindow({
                    content: contentString,
                    position: position
                });


                marker.addListener('mouseover', () => {
                    infowindow.open(this.map, marker);
                });

                marker.addListener('mouseout', () => {
                    setTimeout(() => {
                        infowindow.close();
                    }, 200);
                });

            }

            // Draw polyline
            if (locations.length > 1) {
                const polyline = new google.maps.Polyline({
                    path: locations,
                    strokeColor: 'blue',
                    strokeOpacity: 1.0,
                    strokeWeight: 3,
                    map: this.map,
                });
            }

            // Fit bounds to all markers
            this.map.fitBounds(bounds, 50);
        }

    }
}
