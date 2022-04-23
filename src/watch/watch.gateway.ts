import Config from './../config';
import { SubscribeMessage, WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@WebSocketGateway(Config.General.SocketPort, { 
	namespace: "watch",
	cors: { 
		origin: Config.General.ClientDomain
	},
	transports: ['websocket', 'polling'] 
})
export class WatchGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer() server: Server;
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
		console.log('Client Disconnect: ' + client.id);
	}
	
	handleConnection(client: Socket, ...args: any[]) {
		console.log('Client Connect: ' + client.id);
	}
}
