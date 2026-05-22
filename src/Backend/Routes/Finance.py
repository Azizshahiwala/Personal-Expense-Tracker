from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request,Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
import re, os, shutil, uuid,random,string
from datetime import datetime, timedelta
from jose import JWTError, jwt

from Models.Database import Group,GroupMember,Credentials,UserProfile, get_db
from Routes.Authentication import get_current_user

router = APIRouter(prefix="/api/finance", tags=["Finance"])

router.get("/financeHistory")
def getFinanceHistory(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    pass