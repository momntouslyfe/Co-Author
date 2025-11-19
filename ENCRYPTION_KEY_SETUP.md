# ENCRYPTION_KEY Setup and Management

## CRITICAL SECURITY INFORMATION

### What is ENCRYPTION_KEY?
The `ENCRYPTION_KEY` is a 64-character hexadecimal string (32 bytes) used to encrypt user API keys before storing them in the database. This ensures that even if someone gains access to the database, they cannot read the API keys without the encryption key.

### Current ENCRYPTION_KEY
Your encryption key is stored as a **Replit Secret** (environment variable), not in the database.

**Generated on:** November 19, 2025
**Key:** `2b6942bb65e86c8465e2ae134694e74c285eccfe90cafd992b3e94f656d38d11`

### ⚠️ IMPORTANT: DO NOT CHANGE THIS KEY

**Once set, the ENCRYPTION_KEY must remain the same forever.** Here's why:

1. **Already Encrypted Data**: User API keys are encrypted with this specific key
2. **Cannot Decrypt**: Changing the key makes old data unreadable
3. **Users Lose Access**: Users would have to re-enter all their API keys
4. **No Recovery**: There's no way to recover the old keys if you change the encryption key

### Why NOT Store in Database? (SECURITY)

**NEVER store the ENCRYPTION_KEY in the database.** This is a critical security vulnerability:

❌ **Bad Security:**
```
Database:
- User API Keys (encrypted) ✓
- ENCRYPTION_KEY ✗
= Anyone with database access can decrypt everything!
```

✅ **Good Security:**
```
Database:
- User API Keys (encrypted) ✓

Environment Variables (Server Only):
- ENCRYPTION_KEY ✓
= Only your server can decrypt the keys
```

### How It Works

1. **User enters API key** → Frontend sends to server
2. **Server encrypts key** → Using ENCRYPTION_KEY from environment
3. **Encrypted key saved** → Stored in Firestore database
4. **User uses AI feature** → Server retrieves encrypted key
5. **Server decrypts key** → Using same ENCRYPTION_KEY
6. **AI request made** → With user's actual API key

### If You Need to Change the Key (Emergency Only)

If you absolutely must change the ENCRYPTION_KEY:

1. **Notify all users** that they need to re-enter their API keys
2. **Clear all encrypted data**:
   ```javascript
   // Delete all userApiKeys documents
   const batch = db.batch();
   const snapshot = await db.collection('userApiKeys').get();
   snapshot.docs.forEach(doc => batch.delete(doc.ref));
   await batch.commit();
   ```
3. **Update ENCRYPTION_KEY** in Replit Secrets
4. **Restart the application**
5. **Users re-enter keys** in Settings

### Backup This Key

Store this key in a **secure password manager** or **encrypted vault**. Do not:
- ❌ Store in plain text files
- ❌ Store in the database
- ❌ Share in email or chat
- ❌ Commit to git repositories
- ❌ Store in client-side code

### Verification

To verify the key is working:
```bash
# Check if the environment variable is set
echo $ENCRYPTION_KEY
# Should output: 2b6942bb65e86c8465e2ae134694e74c285eccfe90cafd992b3e94f656d38d11
```

### Support

If users report "API key could not be decrypted" errors:
1. Check that ENCRYPTION_KEY hasn't changed
2. If it has changed, users must re-enter their API keys
3. This is the correct behavior - it protects security
4. Do NOT try to "fix" this by storing the key in the database
