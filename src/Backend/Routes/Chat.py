from fastapi import APIRouter, WebSocket, WebSocketDisconnect,Query, Depends, HTTPException, status, File, UploadFile, Request,Form
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
import traceback
#We import the database i am going to use, with a session function.
from Models.Database import Group,GroupMember,Credentials,UserProfile,ChatMessages, get_db
from Models.Socket import manager
from Routes.Authentication import get_current_user
from Config import Config 
router = APIRouter(prefix="/api/chat",tags=["Chat"])

@router.get("/history/{roomcode}")
def gethistory(roomcode : str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        user_in_group = db.query(GroupMember).filter(
            GroupMember.group_id == roomcode,
            GroupMember.user_id == current_user['user_id']
        ).first()

        if not user_in_group:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User does not exists in this group.")
        
        groupmember_messages = db.query(
            ChatMessages.id,
            ChatMessages.message,
            ChatMessages.timestamp,
            ChatMessages.sender_id,
            ChatMessages.msgtype,
            ChatMessages.amtsent,
            Credentials.first_name,
            Credentials.last_name,
            UserProfile.pfp_path).join(Credentials, ChatMessages.sender_id == Credentials.unique_user_id).join(UserProfile,ChatMessages.sender_id == UserProfile.unique_user_id).filter(ChatMessages.group_id == roomcode).order_by(ChatMessages.timestamp.asc()).all() 
        
        response = []

        for msg in groupmember_messages:
            response.append({
                "id":str(msg.id),
                "Sender_id":msg.sender_id,
                "Message":msg.message,
                "Timestamp":msg.timestamp,
                "Username":msg.first_name+" "+msg.last_name,
                "pfp_path":msg.pfp_path,
                "Msgtype":msg.msgtype,
                "Amtsent":msg.amtsent
            })

            
        print(response)
        return {"history":response}
    except HTTPException:
        raise 
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
@router.websocket("/ws/{groupcode}")
async def websocket_endpoint(websocket: WebSocket, groupcode: str, token: str = Query(...), db: Session = Depends(get_db)):
    
    try:
        jwt_config = Config.getJWTConfig()
        payload = jwt.decode(token, str(jwt_config['SECRET_KEY']), algorithms=[str(jwt_config['ALGORITHM'])])
        email = payload.get("sub")
        current_id = payload.get("unique_user_id")

        if email is None or current_id is None:
            await websocket.close(code=1008)  
            return
    except JWTError:
        await websocket.close(code=1008)    
        return
    
    
    try:
        await manager._connect(websocket, groupcode)
        while True:
            data = await websocket.receive_text()

            save = ChatMessages(group_id=groupcode, sender_id=current_id,
                                message=data, timestamp=datetime.now())
            db.add(save)
            db.commit()
            db.refresh(save)

            user = db.query(Credentials.first_name, Credentials.last_name).filter(
                Credentials.unique_user_id == current_id).first()
            username = f"{user.first_name} {user.last_name}" if user else "Unknown"

            await manager._broadcast(groupcode, {
                "id": str(save.id),
                "message": data,
                "sender_id": current_id,
                "Username": username,
                "timestamp": save.timestamp.strftime("%Y-%m-%dT%H:%M:%S")
            })

    except WebSocketDisconnect:
        manager._disconnect(websocket, groupcode)
        