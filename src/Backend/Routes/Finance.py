from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/finance", tags=["Finance"])