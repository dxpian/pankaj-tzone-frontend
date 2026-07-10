import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { overviewService } from '../overview-service';
import { Router } from '@angular/router';


// constant definition for device state
const DeviceState = {
    online: 0,
    alarm: 1,
    offline: 2,
    total: 3,
};



interface DeviceInfo{
    name?: string,           // device name
    temperature?: string,    // temperature value
    humidity?: string,       // humidity value
    light?: string,          // light value
    vibration?: string,      // vibration value
    battery?: string,        // battery value
    location: string,        // last location
    time?: string,           // last activate time
    state?: number           // DeviceState
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
    overViewDetails: any;
    gpsData: DeviceInfo[] = [];
    map: any;

    DeviceState = DeviceState;


    zoom = 7.5
    center: google.maps.LatLngLiteral = {lat: 35.778042336472616, lng: 139.6493180124624};
    mapOptions: google.maps.MapOptions = {
        mapTypeControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    mapReady = false;
    markers: google.maps.Marker[] = []
    constructor(private _overviewService: overviewService,
        private _router: Router,
        private cdr: ChangeDetectorRef) {

    }

    ngOnInit(): void {
        this.getOverViewDetails()
    }
    getOverViewDetails() {
        this._overviewService.getOverView().then((res: any) => {
        if (res && !res.error_code) {
            this.overViewDetails = res.object[0];
            this.gpsData = this.overViewDetails.devices;
            if(this.mapReady)
                this.loadDeviceData()
        }})
    }
    navigateDevices() {
        this._router.navigate(['/device'])
    }

    onMapInitialized(mapInstance: google.maps.Map){
        console.log(`Map is initialized`)
        this.map = mapInstance;
        this.mapReady = true;
        // add event handler
        this.loadDeviceData()
        this.map.addListener('zoom_changed', () => {
            this.zoom = this.map.getZoom();


        });
        this.cdr.detectChanges()
    }

    private getTooltipColor(state: number){
        if(state == DeviceState.online)
            return '#14a73c'
        else if (state == DeviceState.alarm)
            return '#ff0505'
        else    // offline
            return '#646464'

    }

    loadDeviceData(){
        if (this.gpsData.length > 0) {
        // Create an array to store location objects
        const locations = [];

        // Iterate through the array and add pushpins for each GPS location
        this.markers = []
        for (const data of this.gpsData) {
            if (data.location !== '') {
                const coordinates = data.location.split(',');
                const latitude = parseFloat(coordinates[0].split(' ')[1]);
                const longitude = parseFloat(coordinates[1].split(' ')[1]);
                const location: google.maps.LatLngLiteral = { lat: latitude, lng: longitude };

                const marker = new google.maps.Marker({
                    position: location,
                    map: this.map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 6,
                        fillColor: data.state === 0 ? 'green' : data.state === 1 ? 'red' : data.state === 2 ? 'black' : 'blue',
                        fillOpacity: 1,
                        strokeWeight: 0
                    }
                });

                const contentString = `
                    <div
                        style="background:${this.getTooltipColor(data.state)};
                            color:white;
                            padding:15px;
                            border-radius:5px;
                            position:relative;"
                    >
                        <table style="width:100%; margin-top:2px">
                            <tr><td><strong>Device name</strong></td><td>${data.name + this.getState(data.state)}</td></tr>
                            <tr><td><strong>Temperature</strong></td><td>${data.temperature}</td></tr>
                            <tr><td><strong>Humidity</strong></td><td>${data.humidity}</td></tr>
                            <tr><td><strong>Light</strong></td><td>${data.light}</td></tr>
                            <tr><td><strong>Vibration</strong></td><td>${data.vibration}</td></tr>
                            <tr><td><strong>Battery</strong></td><td>${data.battery}</td></tr>
                            <tr><td><strong>Time</strong></td><td>${data.time}</td></tr>
                        </table>
                    </div>
                    `;

                const infowindow = new google.maps.InfoWindow({
                    content: contentString,
                    position: location
                });


                marker.addListener('mouseover', () => {
                    infowindow.open(this.map, marker);
                });

                marker.addListener('mouseout', () => {
                    setTimeout(() => {
                        infowindow.close();
                    }, 200);
                });

                this.markers.push(marker);
                locations.push(location);
            }
            }

            if (locations.length > 0) {
                const bounds = new google.maps.LatLngBounds();
                locations.forEach(loc => bounds.extend(loc));
                this.map.fitBounds(bounds, { padding: 50 });
            }
        }
    }

    getState(value) {
        return (value == 0) ? '[Online]' : (value == 1) ? '[Alarm]' : '[Offline]'
    }

    pinpointDevices(status,type?) {
        let filteredData = []
        //   const map = new window['Microsoft'].Maps.Map(document.getElementById('bingMap'), {
        //     credentials: 'AtRTuGh0YggtKnpWfVsFZEb409OeknHP7Cp8Yc99CfdoNt0RoaCUOces8sMWUP4M', // Replace with your Bing Maps API key
        // });
        // Clear existing pushpins
        this.map.entities.clear();

        // Filter gpsData based on status
        if(type && type =='total') {
            filteredData = this.gpsData;
        }
        else {
            filteredData = this.gpsData.filter(data => data?.state == status);
        }

        // Check if filteredData is empty
        if (filteredData.length === 0) {
        console.log('No devices of this status.');
        return;
        }

        // Pinpoint devices based on filtered data
        if (filteredData.length > 0) {
        // Create an array to store location objects
        const locations = [];

        // Iterate through the array and add pushpins for each GPS location
        for (const data of filteredData) {
            if (data.location != '') {
            const coordinates = data.location.split(',');
            const latitude = parseFloat(coordinates[0].split(' ')[1]);
            const longitude = parseFloat(coordinates[1].split(' ')[1]);

            const location = new window['Microsoft'].Maps.Location(latitude, longitude);
            const pushpin = new window['Microsoft'].Maps.Pushpin(location, {
                color: data.state == 0 ? 'green' : data.state == 1 ? 'red' : data.state == 2 ? 'black' :'blue', // Customize the marker color if needed
            });

            // Add a custom metadata property to store the time
            pushpin.metadata = {
                servertime: data.time,
                temperature: data.temperature,
                humidity: data.humidity,
                vibration: data.vibration,
                battery: data.battery,
                light: data.light,
                name: data.name,
                state: data.state
            };

            // Add an event listener for mouseover to show a tooltip-like element
            window['Microsoft'].Maps.Events.addHandler(pushpin, 'mouseover', (e) => {
                // const tooltip = document.createElement('div');
                // tooltip.className = 'marker-tooltip';
                // tooltip.textContent = `Time: ${pushpin.metadata.servertime}`;

                // Create the tooltip container
                const tooltip = document.createElement('div');
                tooltip.className = 'marker-tooltip';
                tooltip.style.backgroundColor = '#14a73c'; // Set background color to white
                tooltip.style.color = 'white'; // Set background color to white
                tooltip.style.padding = '15px'; // Add padding
                tooltip.style.borderRadius = '5px'; // Add padding

                // Create a close icon
                const closeIcon = document.createElement('div');
                closeIcon.className = 'close-icon';
                closeIcon.innerHTML = '&times;'; // Unicode for the "times" (X) character
                closeIcon.style.position = 'absolute';
                closeIcon.style.top = '5px';
                closeIcon.style.right = '5px';
                closeIcon.style.cursor = 'pointer';

                // Add click event listener to close the tooltip
                closeIcon.addEventListener('click', () => {
                tooltip.remove();
                });

                // Append close icon to the tooltip container
                tooltip.appendChild(closeIcon);

                // Create a table element to display additional information
                const table = document.createElement('table');
                table.style.width = '100%'; // Set the width of the table to 100%
                table.style.marginTop='2px'


                // Define metadata properties to display in the table
                const metadataProperties = [
                { label: 'Device name', value: pushpin.metadata.name + this.getState(pushpin.metadata.state) },
                { label: 'Temperature', value: pushpin.metadata.temperature },
                { label: 'Humidity', value: pushpin.metadata.humidity },
                { label: 'Light', value: pushpin.metadata.light },
                { label: 'Vibration', value: pushpin.metadata.vibration },
                { label: 'Battery', value: pushpin.metadata.battery },
                { label: 'Time', value: pushpin.metadata.servertime }
                ];

                // Iterate through metadata properties and create table rows
                metadataProperties.forEach(property => {
                // Create table row
                const row = table.insertRow();

                // Create table cells for label and value
                const labelCell = row.insertCell();
                const valueCell = row.insertCell();

                // Set label and value
                labelCell.textContent = property.label;
                valueCell.textContent = property.value;

                // Apply styles to label and value cells
                labelCell.style.fontWeight = 'bold'; // Make label text bold
                labelCell.style.paddingRight = '10px'; // Add right padding to label cell

                // Ensure value cell wraps to the next line if needed
                valueCell.style.wordWrap = 'break-word';
                });
                // Append the table to the tooltip container
                tooltip.appendChild(table);



                const locationPixel = this.map.tryLocationToPixel(location, window['Microsoft'].Maps.PixelReference.control);
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

            this.map.entities.push(pushpin);

            // Add the location to the array
            locations.push(location);
            }

            // Draw track using a polyline
            // if (locations.length > 1) {
            //   const track = new window['Microsoft'].Maps.Polyline(locations, {
            //     strokeColor: 'blue', // Customize the line color if needed
            //     strokeThickness: 3
            //   });

            //   this.map.entities.push(track);
            // }

            // Set the map view to display all GPS markers and the track
            // if (locations.length > 0) {
            //   const bounds = window['Microsoft'].Maps.LocationRect.fromLocations(locations);
            //   this.map.setView({ bounds: bounds, padding: 50 });
            // }
        }
        }
    }

    navigateToDevice(pageType: number){

    }

}
