'''In FastAPI, a standard authentication file requires three things:
Pydantic Schemas: To validate incoming JSON data from your React frontend.
Security Utilities: Functions to hash passwords using passlib.
The API Routes: The actual @router.post() functions.
'''

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
import re
import os
from datetime import datetime, timedelta
from jose import JWTError, jwt

#We import the database i am going to use, with a session function.
from Models.Database import Credentials, get_db

#Import my own custom made encrypter class.
from Models.Encrypter import encrypter

# Load JWT configuration from environment variables with fallback defaults
try:
    from Config import Config
    jwt_config = Config.getJWTConfig()
    SECRET_KEY = jwt_config.get('SECRET_KEY') or os.getenv('SECRET_KEY', 'your-secret-key')
    ALGORITHM = jwt_config.get('ALGORITHM') or os.getenv('ALGORITHM', 'HS256')
    ACCESS_TOKEN_EXPIRE_MINUTES = jwt_config.get('ACCESS_TOKEN_EXPIRE_MINUTES') or int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30'))
except Exception as e:
    print(f"Config import warning: {e}. Using environment variables.")
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key')
    ALGORITHM = os.getenv('ALGORITHM', 'HS256')
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30'))

#Now i want to setup router, where this prefix is used by all api calls.
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Pydantic Schemas will be used. Meaning its like an interface for user input. ---
class loginSchema(BaseModel):
    email: EmailStr 
    password: str 

class registerSchema(BaseModel):
    first_name: str 
    last_name: str 
    email: EmailStr 
    password: str

    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_names(cls, v):
        if not re.match(r'^[a-zA-Z]+$', v):
            raise ValueError('Name must contain only alphabets')
        if len(v) < 1 or len(v) > 50:
            raise ValueError('Name must be between 1 and 50 characters')
        return v.strip()

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$', v):
            raise ValueError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character')
        return v

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        # Additional email validation if needed, but EmailStr handles basic
        return v.strip().lower()

#Routes:

@router.post("/register")
def register(user:registerSchema, db: Session = Depends(get_db)):

    try:
        # Sanitize inputs (Pydantic additional checks)
        user.first_name = user.first_name.strip()
        user.last_name = user.last_name.strip()
        user.email = user.email.strip().lower()

        #Check if Credentials has user mail registered.
        existing_user = db.query(Credentials).filter(Credentials.email == user.email).first()

        if existing_user:
            #Return
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")
        else:
            #Process

            #i need this password for future references (Such as otp generation)
            incoming = user.password
            hashed_password = encrypter.create_hash(password=incoming)

            #Now i store this data. First use Class(Name of table) ,keyword is the column name, 
            #user is pydantic schema, which is the input in dict form
            #and to access the value we use user.*
            newUser = Credentials(first_name=user.first_name, 
                                  last_name=user.last_name, 
                                  email=user.email, 
                                  password_hash=hashed_password)
            db.add(newUser)
            db.commit()

            #now at the end, create a token.
            token = create_access_token(data={"sub": newUser.email, "unique_user_id": str(newUser.unique_user_id)}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

            db.refresh(newUser)
            print(f"{user}")
            
            return {"message": "User registered successfully.", "unique_user_id": str(newUser.unique_user_id),"access_token": token}
    except ValueError as ve:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        db.rollback()
        print(f"Registration error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error.")
    

@router.post("/login")
def login(user: loginSchema, db: Session = Depends(get_db)):
    try:
        # Sanitize email
        user.email = user.email.strip().lower()

        # Find user by email
        db_user = db.query(Credentials).filter(Credentials.email.ilike(user.email)).first()
        if not db_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

        # Verify password
        if not encrypter.verify_hash(user.password, db_user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user.email, "unique_user_id": str(db_user.unique_user_id)}, expires_delta=access_token_expires
        )

        return {
            "access_token": str(access_token),
            "token_type": "bearer",
            "user": {
                "id": str(db_user.unique_user_id),
                "first_name": db_user.first_name,
                "last_name": db_user.last_name,
                "email": db_user.email
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error.") 
