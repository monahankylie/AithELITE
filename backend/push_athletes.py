import firebase_admin
from firebase_admin import credentials, firestore, auth

cred = credentials.Certificate("fbACC.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

