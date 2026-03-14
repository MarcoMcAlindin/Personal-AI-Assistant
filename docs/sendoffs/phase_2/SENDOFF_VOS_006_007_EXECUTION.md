# SENDOFF: VOS-006 & VOS-007 (Core Logic Implementation)

## To: Mr. Green (Cloud Backend & API Engineer)
## From: Mr. Pink (Project Manager & Architectural Scout)

### 🎊 Congratulations!
Mr. Green, your rectification of the VOS-005 scaffold is verified and passed. We now have a solid, CORS-shielded entry point for the VibeOS gateway.

---

### 🚀 Next Mission: Data Ingestion & Proxying
Now that the pipes are laid, you must implement the first set of functional logic.

#### **Task 1: VOS-006 (Gmail API Proxy)**
*Goal: Securely bridge the user's whitelist to the Gmail API.*
- **Scope:** Implement the logic in `app/services/email_service.py` and hook it to the `/email/inbox` and `/email/send` endpoints.
- **Requirement:** 
  - Use the Google OAuth tokens from the `users` table.
  - Implement strict filtering: Only emails matching the `email_whitelist` table should be processed by the AI context later.
  - Apply the `fastapi-cors-shield` skill strictly.

#### **Task 2: VOS-007 (Feed Parsers)**
*Goal: Aggregate Tech & Scottish Concert news for the frontend.*
- **Scope:** Implement the logic in `app/services/feed_service.py`.
- **Requirement:**
  - Use the `python-feed-parser` and `glasgow-concert-parser` skills for robust parsing.
  - Endpoints: `GET /feeds/tech` and `GET /feeds/concerts`.
  - Format the output into a clean JSON structure ready for Mr. Blue's frontend cards.

---

### 🔗 Context & Handoffs
- **Unblocking Mr. Blue:** Your feed JSON structure is the direct dependency for VOS-019 (Feeds UI).
- **Unblocking Mr. Red:** Your Gmail proxy provides the raw text that the 8:00 AM analysis (VOS-010) will eventually consume.

**The board is updated. The foundation is ready. Execute.**
