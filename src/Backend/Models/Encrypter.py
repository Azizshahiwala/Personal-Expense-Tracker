import bcrypt
#bcrypt is used to hash a password. This library adds a salt
#(a pseudorandom string ) at the end of password hash.
#At last, on entering pass, we compare the password again with stored hash.

class PasswordEncrypter:
     
    def create_hash(self,password: str):

        #Create a psuedo random string.
        salt = bcrypt.gensalt()

        #Convert password to array of bytes
        bytePass = password.encode('utf-8')

        #Create hash
        hash = bcrypt.hashpw(bytePass,salt)

        #return this hash in string 
        return hash.decode('utf-8')     
    
    def verify_hash(self,password: str, stored_hash):
        #Convert password to array of bytes
        bytePass = password.encode('utf-8')

        if isinstance(stored_hash, str):
            stored_hash = stored_hash.encode('utf-8')
            
        #Check using byte password against hash
        result = bcrypt.checkpw(bytePass,stored_hash)

        #Return True / False (result)
        return result
    
encrypter = PasswordEncrypter()
