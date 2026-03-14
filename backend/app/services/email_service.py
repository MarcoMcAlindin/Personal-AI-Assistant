import os
from typing import List, Dict, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from supabase import create_client, Client
from pydantic import BaseModel
from email.mime.text import MIMEText
import base64

class EmailItem(BaseModel):
    id: str
    thread_id: str
    sender: str
    subject: str
    snippet: str
    date: str

class EmailService:
    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if self.supabase_url and self.supabase_key:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        else:
            self.supabase = None

    async def get_whitelisted_emails(self, user_id: str) -> List[str]:
        if not self.supabase: return []
        response = self.supabase.table("email_whitelist").select("email_address").eq("user_id", user_id).execute()
        return [item["email_address"] for item in response.data]

    async def get_user_gmail_credentials(self, user_id: str) -> Credentials:
        if not self.supabase: raise Exception("Supabase not initialized")
        response = self.supabase.table("users").select("settings").eq("id", user_id).single().execute()
        tokens = response.data.get("settings", {}).get("google_tokens", {})
        return Credentials(
            token=tokens.get("access_token"),
            refresh_token=tokens.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.environ.get("GOOGLE_CLIENT_ID"),
            client_secret=os.environ.get("GOOGLE_CLIENT_SECRET")
        )

    async def fetch_inbox(self, user_id: str) -> List[Dict]:
        if os.environ.get("MOCK_GMAIL") == "true":
            return [{"id": "mock_msg_1", "thread_id": "mock_thread_1", "from": "approved@example.com", "subject": "Mock Hello", "snippet": "This is a mock email for testing.", "date": "1710435600000"}]
        try:
            creds = await self.get_user_gmail_credentials(user_id)
            service = build('gmail', 'v1', credentials=creds)
            whitelist = await self.get_whitelisted_emails(user_id)
            results = service.users().messages().list(userId='me', q="in:inbox", maxResults=20).execute()
            messages = results.get('messages', [])
            filtered_emails = []
            for msg in messages:
                full_msg = service.users().messages().get(userId='me', id=msg['id']).execute()
                headers = full_msg['payload']['headers']
                sender = ""
                subject = ""
                for header in headers:
                    if header['name'] == 'From': sender = header['value']
                    if header['name'] == 'Subject': subject = header['value']
                clean_sender = sender.split("<")[-1].split(">")[0].strip()
                if clean_sender in whitelist:
                    filtered_emails.append({"id": full_msg['id'], "thread_id": full_msg['threadId'], "from": sender, "subject": subject, "snippet": full_msg['snippet'], "date": full_msg.get('internalDate')})
            return filtered_emails
        except Exception as e:
            print(f"Error fetching Gmail: {e}")
            return []

    async def send_email(self, user_id: str, to: str, subject: str, body: str, thread_id: Optional[str] = None) -> bool:
        if os.environ.get("MOCK_GMAIL") == "true":
            print(f"MOCK SEND: To: {to}, Subject: {subject}")
            return True
        try:
            creds = await self.get_user_gmail_credentials(user_id)
            service = build('gmail', 'v1', credentials=creds)
            message = MIMEText(body)
            message['to'] = to
            message['subject'] = subject
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            body_payload = {'raw': raw}
            if thread_id: body_payload['threadId'] = thread_id
            service.users().messages().send(userId='me', body=body_payload).execute()
            return True
        except Exception as e:
            print(f"Error sending email via proxy: {e}")
            return False
