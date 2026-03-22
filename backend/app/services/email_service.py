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
        # Supabase client setup (assuming env vars exist)
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if self.supabase_url and self.supabase_key:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        else:
            self.supabase = None

    async def get_whitelisted_emails(self, user_id: str) -> List[str]:
        """Fetch whitelisted email addresses for a specific user from Supabase."""
        if not self.supabase:
            return []
        response = self.supabase.table("email_whitelist").select("email_address").eq("user_id", user_id).execute()
        return [item["email_address"] for item in response.data]

    async def get_whitelist_entries(self, user_id: str) -> List[Dict]:
        """Fetch full whitelist entries (id, email, contact_name) for a user."""
        if not self.supabase:
            return []
        response = self.supabase.table("email_whitelist") \
            .select("id, email_address, contact_name") \
            .eq("user_id", user_id) \
            .order("contact_name", desc=False) \
            .execute()
        return response.data

    async def add_to_whitelist(self, user_id: str, email_address: str, contact_name: str = None) -> dict:
        """Add an email to the user's whitelist. Returns the created entry."""
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        normalized = email_address.lower().strip()
        existing = self.supabase.table("email_whitelist") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("email_address", normalized) \
            .execute()

        if existing.data:
            return {"error": "Email already whitelisted", "id": existing.data[0]["id"]}

        result = self.supabase.table("email_whitelist") \
            .insert({
                "user_id": user_id,
                "email_address": normalized,
                "contact_name": contact_name or normalized.split("@")[0],
            }) \
            .execute()

        return {"added": True, "entry": result.data[0] if result.data else None}

    async def remove_from_whitelist(self, user_id: str, entry_id: str) -> dict:
        """Remove an entry from the user's whitelist by ID."""
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        result = self.supabase.table("email_whitelist") \
            .delete() \
            .eq("id", entry_id) \
            .eq("user_id", user_id) \
            .execute()

        if not result.data:
            return {"error": "Whitelist entry not found"}
        return {"removed": True, "id": entry_id}

    async def get_user_gmail_credentials(self, user_id: str) -> Credentials:
        """Fetch OAuth credentials for the user from users.oauth_tokens JSONB."""
        if not self.supabase:
            raise Exception("Supabase not initialized")

        from google.auth.transport.requests import Request

        row = self.supabase.table("users") \
            .select("oauth_tokens") \
            .eq("id", user_id).single().execute()
        tokens = (row.data.get("oauth_tokens") or {}).get("google", {})

        if not tokens.get("refresh_token"):
            raise Exception("Google not connected for this user")

        creds = Credentials(
            token=tokens.get("access_token"),
            refresh_token=tokens.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.environ.get("GMAIL_CLIENT_ID"),
            client_secret=os.environ.get("GMAIL_CLIENT_SECRET"),
            scopes=tokens.get("scopes"),
        )

        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            self._save_google_tokens(user_id, creds)

        return creds

    def _save_google_tokens(self, user_id: str, creds: Credentials) -> None:
        """Persist refreshed Google credentials back to users.oauth_tokens."""
        if not self.supabase:
            return
        expiry_iso = creds.expiry.isoformat() if creds.expiry else None
        self.supabase.table("users").update({
            "oauth_tokens": {
                "google": {
                    "access_token": creds.token,
                    "refresh_token": creds.refresh_token,
                    "token_expiry": expiry_iso,
                    "scopes": list(creds.scopes) if creds.scopes else [],
                }
            }
        }).eq("id", user_id).execute()

    async def fetch_inbox(self, user_id: str) -> List[Dict]:
        """Fetch emails from Gmail but strictly filter via Supabase whitelist."""
        if os.environ.get("MOCK_GMAIL") == "true":
            return [
                {
                    "id": "mock_msg_1",
                    "thread_id": "mock_thread_1",
                    "from": "approved@example.com",
                    "subject": "Mock Hello",
                    "snippet": "This is a mock email for testing.",
                    "date": "1710435600000"
                }
            ]
        
        try:
            creds = await self.get_user_gmail_credentials(user_id)
            service = build('gmail', 'v1', credentials=creds)
            
            # Fetch whitelist
            whitelist = await self.get_whitelisted_emails(user_id)
            
            # Fetch messages (limited to 20 for proxy)
            results = service.users().messages().list(userId='me', q="in:inbox", maxResults=20).execute()
            messages = results.get('messages', [])
            
            filtered_emails = []
            for msg in messages:
                full_msg = service.users().messages().get(userId='me', id=msg['id']).execute()
                headers = full_msg['payload']['headers']
                
                sender = ""
                subject = ""
                for header in headers:
                    if header['name'] == 'From':
                        sender = header['value']
                    if header['name'] == 'Subject':
                        subject = header['value']
                
                # Extract clean email from sender string "Name <email@addr.com>"
                clean_sender = sender.split("<")[-1].split(">")[0].strip()
                
                if clean_sender in whitelist:
                    filtered_emails.append({
                        "id": full_msg['id'],
                        "thread_id": full_msg['threadId'],
                        "from": sender,
                        "subject": subject,
                        "snippet": full_msg['snippet'],
                        "date": full_msg.get('internalDate')
                    })
            
            return filtered_emails
        except Exception as e:
            # Rule 11: Error Handling for external APIs
            print(f"Error fetching Gmail: {e}")
            return []

    async def send_email(self, user_id: str, to: str, subject: str, body: str, thread_id: Optional[str] = None) -> bool:
        """Proxy email sending to Gmail API."""
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
            if thread_id:
                body_payload['threadId'] = thread_id

            service.users().messages().send(userId='me', body=body_payload).execute()
            return True
        except Exception as e:
            print(f"Error sending email via proxy: {e}")
            return False
