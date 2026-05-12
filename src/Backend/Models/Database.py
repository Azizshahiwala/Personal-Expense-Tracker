from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import UUID
import uuid

from datetime import datetime
import os, sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Config import Config 

#Now load the variables first.
DATABASEURL = ""
Config.loadvariables()
dbvar=Config.getDBvariables()    

DATABASEURL = f"postgresql://{dbvar['USERNAME']}:{dbvar['PASSWORD']}@{dbvar['HOSTNAME']}:{dbvar['PORT']}/{dbvar['DATABASE']}"
print("Database URL:", DATABASEURL)

#Now check if the database exists or not if not, create it.
#To do, we need to connect to the default 'postgres' database first, then check if our target database exists, and create it if it doesn't. This is because you cannot connect to a database that doesn't exist yet. 
try:
    conn = psycopg2.connect(
        host=dbvar['HOSTNAME'],
        port=dbvar['PORT'],
        user=dbvar['USERNAME'],
        password=dbvar['PASSWORD'],
        dbname='postgres') 

    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
    with conn.cursor() as cursor: 
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname='{dbvar['DATABASE']}'")
        exists = cursor.fetchone()
        if not exists:
            cursor.execute(f'CREATE DATABASE "{dbvar["DATABASE"]}"')
            print(f"Database '{dbvar['DATABASE']}' created successfully.")
        else:
            print(f"Database '{dbvar['DATABASE']}' already exists.")

except psycopg2.OperationalError as e:
        print(f"Error occurred: {e}")

# 1. Create the SQLAlchemy Engine
engine = create_engine(DATABASEURL)

# 2. Create a SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Create the Base class for your models
Base = declarative_base()

#This db table is for registration and login.
class Credentials(Base):
    __tablename__ = "Credentials"
    unique_user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(100), unique=True)
    password_hash = Column(String(255))  # Hashed, not plain!
    created_at = Column(DateTime)

class UserProfile(Base):
    __tablename__ = "UserProfile"
    #UserAddressCard.tsx 
    unique_user_id = Column(UUID(as_uuid=True), ForeignKey("Credentials.unique_user_id"),unique=True,primary_key=True)  # One-to-one relationship with Credentials
    country = Column(String(100),nullable=True)
    cityAndState = Column(String(100),nullable=True)  
    postalCode = Column(String(20),nullable=True)
    
    #UserInfoCard.tsx
    first_name = Column(String(100),nullable=True)
    last_name = Column(String(100),nullable=True)
    email = Column(String(100),ForeignKey("Credentials.email"))
    phone_number = Column(String(20),nullable=True)
    bio = Column(String(500),nullable=True)

    #UserMetaCard.tsx
    
    facebook_link = Column(String(255),nullable=True)
    twitter_link = Column(String(255),nullable=True)
    linkedin_link = Column(String(255),nullable=True)
    instagram_link = Column(String(255),nullable=True)

    #UserMetaCard and /header/UserDropdown.tsx
    pfp_path = Column(String(255),default="/images/user/default.jpg",nullable=False)
#This table is for creation of groups
class Group(Base):
    __tablename__ = "Groups"
    
    id = Column(Integer, primary_key=True)
    group_name = Column(String(100))
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("Credentials.unique_user_id"))  # Admin
    is_dissolved = Column(Boolean, default=False)

#This table is for mapping users to groups and defining their roles (admin/member).
class GroupMember(Base):
    __tablename__ = "Groupmembers"
    
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("Groups.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("Credentials.unique_user_id"))
    is_admin = Column(String(20), default="member")  # "admin" or "member"

def create_tables():
    try:
        #this function is used to bind the models to the database and create the tables if they don't exist.
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")

# 5. Dependency to get the DB session in your routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()