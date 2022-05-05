import Config from './../config';

import { SubscribeMessage, WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Cron, CronExpression } from '@nestjs/schedule';
import { forwardRef, Inject, Logger } from '@nestjs/common';

import { WatchService } from './watch.service';
import { JoinRoomDTO } from './dto/JoinRoom.dto';
import { IClientInRoom, IWatchShow } from './@types/Watch.interface';
import { WatchStatus } from './watchStatus.enum';

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
	private readonly logger = new Logger(WatchGateway.name);

	constructor(@Inject(forwardRef(() => WatchService)) private readonly watchService: WatchService) {
		this.clients = new Map();
		this.rooms = new Map();
		this.clientInRoom = new Map();
	}

	@SubscribeMessage('ClientJoinedRoom')
	OnClientJoinedRoom(client: Socket, payload: { passCode: string }): void {
		if(!this.VerifyClient(payload.passCode, client.id))
			return;

		// Room Current Status?
		const watch: IWatchShow = this.watchService.GetRoom(payload.passCode);
		if(watch) {
			switch(watch.status) {
				case WatchStatus.WATCH_INIT:
					client.emit('PrepareToWatch', { 
						videoUrl: watch.show.movieUrl,
						watchStatus: watch.status // WatchStatus.WATCH_INIT
					}) 
					break;
				case WatchStatus.WATCH_ONLINE:
					client.emit('StartWatching', { 
						videoUrl: watch.show.movieUrl,
						watchStatus: watch.status, // WatchStatus.WATCH_ONLINE
						playing: watch.playing,
						progress: watch.playing ? 0.0 : watch.progress,
						progressAtTime: watch.realStartTime.getTime(),
						duration: watch.show.duration,
						voting: { ...watch.voting, voted: this.clientInRoom.get(client.id).voted }
					}) 
					
					break;
				// This could be useless because users won't be able to join after it's finished
				case WatchStatus.WATCH_FINISHED:
					client.emit('FinishWatching', { 
						watchStatus: watch.status, // WatchStatus.WATCH_FINISHED
						showStatus: watch.show.status, // ShowStatus.Finished
						finishedAt: watch.show.finishedAt
					}) 
					
					break;
			}
		}
	}

	@SubscribeMessage('VideoAction')
	OnVideoAction(client: Socket, payload: { passCode: string, action: string, to?: number, sendTime?: number }) {
		if(!this.VerifyClient(payload.passCode, client.id))
			return;

		const clientInRoom = this.clientInRoom.get(client.id);
		if(clientInRoom.level <= 0) return;

		const watch = this.watchService.GetRoom(payload.passCode);
		if(!watch) return;

		switch(payload.action) {
			case 'Pause':
				if(this.watchService.PauseShow(watch)) {
					if(watch.voting.active) this.CancelVote(watch);
					this.SendRoomSignal(payload.passCode, (s: Socket) => { s.emit('VideoAction', { action: 'Pause', data: { progress: watch.progress } }) })
				}
				break;
			case 'Resume':
				if(this.watchService.ResumeShow(watch)) {
					if(watch.voting.active) this.CancelVote(watch);
					this.SendRoomSignal(payload.passCode, (s: Socket) => { s.emit('VideoAction', { action: 'Resume', data: { progress: watch.progress, realStartTime: watch.realStartTime } }) })
				} break;
			case 'Slide':
				const currentTime = new Date().getTime();
				const exactTo = payload.to + ((currentTime - payload.sendTime) / 1000);

				if(this.watchService.SlideShow(watch, exactTo))
					this.SendRoomSignal(payload.passCode, (s: Socket) => { s.emit('VideoAction', { action: 'Slide', data: { progress: watch.progress, realStartTime: watch.realStartTime, sendTime: new Date().getTime() } }) })
				break;
		}
	}

	@SubscribeMessage('Voting')
	OnVoting(client: Socket, payload: { passCode: string, action: string, data?: any }) {
		if(!this.VerifyClient(payload.passCode, client.id))
			return;

		const clientInRoom = this.clientInRoom.get(client.id);
		const watch: IWatchShow = this.watchService.GetRoom(payload.passCode);
		const voting = watch.voting;

		if(!voting.enable) return;

		switch(payload.action) {
			case 'Request':
				const toPause: boolean = payload.data.toPause;

				if(voting.active) return;
				if((watch.playing && !toPause) || (!watch.playing && toPause)) return; // Invalid, why pause while it's already paused? or resume

				// Start a vote
				voting.active = true;
				voting.result.yes = voting.result.no = 0;
				voting.startTime = new Date().getTime();
				voting.endTime = new Date().getTime() + (15 * 1000); // 10 seconds
				voting.starterName = clientInRoom.friendlyName;
				voting.toPause = toPause;

				this.SendRoomSignal(payload.passCode, (s: Socket) => { s.emit('UpdateVoting', { action: 'Update', data: voting }) });

				break;
			case 'Vote':
				const yes: boolean = payload.data.yes;

				if(!voting.active || clientInRoom.voted !== -1) return;
			
				if(yes) voting.result.yes++;
				else voting.result.no++;

				clientInRoom.voted = yes ? 1 : 0;

				this.SendRoomSignal(payload.passCode, (s: Socket) => { s.emit('UpdateVoting', { action: 'Update', data: voting }) });

				break;
		}
	}

	afterInit(server: Server) {
		this.logger.log(`Socket server has initialized.`)
	}
	
	handleDisconnect(client: Socket) {
		this.clients.delete(client.id);
		this.logger.log(`Socket [${client.id}] has disconnected.`)

		// Is this person in a room?
		if(this.clientInRoom.has(client.id)) {
			const clientInRoom = this.clientInRoom.get(client.id);
			if(this.rooms.has(clientInRoom.passCode)) { // This room is available, remove him from this room.
				// If there is a vote, remove this vote
				const watch = this.watchService.GetRoom(clientInRoom.passCode);
				if(watch && watch.voting.active && clientInRoom.voted !== -1) { // Voted
					if(clientInRoom.voted >= 1) watch.voting.result.yes--;
					else watch.voting.result.no--;
				}

				const roomSockets = this.rooms.get(clientInRoom.passCode);
				roomSockets.delete(client.id);

				// Notify all users in room that this user has disconnected
				var roomViewers = this.GetRoomViewers(roomSockets);
				this.SendRoomSignal(clientInRoom.passCode, (s: Socket) => { s.emit('UpdateViewers', roomViewers) })
			}

			this.clientInRoom.delete(client.id);
		}
	}
	
	handleConnection(client: Socket, ...args: any[]) {
		this.clients.set(client.id, client);
		this.logger.log(`Socket [${client.id}] has connected.`)
	}

	// From Service
	CreateRoom(passCode: string): void {
		if(this.rooms.has(passCode))
			return;

		this.rooms.set(passCode, new Map<string, Socket>());	
		this.logger.log(`Room [${passCode}] has been created.`);	
	}

	RemoveRoom(passCode: string): void {
		if(!this.rooms.has(passCode))
			return;

		const room = this.rooms.get(passCode);
		var count = 0;
		room.forEach((s: Socket) => { // Loop all clients in room
			//s.emit('KickUserOut');
			s.disconnect();

			this.clientInRoom.delete(s.id);
			count++;
		});

		this.rooms.delete(passCode);
		this.logger.log(`Room [${passCode}] has been removed.`);	
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
		this.clientInRoom.set(client.id, { passCode: passCode, friendlyName: joinRoomDTO.friendlyName, level: auth.auth ? auth.level : 0, voted: -1 });

		// Notify all users in room that this user has joined
		var roomViewers = this.GetRoomViewers(roomSockets);
		this.SendRoomSignal(passCode, (s: Socket) => { s.emit('UpdateViewers', roomViewers) })

		// Next Event: ClientJoinedRoom
		this.logger.log(`Socket [${joinRoomDTO.clientId}] with name [${joinRoomDTO.friendlyName}] (Lv.${auth.level}) has joined room [${passCode}].`);	
		
		return true;
	}

	SetStartTime(passCode: string, newStartTime: Date): void {
		if(!this.rooms.has(passCode))
			return;

		this.SendRoomSignal(passCode, (s: Socket) => { s.emit('UpdateStartTime', newStartTime.getTime()) })
	}

	PrepareShow(watch: IWatchShow) {
		if(!this.rooms.has(watch.show.passCode))
			return;

		// Send StartSignal
		this.SendRoomSignal(watch.show.passCode, (s: Socket) => { 
			s.emit('PrepareToWatch', { 
				videoUrl: watch.show.movieUrl,
				watchStatus: watch.status // WatchStatus.WATCH_INIT
			}) 
		})

		this.logger.log(`Room [${watch.show.passCode}] has prepared to watch.`);	
	}

	StartShow(watch: IWatchShow) {
		if(!this.rooms.has(watch.show.passCode))
			return;

		// Send StartSignal
		this.SendRoomSignal(watch.show.passCode, (s: Socket) => { 
			s.emit('StartWatching', { 
				videoUrl: watch.show.movieUrl,
				watchStatus: watch.status, // WatchStatus.WATCH_ONLINE
				playing: watch.playing,
				progress: 0.0,
				progressAtTime: watch.realStartTime.getTime(),
				duration: watch.show.duration,
				voting: { ...watch.voting, voted: this.clientInRoom.get(s.id).voted }
			}) 
		})

		this.logger.log(`Room [${watch.show.passCode}] has started watching.`);	
	}

	EndShow(watch: IWatchShow) {
		if(!this.rooms.has(watch.show.passCode))
			return;

		// Send StartSignal
		this.SendRoomSignal(watch.show.passCode, (s: Socket) => { 
			s.emit('FinishWatching', { 
				watchStatus: watch.status, // WatchStatus.WATCH_FINISHED
				showStatus: watch.show.status, // ShowStatus.Finished
				finishedAt: watch.show.finishedAt.getTime()
			}) 
		})

		this.logger.log(`Room [${watch.show.passCode}] has finished watching.`);	
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

	VerifyClient(passCode: string, clientId: string): boolean {
		if(!this.rooms.has(passCode))
			return false;

		var roomSockets: Map<string, Socket> = this.rooms.get(passCode);
		if(!roomSockets.has(clientId))
			return false;

		return true;
	}

	CancelVote(watch: IWatchShow) {
		if(!watch.voting.active) return;

		watch.voting.active = false;

		const roomSockets: Map<string, Socket> = this.rooms.get(watch.show.passCode);

		roomSockets.forEach((client: Socket) => { 
			let clientInRoom = this.clientInRoom.get(client.id);
			if(clientInRoom) clientInRoom.voted = -1;

			client.emit('UpdateVoting', { action: 'Finish', data: watch.voting }) 
		});
	}

	@Cron(CronExpression.EVERY_SECOND)
	async ProcessVoting() {
		var currentTime = new Date();

		this.rooms.forEach((clients:  Map<string, Socket>, passCode: string) => {
			const watch = this.watchService.GetRoom(passCode);
			if(!watch) return;

			const voting = watch.voting;
			if(!voting.enable || !voting.active) return;

			if(currentTime.getTime() < voting.endTime) {
				clients.forEach((client: Socket) => { client.emit('UpdateVoting', { action: 'Update', data: voting }) });
				return;
			}

			// End!
			voting.active = false;
			if(voting.result.yes > voting.result.no) {
				if(watch.playing && voting.toPause) {
					if(this.watchService.PauseShow(watch))
						clients.forEach((s: Socket) => { s.emit('VideoAction', { action: 'Pause', data: { progress: watch.progress } }) })
				} else if(!watch.playing && !voting.toPause) {
					if(this.watchService.ResumeShow(watch))
						clients.forEach((s: Socket) => { s.emit('VideoAction', { action: 'Resume', data: { progress: watch.progress, realStartTime: watch.realStartTime } }) })
				}
			}

			clients.forEach((client: Socket) => { 
				let clientInRoom = this.clientInRoom.get(client.id);
				if(clientInRoom) clientInRoom.voted = -1;

				client.emit('UpdateVoting', { action: 'Finish', data: voting }) 
			});
		});
	}
}
