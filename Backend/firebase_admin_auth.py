# # backend/firebase_admin_auth.py
# import firebase_admin
# from firebase_admin import auth as admin_auth, credentials
# import os

# cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
# if not firebase_admin._apps:
#     cred = credentials.Certificate(cred_path)
#     firebase_admin.initialize_app(cred)

# def verify_firebase_token(id_token):
#     try:
#         decoded = admin_auth.verify_id_token(id_token)
#         print("✅ Firebase token verified for UID:", decoded.get("uid"))
#         return decoded
#     except Exception as e:
#         import traceback
#         print("❌ Token verification error:", e)
#         traceback.print_exc()
#         return None

# firebase_admin_auth.py
import firebase_admin
from firebase_admin import credentials, auth

# Initialize Firebase Admin SDK once
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")  # your service account JSON
    firebase_admin.initialize_app(cred)

def verify_firebase_token(id_token: str):
    """
    Verifies a Firebase ID token and returns decoded token dict.
    Returns None if invalid or expired.
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print("Firebase token verification failed:", e)
        return None
