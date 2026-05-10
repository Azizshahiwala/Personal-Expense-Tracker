import os
from pathlib import Path 
from dotenv import load_dotenv
#This line returns directory of current file.
# __file__ is path of current file.

base_dir = Path(__file__).parent.resolve()
env_path = os.path.join(base_dir,"keys.env")
load_dotenv(os.path.join(base_dir,"keys.env"))
print("Base directory containing env file:",base_dir)

class Config:
    DBHOSTNAME = None
    DBDATABASE = None
    DBUSERNAME = None
    DBPASSWORD = None
    DBPORT = None
    SECRET_KEY = None
    ALGORITHM = None
    ACCESS_TOKEN_EXPIRE_MINUTES = None
    LOCALHOST = None
    VITE_WEB_PATH = None
    VITE_PY_PATH = None
    VITE_ROUTE_API_KEY = None
    
    @classmethod 
    def loadvariables(cls):
        try:
            required_vars = ["DBHOSTNAME", "DBDATABASE", "DBUSERNAME", "DBPASSWORD", "DBPORT", "LOCALHOST", "VITE_WEB_PATH", "VITE_PY_PATH", "VITE_ROUTE_API_KEY"]
                
            for var in required_vars:
                if os.getenv(var) is None:
                    raise ValueError(f"{var} environment variable is not set.")
                    
            cls.DBHOSTNAME = os.getenv("DBHOSTNAME")
            cls.DBDATABASE = os.getenv("DBDATABASE")
            cls.DBUSERNAME = os.getenv("DBUSERNAME")
            cls.DBPASSWORD = os.getenv("DBPASSWORD")
            cls.DBPORT = os.getenv("DBPORT")
            cls.LOCALHOST = os.getenv("LOCALHOST")
            cls.VITE_WEB_PATH = os.getenv("VITE_WEB_PATH")
            cls.VITE_PY_PATH = os.getenv("VITE_PY_PATH")
            cls.VITE_ROUTE_API_KEY = os.getenv("VITE_ROUTE_API_KEY")
            
            print("Configuration loaded successfully.")
            
        except Exception as e:
            print(f"Error loading configuration: {e}")
            
    @classmethod
    def getDBvariables(cls):
        return {
            "HOSTNAME": cls.DBHOSTNAME,
            "DATABASE": cls.DBDATABASE,
            "USERNAME": cls.DBUSERNAME,
            "PASSWORD": cls.DBPASSWORD,
            "PORT": cls.DBPORT}
    
    @classmethod
    def getOrigins(cls):
        return [
            cls.LOCALHOST,
            cls.VITE_WEB_PATH,
            cls.VITE_PY_PATH,
            cls.VITE_ROUTE_API_KEY
        ]
    @classmethod
    def getJWTConfig(cls):
        return {
            "SECRET_KEY": cls.SECRET_KEY,
            "ALGORITHM": cls.ALGORITHM,
            "ACCESS_TOKEN_EXPIRE_MINUTES": cls.ACCESS_TOKEN_EXPIRE_MINUTES
        }
    
    


