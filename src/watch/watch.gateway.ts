import Config from './../config';

import { SubscribeMessage, WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';

import { WatchService } from './watch.service';
import { JoinRoomDTO } from './dto/JoinRoom.dto';
import { IClientInRoom, IWatchShow } from './@types/Watch.interface';

@WebSocketGateway(Config.General.SocketPort, { 
	namespace: "watch",
	cors: { 
		origin: Config.General.ClientDomain
	},
	transports: ['websocket', 'polling'] 
})
export class WatchGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer() server: Server;

	private clients: Map<string, Socket>;
	private rooms: Map<string, Map<string, Socket>>;
	private clientInRoom: Map<string, IClientInRoom>;

	constructor(@Inject(forwardRef(() => WatchService)) private readonly watchService: WatchService) {
		this.clients = new Map();
		this.rooms = new Map();
		this.clientInRoom = new Map();
	}

	@SubscribeMessage('message')
	handleMessage(client: Socket, payload: any): string {
		console.log(client.id)
		console.log(payload);
		client.emit('response', 'OK!');
		return 'Hello world!';
	}

	afterInit(server: Server) {
		console.log('INIT');
	}
	
	handleDisconnect(client: Socket) {
		this.clients.delete(client.id);
		console.log('Client Disconnect: ' + client.id);

		// Is this person in a room?
		if(this.clientInRoom.has(client.id)) {
			const clientInRoom = this.clientInRoom.get(client.id);
			if(this.rooms.has(clientInRoom.passCode)) { // This room is available, remove him from this room.
				const roomSockets = this.rooms.get(clientInRoom.passCode);
				roomSockets.delete(client.id);

				// Notify all users in room that this user has joined
				var roomViewers = this.GetRoomViewers(roomSockets);
				roomSockets.forEach((s: Socket) => { s.emit('UpdateViewers', roomViewers) })	
			}

			this.clientInRoom.delete(client.id);
		}
	}
	
	handleConnection(client: Socket, ...args: any[]) {
		this.clients.set(client.id, client);
		console.log('Client Connect: ' + client.id); // Connection does not mean being in a room.
	}

	// From Service
	CreateRoom(passCode): void {
		if(this.rooms.has(passCode))
			return;

		this.rooms.set(passCode, new Map<string, Socket>());		
	}

	DeleteRoom(passCode): void {
		if(!this.rooms.has(passCode))
			return;

		this.rooms.delete(passCode);
	}

	async JoinRoom(passCode: string, joinRoomDTO: JoinRoomDTO, auth: { auth: boolean, level: number }): Promise<boolean> {
		if(!this.clients.has(joinRoomDTO.clientId)) 
			return false;

		const client = this.clients.get(joinRoomDTO.clientId);

		var roomSockets: Map<string, Socket>;

		if(!this.rooms.has(passCode))
			return false;

		roomSockets = this.rooms.get(passCode);
	
		roomSockets.set(client.id, client);
		this.clientInRoom.set(client.id, { passCode: passCode, friendlyName: joinRoomDTO.friendlyName, level: auth.auth ? auth.level : 0 });

		// Notify all users in room that this user has joined
		var roomViewers = this.GetRoomViewers(roomSockets);
		this.SendRoomSignal(passCode, (s: Socket) => { s.emit('UpdateViewers', roomViewers) })
		
		return true;
	}

	SetStartTime(passCode: string, newStartTime: Date): void {
		if(!this.rooms.has(passCode))
			return;

		this.SendRoomSignal(passCode, (s: Socket) => { s.emit('UpdateStartTime', newStartTime.getTime()) })
	}

	StartShow(watch: IWatchShow) {
		if(!this.rooms.has(watch.show.passCode))
			return;

		// Send StartSignal
		this.SendRoomSignal(watch.show.passCode, (s: Socket) => { 
			s.emit('PrepareToWatch', { 
				videoUrl: watch.show.movieUrl,
				watchStatus: watch.status // WatchStatus.WATCH_INIT
			}) 
		})
	}

	private SendRoomSignal(passCode: string, callback: (s: Socket) => void) {
		if(!this.rooms.has(passCode))
			return false;

		var roomSockets: Map<string, Socket> = this.rooms.get(passCode);
		roomSockets.forEach((s: Socket) => { callback(s); })

		return true;
	}

	GetRoomViewers(roomSockets: Map<string, Socket>) {
		const viewers = [];
		roomSockets.forEach((s: Socket) => { 
			const viewer = this.clientInRoom.get(s.id);
			const object = { 
				friendlyName: viewer.friendlyName,
				level: viewer.level
			}

			viewers.push(object);
		});

		return viewers;
	}
}
