import os
import firebase_admin
from firebase_admin import credentials, firestore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

cred = credentials.Certificate(os.path.join(BASE_DIR, "fbACC.json"))
firebase_admin.initialize_app(cred)
db = firestore.client()

SKIP_DOCS = {"proposedAthleteStructure"}


def delete_subcollections(doc_ref):
    for subcol in doc_ref.collections():
        for sub_doc in subcol.stream():
            delete_subcollections(sub_doc.reference)
            sub_doc.reference.delete()
            print(f"    Deleted subcollection doc: {subcol.id}/{sub_doc.id}")


def cleanup():
    athletes_ref = db.collection("athletes")
    docs = list(athletes_ref.stream())
    print(f"Found {len(docs)} document(s) in athletes collection")

    deleted = 0
    skipped = 0
    for doc in docs:
        if doc.id in SKIP_DOCS:
            print(f"[SKIP] {doc.id}")
            skipped += 1
            continue

        delete_subcollections(doc.reference)
        doc.reference.delete()
        print(f"[DEL]  {doc.id}")
        deleted += 1

    print(f"\nDone. Deleted {deleted}, skipped {skipped}.")


if __name__ == "__main__":
    cleanup()
