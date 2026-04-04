import os
import time
import logging
from typing import List, Dict, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from supabase import create_client, Client
from pydantic import BaseModel
from email.mime.text import MIMEText
import base64

logger = logging.getLogger(__name__)

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
        """Persist refreshed Google credentials back to users.oauth_tokens.google.

        Uses a read-merge-write pattern to avoid overwriting other provider
        tokens (e.g. Spotify) stored in the same oauth_tokens JSONB column.
        """
        if not self.supabase:
            return
        expiry_iso = creds.expiry.isoformat() if creds.expiry else None

        # Fetch current oauth_tokens to preserve other provider keys
        row = self.supabase.table("users") \
            .select("oauth_tokens") \
            .eq("id", user_id).single().execute()
        current_tokens = row.data.get("oauth_tokens") or {}

        current_tokens["google"] = {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_expiry": expiry_iso,
            "scopes": list(creds.scopes) if creds.scopes else [],
        }
        self.supabase.table("users").update({
            "oauth_tokens": current_tokens
        }).eq("id", user_id).execute()

    async def fetch_inbox(self, user_id: str) -> List[Dict]:
        """Fetch emails from Gmail but strictly filter via Supabase whitelist and applied company names."""
        if os.environ.get("MOCK_GMAIL") == "true":
            return [
                {
                    "id": "mock_msg_1",
                    "thread_id": "mock_thread_1",
                    "from": "approved@example.com",
                    "subject": "Mock Hello",
                    "snippet": "This is a mock email for testing.",
                    "date": "1710435600000",
                    "source": "whitelist",
                }
            ]

        try:
            creds = await self.get_user_gmail_credentials(user_id)
            service = build('gmail', 'v1', credentials=creds)

            # Fetch whitelist and applied company names
            whitelist = await self.get_whitelisted_emails(user_id)
            company_names = await self._get_applied_company_names(user_id)

            # Build Gmail query targeting whitelisted senders directly
            if whitelist:
                from_parts = " OR ".join([f"from:{email}" for email in whitelist])
                gmail_query = f"in:inbox ({from_parts})"
            else:
                gmail_query = "in:inbox"

            results = service.users().messages().list(userId='me', q=gmail_query, maxResults=50).execute()
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

                # Extract clean email - lowercase for case-insensitive comparison
                clean_sender = sender.split("<")[-1].split(">")[0].strip().lower()

                if clean_sender in whitelist:
                    filtered_emails.append({
                        "id": full_msg['id'],
                        "thread_id": full_msg['threadId'],
                        "from": sender,
                        "subject": subject,
                        "snippet": full_msg['snippet'],
                        "date": full_msg.get('internalDate'),
                        "source": "whitelist",
                    })
                elif self._matches_company(clean_sender, company_names):
                    filtered_emails.append({
                        "id": full_msg['id'],
                        "thread_id": full_msg['threadId'],
                        "from": sender,
                        "subject": subject,
                        "snippet": full_msg['snippet'],
                        "date": full_msg.get('internalDate'),
                        "source": "job_filter",
                    })

            return filtered_emails
        except Exception as e:
            # Surface token failures clearly — 401 usually means stale/revoked credentials
            err_str = str(e)
            if "401" in err_str or "unauthorized" in err_str.lower() or "invalid_grant" in err_str.lower():
                logger.warning(
                    "[EmailService] Gmail API returned 401 for user %s — token likely expired or revoked: %s",
                    user_id,
                    err_str,
                )
            else:
                logger.error("[EmailService] Error fetching Gmail for user %s: %s", user_id, err_str)
            return []

    async def get_contacts(self, user_id: str, query: str) -> List[Dict]:
        """Return Google contacts matching query, using a 24-hour cache in users.settings."""
        if not self.supabase:
            return []

        row = self.supabase.table("users") \
            .select("settings") \
            .eq("id", user_id).single().execute()
        settings = row.data.get("settings") or {}
        cache = settings.get("contacts_cache", {})
        cached_at = cache.get("fetched_at", 0)

        # Refresh if: empty, older than 24h, or suspiciously small (cached when API was broken)
        if not cache.get("items") or (time.time() - cached_at) > 86400 or len(cache.get("items", [])) < 10:
            cache = await self._refresh_contacts_cache(user_id, settings)

        contacts = cache.get("items", [])
        if not query:
            return contacts[:20]

        q_lower = query.lower()
        return [
            c for c in contacts
            if q_lower in c.get("name", "").lower()
            or q_lower in c.get("email", "").lower()
        ][:10]

    async def _refresh_contacts_cache(self, user_id: str, settings: dict) -> dict:
        """Fetch Google contacts (saved + other contacts) via People API."""
        try:
            creds = await self.get_user_gmail_credentials(user_id)
            service = build("people", "v1", credentials=creds)

            items = []

            # Saved contacts
            try:
                results = service.people().connections().list(
                    resourceName="people/me",
                    pageSize=1000,
                    personFields="names,emailAddresses",
                ).execute()
                for person in results.get("connections", []):
                    names = person.get("names", [])
                    emails = person.get("emailAddresses", [])
                    if emails:
                        name = names[0].get("displayName", "") if names else ""
                        for e in emails:
                            items.append({"name": name, "email": e.get("value", "")})
            except Exception:
                pass

            # Other contacts (auto-saved from Gmail history)
            try:
                other = service.otherContacts().list(
                    pageSize=1000,
                    readMask="names,emailAddresses",
                ).execute()
                for person in other.get("otherContacts", []):
                    names = person.get("names", [])
                    emails = person.get("emailAddresses", [])
                    if emails:
                        name = names[0].get("displayName", "") if names else ""
                        for e in emails:
                            entry = {"name": name, "email": e.get("value", "")}
                            if entry not in items:
                                items.append(entry)
            except Exception:
                pass

            new_cache = {"items": items, "fetched_at": time.time()}
            self.supabase.table("users") \
                .update({"settings": {**settings, "contacts_cache": new_cache}}) \
                .eq("id", user_id).execute()
            return new_cache
        except Exception as e:
            print(f"[ContactsCache] Refresh failed: {e}")
            return {"items": [], "fetched_at": 0}

    async def _get_applied_company_names(self, user_id: str) -> List[str]:
        """Return deduplicated lowercase company names for all of the user's applications."""
        if not self.supabase:
            return []
        try:
            result = self.supabase.table("applications") \
                .select("inbox_items(company_name)") \
                .eq("user_id", user_id) \
                .execute()
            names = set()
            for row in result.data or []:
                item = row.get("inbox_items") or {}
                name = item.get("company_name")
                if name:
                    names.add(name.lower())
            return list(names)
        except Exception as e:
            print(f"[JobFilter] Failed to fetch applied company names: {e}")
            return []

    def _matches_company(self, sender_email: str, company_names: List[str]) -> bool:
        """Return True if any applied company name is a substring of the sender's domain."""
        if not company_names:
            return False
        domain = sender_email.split("@")[-1].lower()
        return any(company in domain for company in company_names)

    async def fetch_email_body(self, user_id: str, message_id: str) -> Dict:
        """Fetch full email body (HTML preferred) with inline images as base64 data URIs."""
        try:
            creds = await self.get_user_gmail_credentials(user_id)
            service = build('gmail', 'v1', credentials=creds)
            msg = service.users().messages().get(userId='me', id=message_id, format='full').execute()

            html_body = None
            plain_body = None
            attachments = []

            def extract_parts(payload):
                nonlocal html_body, plain_body
                mime = payload.get('mimeType', '')
                body_data = payload.get('body', {})
                parts = payload.get('parts', [])

                if mime == 'text/html' and body_data.get('data'):
                    html_body = base64.urlsafe_b64decode(body_data['data'] + '==').decode('utf-8', errors='replace')
                elif mime == 'text/plain' and body_data.get('data'):
                    plain_body = base64.urlsafe_b64decode(body_data['data'] + '==').decode('utf-8', errors='replace')
                elif mime.startswith('image/') and body_data.get('attachmentId'):
                    # Inline image - fetch and convert to data URI
                    try:
                        att = service.users().messages().attachments().get(
                            userId='me', messageId=message_id, id=body_data['attachmentId']
                        ).execute()
                        img_data = att.get('data', '')
                        headers = {h['name']: h['value'] for h in payload.get('headers', [])}
                        content_id = headers.get('Content-ID', '').strip('<>')
                        attachments.append({
                            'content_id': content_id,
                            'mime_type': mime,
                            'data': img_data,
                            'filename': headers.get('Content-Disposition', '').split('filename=')[-1].strip('"') or f'image.{mime.split("/")[-1]}',
                        })
                    except Exception:
                        pass
                elif mime not in ('text/html', 'text/plain', 'multipart/alternative', 'multipart/mixed', 'multipart/related') and body_data.get('attachmentId'):
                    headers = {h['name']: h['value'] for h in payload.get('headers', [])}
                    attachments.append({
                        'content_id': None,
                        'mime_type': mime,
                        'data': None,
                        'filename': headers.get('Content-Disposition', '').split('filename=')[-1].strip('"') or 'attachment',
                    })

                for part in parts:
                    extract_parts(part)

            extract_parts(msg['payload'])

            # Replace cid: references in HTML with inline base64 data URIs
            if html_body:
                for att in attachments:
                    if att.get('content_id') and att.get('data'):
                        data_uri = f"data:{att['mime_type']};base64,{att['data']}"
                        html_body = html_body.replace(f"cid:{att['content_id']}", data_uri)

            return {
                'body': plain_body or '',
                'html': html_body,
                'attachments': [a for a in attachments if not a.get('content_id')],
            }
        except Exception as e:
            print(f"[EmailBody] Failed to fetch body for {message_id}: {e}")
            return {'body': '', 'html': None, 'attachments': []}

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
