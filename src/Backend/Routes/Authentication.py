'''In FastAPI, a standard authentication file requires three things:
Pydantic Schemas: To validate incoming JSON data from your React frontend.
Security Utilities: Functions to hash passwords using passlib.
The API Routes: The actual @router.post() functions.
'''

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request,Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
import re, os, shutil, uuid
from datetime import datetime, timedelta
from jose import JWTError, jwt

#We import the database i am going to use, with a session function.
from Models.Database import Credentials,UserProfile,Group,GroupMember, get_db

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

try:
    UPLOAD_DIRECTORY = os.path.join(os.path.dirname("./Group-Expense-Tracker"),"public","images","user")

    #Create a dir where users will upload their images.
    if not os.path.exists(UPLOAD_DIRECTORY):
        os.makedirs(UPLOAD_DIRECTORY)
except Exception as e:
    print(e)
#Now i want to setup router, where this prefix is used by all api calls.
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

#This is used to get a existin jwt token
def get_current_user(request: Request):
    # The extra DB query (verifying user still exists) is optional overhead.
    # The JWT token itself is proof enough for most routes.
    # If you need to verify the user still exists in DB, add it back only
    # on the specific routes that require it, not here.
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid"
        )
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: str = payload.get("unique_user_id")
        if email is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        return {"email": email, "user_id": user_id}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    #This is used to create a jwt token
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
            db.refresh(newUser)

            #now at the end, create a token.
            token = create_access_token(data={"sub": newUser.email, "unique_user_id": str(newUser.unique_user_id)}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

            #After adding Credentials, refresh. Then create new object. To link, use PreviousObj.unique_user_id and
            #then add it.
            newProfile = UserProfile(
                unique_user_id = newUser.unique_user_id,
                first_name=user.first_name, 
                last_name=user.last_name, 
                email=user.email,
                pfp_path = "/images/user/default.jpg")
            
            db.add(newProfile)
            db.commit()
            print(f"{user}")
            
            return {"message": "User registered successfully.", "unique_user_id": str(newUser.unique_user_id),"access_token": token}
    except HTTPException:
        # FIX 4: Re-raise HTTPExceptions immediately (don't let them fall
        # into the generic Exception handler below).
        db.rollback()
        raise
    except ValueError as ve:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        db.rollback()
        print(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error."
        )

@router.post("/login")
def login(user: loginSchema, db: Session = Depends(get_db)):
    try:
        room_data= None
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
        access_token_expires = timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTES))
        access_token = create_access_token(
            data={"sub": db_user.email, "unique_user_id": str(db_user.unique_user_id)}, expires_delta=access_token_expires
        )

        #Check if user is a member of any grp:
        member_record = db.query(GroupMember).filter(GroupMember.user_id == db_user.unique_user_id).first()
        
        if member_record:
            group_record = db.query(Group).filter(Group.invitecode == member_record.group_id).first()
            
            if group_record:
                room_data = {
                    "Groupname": group_record.group_name,
                    "GroupMemberkey": member_record.id,
                    "Groupid": group_record.invitecode,
                    "role": member_record.is_admin
                }
                
        return {
            "access_token": str(access_token),
            "token_type": "bearer",
            "user": {
                "id": str(db_user.unique_user_id),
                "first_name": db_user.first_name,
                "last_name": db_user.last_name,
                "email": db_user.email
            },
            "room_data":room_data
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error.") 

@router.get("/getuserdata")
def getUserData(target_uuid: str = "",target_email: str = "", current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        """
    GET /api/auth/getuserdata?target_uuid=abc-123
    or
    GET /api/auth/getuserdata?target_email=user@email.com
    """
        
        if target_uuid == "" and target_email == "":
            raise HTTPException(status_code=400, detail="Provide target_uuid or target_email")
    
        profile = None 

        if target_uuid != "":
            profile = db.query(UserProfile).filter(UserProfile.unique_user_id == target_uuid).first()
        elif target_email != "":
            profile = db.query(UserProfile).filter(UserProfile.email == target_email).first()
    
        if not profile:
            raise HTTPException(status_code=404, detail="User not found")
    
        return {
    "unique_user_id" :profile.unique_user_id,
    "fname" : profile.first_name,
    "lname" : profile.last_name, 
    "bio" : profile.bio, 
    "city" : profile.cityAndState, 
    "email" : profile.email, 
    "phone_number" : profile.phone_number,
    "pfp_path" : profile.pfp_path, 
    "country" : profile.country, 
    "postalCode":profile.postalCode,
    "instagram_link":profile.instagram_link, 
    "facebook_link":profile.facebook_link, 
    "linkedin_link":profile.linkedin_link, 
    "twitter_link":profile.twitter_link,}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error.") 
    

'''
This function gets userid from url.
then, construct a new standard name for user profile.
next, write bytes using with() function because its a file.
after saving name. we need a web url, to save to user's existing db.
then, update using db.query. 
'''
@router.post("/updateUserpfp/{user_id}")
def updateUserpfp(user_id:str, file:UploadFile = File(...), current_user: dict = Depends(get_current_user), db:Session = Depends(get_db)):

    if not user_id:
        print("User id not found",user_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User id not found.") 

        #Only owner can update their pfp.
    if user_id != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own profile picture.")
    

    #First delete old one. But preserve default jpg.
    defaultjpg = "/images/user/default.jpg"
    
    user_profile = db.query(UserProfile).filter(UserProfile.unique_user_id == user_id).first()
    if not user_profile:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User id not found.")
    
    old_pfp_path = user_profile.pfp_path
    old_filename = old_pfp_path.split("/")[-1] if old_pfp_path and old_pfp_path != defaultjpg else None
    
    # Delete old image file if it exists and is not default
    if old_filename and old_filename != "default.jpg":
        old_filelocation = os.path.join(UPLOAD_DIRECTORY, old_filename)
        if os.path.exists(old_filelocation):
            try:
                os.remove(old_filelocation)
                print(f"Old image deleted: {old_filename}")
            except Exception as e:
                print(f"Could not delete old image: {e}")

    #now create unique file name. to preserve file, extract its extension
    #Then create filename
    #next, get filelocation to save.

    extension = str(file.filename).split(".")[-1]

    allowed_extensions = {"jpg", "jpeg", "png", "webp", "gif"}
    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type .{extension} not allowed. Use jpg, png, webp, or gif."
        )
    newfilename = str("UserProfile"+user_id+datetime.now().strftime("%Y%m%d%H%M%S"))+"."+extension    
    filelocation = os.path.join(UPLOAD_DIRECTORY,newfilename)

    try:
        with open(filelocation,"wb") as writer:
            shutil.copyfileobj(file.file,writer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    finally:
        file.file.close()

    #Next, create web url:
    web_path = f"/images/user/{newfilename}"

    #Next, edit using:
    user_profile.pfp_path = web_path
    db.commit()
    db.refresh(user_profile)

    return {
        "message": "Profile picture updated successfully.",
        "pfp_path": web_path
    }

@router.post("/updateExistingProfile/")
def updateExistingProfile(
    bio: str = Form(None),
    city: str = Form(None),
    phone_number: str = Form(None),
    country: str = Form(None),
    postalCode: str = Form(None),
    instagram_link: str = Form(None),
    facebook_link: str = Form(None),
    twitter_link: str = Form(None),
    linkedin_link: str = Form(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]
    
    # Fetch the user profile
    user_profile = db.query(UserProfile).filter(UserProfile.unique_user_id == user_id).first()
    if not user_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")
    
    # Update fields if provided
    if bio is not None:
        user_profile.bio = bio
    if city is not None:
        user_profile.cityAndState = city
    if phone_number is not None:
        user_profile.phone_number = phone_number
    if country is not None:
        user_profile.country = country
    if postalCode is not None:
        user_profile.postalCode = postalCode
    if instagram_link is not None:
        user_profile.instagram_link = instagram_link
    if facebook_link is not None:
        user_profile.facebook_link = facebook_link
    if twitter_link is not None:
        user_profile.twitter_link = twitter_link
    if linkedin_link is not None:
        user_profile.linkedin_link = linkedin_link
    
    db.commit()
    db.refresh(user_profile)
    
    return {
        "message": "Profile updated successfully.",
        "updated_fields": {
            "bio": user_profile.bio,
            "city": user_profile.cityAndState,
            "phone_number": user_profile.phone_number,
            "country": user_profile.country,
            "postalCode": user_profile.postalCode,
            "instagram_link": user_profile.instagram_link,
            "facebook_link": user_profile.facebook_link,
            "twitter_link": user_profile.twitter_link,
            "linkedin_link": user_profile.linkedin_link,
        }
    }
    