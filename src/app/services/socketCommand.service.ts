import { Injectable } from '@angular/core';
import { environment } from '../enviroment/enviroment';
import { Observable, Subject } from 'rxjs';
import { WebSocketSubject, webSocket } from "rxjs/webSocket";
import {io, Socket } from 'socket.io-client';
// import { Socket } from 'angular-socket-io';


@Injectable({
	providedIn: 'root'
})
export class SocketCommandService {
	// private socket$: WebSocketSubject<any>;
	// public socket: WebSocket;
    private socket: Socket;
    private messageSubject = new Subject<any>();

	connection$: WebSocketSubject<any>;
	RETRY_SECONDS = 10;

	constructor() {
        this.socket = io(environment.socketUrl ,{ transports: ['websocket'], upgrade: false });
    }

    connect(event_name: string): void {
        // Initialize the socket connection
        this.socket = io(environment.socketUrl, { transports: ['websocket'], upgrade: false });
        if(event_name)
            this.initSocketListeners(event_name);
    }

    private initSocketListeners(event_name: string): void {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        this.socket.on(event_name, (message: any) => {
            this.messageSubject.next(message);
        });
    }

    getMessages(): Observable<any> {
        return this.messageSubject.asObservable();
    }

    // Add more methods as needed
    disconnect(): void {
        if (this.socket && this.socket.connected) {
        this.socket.disconnect();
        }
    }

    close(): void {
        // Close the socket connection
        this.socket.close();
    }
}
