from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Models.Database import create_tables
from Routes import Authentication,Finance,Groups,Chat
import uvicorn

#Custom made modules 
from Config import Config

server = FastAPI()

#Routes it can have
server.include_router(Authentication.router)
server.include_router(Finance.router)
server.include_router(Groups.router)
server.include_router(Chat.router)

server.add_middleware(
    CORSMiddleware,
    allow_origins=Config.getOrigins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"])

class Server:
    def __init__(self):
        create_tables() 
          
MainServer = Server()

if __name__ == '__main__':
    uvicorn.run(server)