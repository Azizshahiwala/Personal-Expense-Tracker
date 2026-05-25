from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request,Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
import re, os, shutil, uuid,random,string
from datetime import datetime, timedelta
from jose import JWTError, jwt
from uuid import uuid4,UUID
from Models.Database import Group,GroupMember,Credentials,UserProfile,Expenses,ChatMessages, get_db
from Routes.Authentication import get_current_user

router = APIRouter(prefix="/api/finance", tags=["Finance"])

class ExpenseEntry(BaseModel):
    itemName: str
    total: float
    unit: str
    splitMode: str
    isSplit: bool
    contributors: list | dict
    paidBy: str
    timestamp: datetime
    removed: bool

class updateBudget(BaseModel):
    budget : float
@router.get("/groupHistory/{group_id}")
def getGroupHistory(group_id: str,current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):

    try:
        results = []
        
        this_id = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user['user_id']).first()
        
        if not group_id or not this_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid operation. Please join a group.")
           
        #I want to join Credentials Chatmessages amd Expenses
        rows = db.query(Expenses,Credentials,ChatMessages).join(Credentials, Expenses.user_id == Credentials.unique_user_id).join(ChatMessages, Expenses.chat_msg_id == ChatMessages.id).filter(Expenses.group_id == group_id).order_by(ChatMessages.timestamp.asc()).all()
                
        for exp, cred, chat in rows:
            results.append({
        "table_id":       exp.id,
        "user_id":        str(exp.user_id),
        "expense_id":     str(exp.expense_id),
        "chat_msg_id":    exp.chat_msg_id,
        "group_id":       exp.group_id,
        "sender_name":    f"{cred.first_name} {cred.last_name}",
        "individual_amt": exp.individual_amt,
        "amtspent":       chat.amtspent,        
        "item_name":      exp.item_name,
        "unit":           exp.unit,
        "can_split_equal":exp.can_split_equal,
        "message":        chat.message,       
        "timestamp":      chat.timestamp.isoformat(),
        "amtrecovered": float(chat.amtrecovered),})

        print("History:",results)
        return {"history":results}
    except HTTPException as e:
        print("getGroupHistory",e)
        raise

@router.get("/personalHistory/{target_uuid}")
def getPersonalHistory(target_uuid:str,current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):

    try:

        member = db.query(GroupMember).filter(GroupMember.user_id == current_user["user_id"]).first()
        if not member:
            raise HTTPException(status_code=404, detail="User not in a group")

        results = []
        
        if target_uuid != current_user['user_id']:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid operation. User not found")
        
        #First check if user's budget is > 100.

        budget = db.query(GroupMember).filter(GroupMember.user_id == current_user['user_id']).first()
        
        if budget:
            budget_val = budget.member_budget or 0.0
            budget.has_set_budget = budget_val > 100
            db.commit()

        rows = (
        db.query(Expenses, Credentials, ChatMessages)
        .join(Credentials, Expenses.user_id == Credentials.unique_user_id)
        .join(ChatMessages, Expenses.chat_msg_id == ChatMessages.id)
        .filter(
            Expenses.group_id == member.group_id,
            Expenses.user_id == current_user["user_id"]  
        )
        .order_by(ChatMessages.timestamp.desc())
        .all())

        for exp, cred, chat in rows:

            results.append({
        "table_id":       exp.id,
        "user_id":        str(exp.user_id),
        "expense_id":     str(exp.expense_id),
        "chat_msg_id":    exp.chat_msg_id,
        "group_id":       exp.group_id,
        "sender_name":    f"{cred.first_name} {cred.last_name}",
        "individual_amt": exp.individual_amt,
        "amtspent":       chat.amtspent,        
        "paid_by": f"{cred.first_name} {cred.last_name}",
        "item_name":      exp.item_name,
        "unit":           exp.unit,
        "can_split_equal":exp.can_split_equal,
        "message":        chat.message,       
        "timestamp":      chat.timestamp.isoformat(),
        "amtrecovered": chat.amtrecovered,})
        
        print("--------------")
        print("Data found: ",results)
        return {"history":results,
                "has_set_budget": budget.has_set_budget,
                "member_budget": (budget.member_budget or 0.0)}
    except HTTPException as e:
        print("getPersonalHistory",e)
        raise

@router.post("/setEntry")
def setEntry(expEntry: ExpenseEntry, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    '''
    Data passed: 
    id='1779605557660' 
    itemName='asd' 
    total=123.0 
    unit='pcs' 
    splitMode='contributed' 
    isSplit=True 
    contributors=[{'userId': 'me', 'name': 'You', 'amount': '2'}] 
    paidBy='You' 
    timestamp=datetime.datetime(2026, 5, 24, 6, 52, 37, 660000, tzinfo=TzInfo(0)) 
    removed=False

    db columns:
    id = Column(Integer, primary_key=True, autoincrement=True)
    expense_id = Column(UUID(as_uuid=True),nullable=False,index=True,unique=True) #This id is used to group when user selects contributed purchase option. 
    user_id = Column(UUID(as_uuid=True), ForeignKey("Credentials.unique_user_id", ondelete="CASCADE"), nullable=False) #This is used to show, who this purchase belongs to
    group_id = Column(String(10), ForeignKey("Group.invitecode", ondelete="CASCADE"), nullable=False, index=True)
    chat_msg_id = Column(Integer, ForeignKey("Chatmessages.id", ondelete="CASCADE"), nullable=True)

    individual_amt = Column(Float,nullable=False,default=0.0)
    is_solo = Column(Boolean,nullable=False,default=True)
    can_split_equal = Column(Boolean,nullable=True,default=False)
    item_name = Column(String(255),nullable=False)
    unit = Column(String(20),nullable=False)

    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    '''
    try:
        #Check if user exists
        existing_user = db.query(GroupMember).filter(GroupMember.user_id == current_user['user_id']).first()

        if not existing_user: 
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid operation. User not in a group")
        
        #First get essentials:

        curr_group_id = db.query(GroupMember).filter(GroupMember.user_id == current_user['user_id']).first()
        username = db.query(Credentials).filter(Credentials.unique_user_id == current_user['user_id']).first()
        if not curr_group_id or not username:
            return
        new_expense_id = uuid4() 
        is_solo = True
        if str(expEntry.splitMode) == 'solo':
            is_solo = True
        else:
            is_solo = False 
        print("Is solo purchase:",is_solo)

        #Create ONE chat message (purchase) 
        purchase_msg = ChatMessages(group_id=curr_group_id.group_id,
                                    sender_id=current_user['user_id'],
                                    message=f"{username.first_name} {username.last_name} created a purchase.",
                                    msgtype="purchase",
                                    amtspent=None)
        
        #very first time amtspent will be null for now.
        db.add(purchase_msg)
        db.commit()
        db.refresh(purchase_msg)
        amtspent = 0
        batch=[]

        if is_solo:
            print(expEntry.contributors)
            contributor_uuid = current_user["user_id"] 
            contributor_name = username.first_name +" "+username.last_name 
                   
            batch.append(Expenses(
            expense_id=new_expense_id,
            user_id=contributor_uuid,    
            chat_msg_id=purchase_msg.id,
            contributor=contributor_name,
            group_id=curr_group_id.group_id,
            individual_amt=expEntry.total,  
            is_solo=True,
            can_split_equal=expEntry.isSplit,
            item_name=expEntry.itemName,
            unit=expEntry.unit,
            timestamp=expEntry.timestamp,))
                
            amtspent = expEntry.total
            
            #Now update the budget.
            curr_group_id.member_budget = (curr_group_id.member_budget or 0.0) - amtspent
            db.commit()
        else:
            for contributor in expEntry.contributors:
                contributor_uuid = current_user["user_id"] if contributor['userId'].lower() == "me" else UUID(contributor['userId'])
                contributor_name = username.first_name +" "+username.last_name if contributor['name'].lower() != 'you' else 'you'
                amtspent += float(contributor['amount'])
                batch.append(Expenses(
                        expense_id=new_expense_id,
                        user_id=contributor_uuid,
                        chat_msg_id=purchase_msg.id,
                        contributor=contributor_name,
                        group_id=curr_group_id.group_id,
                        individual_amt=contributor['amount'],
                        is_solo=False,
                        can_split_equal=expEntry.isSplit,
                        item_name=expEntry.itemName,
                        unit=expEntry.unit,
                        timestamp=expEntry.timestamp,))
                
            #Now update expense for each member
                
                user = db.query(GroupMember).filter(GroupMember.user_id == contributor_uuid).first()
                if user:
                    user.member_budget = (user.member_budget or 0.0)-contributor['amount']  
                
        db.add_all(batch)
        db.commit()
        
        #Now, i got my TOTAL amount spent.        
        purchase_msg.amtspent = amtspent
        
        db.commit()
        db.refresh(purchase_msg)

        print("Added entry!")
        return {"message":"Success"}
    except HTTPException as e:
        print("from /setEntry:",e)
        raise
    except Exception as e:
        print("from /setEntry:",e)
        raise

@router.delete("/delEntry/{expense_id}")
def delEntry(expense_id: str,current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        #Check if user exists
        existing_user = db.query(GroupMember).filter(GroupMember.user_id == current_user['user_id']).first()

        if not existing_user: 
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid operation. User not in a group")
        
        #First recover spent budget:

        this_expense = db.query(Expenses).filter(Expenses.expense_id == expense_id).all()
        recovered = 0.0
        original = None
        if bool(this_expense[0].is_solo):
            print("This purchase is solo.")
            #If this is solo, then recover normally
            recovered = this_expense[0].individual_amt

            #Now give back to the user
            original = db.query(GroupMember).filter(GroupMember.group_id == this_expense[0].group_id).first()
            if original:
                original.member_budget = recovered
            
        else:
            print("This purchase is contributed.")
            recovered = 0.0
            
            for record in this_expense:
                U_id = record.user_id
                amt = record.individual_amt
                #Re-add the lost amount

                recovered += amt
                original = db.query(GroupMember).filter(GroupMember.user_id == U_id).first()
                if original:
                    original.member_budget += amt  # ← each member gets their own amount back
                    db.commit()

                
                #I want to update the message which links to purchase of this id, Then update an amount.
                updateMsg = db.query(ChatMessages).filter(ChatMessages.id == this_expense[0].chat_msg_id).first()
                if updateMsg:
                    updateMsg.amtrecovered = recovered  # total recovered across all contributors
                    db.commit()
        
        db.commit()
        db.refresh(original)

        #At last, create a notification
        #Create ONE chat message (purchase) 

        curr_group_id = db.query(GroupMember).filter(GroupMember.user_id == current_user['user_id']).first()
        username = db.query(Credentials).filter(Credentials.unique_user_id == current_user['user_id']).first()

        if not curr_group_id or not username:
            return
        

        del_msg = ChatMessages(group_id=curr_group_id.group_id,
                                    sender_id=current_user['user_id'],
                                    message=f"{username.first_name} {username.last_name} removed a purchase. Recovered: {recovered}",
                                    msgtype="notification",
                                    amtspent=None,
                                    amtrecovered=None)
        db.add(del_msg)
        db.commit()
        db.refresh(del_msg)

        #Now delete
        db.query(Expenses).filter(Expenses.expense_id == expense_id).delete()
        db.commit()
    except HTTPException as e:
        print("from /delEntry:",e)
        raise
    except Exception as e:
        print("from /delEntry:",e)
        raise

@router.put("/updateBudget")
def setBudget(item: updateBudget,current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)): 
        try:
            #Check if user exists
            member = db.query(GroupMember).filter(GroupMember.user_id == current_user['user_id']).first()
            
            if not member: 
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid operation. User not in a group")

            
            if member:
                member.member_budget = float(item.budget) if item.budget is not None else 0.0
                member.has_set_budget = member.member_budget >= 100

            db.commit()
            
            print("Success: ",member.member_budget)
            return {"has_set_budget": member.has_set_budget, "member_budget": member.member_budget}
        except HTTPException as e:
            print("from /delEntry:",e)
            raise
        except Exception as e:
            print("from /delEntry:",e)
            raise 
        
