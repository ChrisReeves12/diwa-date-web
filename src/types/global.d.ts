import { SocketIOService } from '@/websocket/services/socketio.service';
import { RabbitMQService } from '@/websocket/services/rabbitmq.service';

declare global {
    namespace NodeJS {
        interface Global {
            websocketServices?: {
                socketIO: SocketIOService;
                rabbitMQ: RabbitMQService;
            };
        }
    }

    // eslint-disable-next-line no-var
    var websocketServices: {
        socketIO: SocketIOService;
        rabbitMQ: RabbitMQService;
    } | undefined;
}

export { }; 