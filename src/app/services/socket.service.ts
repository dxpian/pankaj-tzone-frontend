import { Injectable } from '@angular/core';
import { environment } from '../enviroment/enviroment';
import { Observable, Subject } from 'rxjs';
import { WebSocketSubject, webSocket } from "rxjs/webSocket";
import {io, Socket } from 'socket.io-client';
// import { Socket } from 'angular-socket-io';


@Injectable({
	providedIn: 'root'
})
export class SocketService {
	// private socket$: WebSocketSubject<any>;
	// public socket: WebSocket;
  private socket: Socket;
  private messageSubject = new Subject<any>();

	connection$: WebSocketSubject<any>;
	RETRY_SECONDS = 10;

	constructor() {
    this.socket = io(environment.socketUrl,  {transports: ['websocket'], upgrade: false });
    this.initSocketListeners();
		// this.socket$ = webSocket(`${environment.socketUrl}`); // Replace with your WebSocket server URL

	}
  private initSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('message', (message: any) => {
      // console.log('Received message:', message);
      // Emit the message to the observable for components to subscribe
      this.messageSubject.next(message);
    });


  }

  getMessages(): Observable<any> {
      return this.messageSubject.asObservable();
  }

  sendMessage(message: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('message', message);
    } else {
      console.error('Socket is not connected. Unable to send message.');
    }
  }

  // Add more methods as needed
  disconnect(): void {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }
  connect(): void {
    // Initialize the socket connection
    this.socket = io(environment.socketUrl, { transports: ['websocket'], upgrade: false });

    // Set up event listeners
    this.initSocketListeners();
  }



  close(): void {
    // Close the socket connection
    this.socket.close();
  }


}
