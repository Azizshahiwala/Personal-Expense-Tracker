import asyncio, os, json
import redis.asyncio as redis
from fastapi import WebSocket
from Config import Config

class ConnectionManager():
    def __init__(self):
        self.active_conn: dict[str, list[WebSocket]] = {}
        self.redis = None
        self.pubsub = None
        self.listener_task = None

    async def _get_redis(self):
        """Lazy init — only connects to Redis on first actual use."""
        if self.redis is None:
            redis_uri = str(Config.getRedisUrl()['REDIS_URL'])
            self.redis = redis.from_url(redis_uri, decode_responses=True, ssl_cert_reqs=None)
            self.pubsub = self.redis.pubsub()
        return self.redis

    async def _connect(self, websocket: WebSocket, groupcode: str):
        await websocket.accept()
        try:
            await self._get_redis()

            if groupcode not in self.active_conn:
                self.active_conn[groupcode] = []
                await self.pubsub.subscribe(f"room_{groupcode}")

                if self.listener_task is None:
                    self.listener_task = asyncio.create_task(self._listen())

            self.active_conn[groupcode].append(websocket)

        except Exception as e:
            print(f"REDIS ERROR in _connect: {e}")
            await websocket.close(code=1011)

    def _disconnect(self, websocket: WebSocket, groupcode: str):
        if groupcode in self.active_conn:
            try:
                self.active_conn[groupcode].remove(websocket)
            except ValueError:
                pass
            if not self.active_conn[groupcode]:
                del self.active_conn[groupcode]

    async def _broadcast(self, groupcode: str, message_payload: dict):
        await self._get_redis()
        await self.redis.publish(f"room_{groupcode}", json.dumps(message_payload))

    async def _listen(self) -> None:
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                channel = message["channel"]
                groupcode = channel.replace("room_", "")
                data = json.loads(message["data"])

                if groupcode in self.active_conn:
                    for connection in self.active_conn[groupcode]:
                        try:
                            await connection.send_json(data)
                        except Exception as e:
                            print(f"Failed to send to dead socket: {e}")

manager = ConnectionManager()