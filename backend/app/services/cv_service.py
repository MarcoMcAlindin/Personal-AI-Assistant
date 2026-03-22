"""
CV service — upload, parse, embed, store, and retrieve CVs.

Flow:
  1. Receive file bytes + filename from the upload endpoint.
  2. Extract plain text (PyMuPDF for PDF, python-docx for DOCX, plain text fallback).
  3. Generate a single 1536-dim OpenAI embedding for the full text.
  4. Upsert into `cv_files` (mark as primary, demote previous primaries).
  5. At cover-letter time, fetch parsed_text from the latest primary CV.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ── Text extraction ───────────────────────────────────────────────────────────

def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from PDF, DOCX, or plain text file."""
    lower = filename.lower()

    if lower.endswith(".pdf"):
        return _extract_pdf(file_bytes)
    if lower.endswith(".docx"):
        return _extract_docx(file_bytes)
    if lower.endswith(".doc"):
        # .doc (old binary format) — try docx parser, may fail
        return _extract_docx(file_bytes)
    # Fallback: treat as UTF-8 text
    return file_bytes.decode("utf-8", errors="replace")


def _extract_pdf(data: bytes) -> str:
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=data, filetype="pdf")
        pages = [page.get_text() for page in doc]
        return "\n\n".join(pages).strip()
    except ImportError:
        logger.warning("PyMuPDF not installed — falling back to pdfminer")
        return _extract_pdf_pdfminer(data)
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return ""


def _extract_pdf_pdfminer(data: bytes) -> str:
    try:
        from pdfminer.high_level import extract_text_to_fp
        from pdfminer.layout import LAParams
        import io
        out = io.StringIO()
        extract_text_to_fp(io.BytesIO(data), out, laparams=LAParams())
        return out.getvalue().strip()
    except Exception as e:
        logger.error(f"pdfminer extraction failed: {e}")
        return ""


def _extract_docx(data: bytes) -> str:
    try:
        import docx
        import io
        doc = docx.Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()
    except ImportError:
        logger.warning("python-docx not installed — returning empty text for DOCX")
        return ""
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        return ""


# ── Embedding ─────────────────────────────────────────────────────────────────

async def embed_text(text: str) -> Optional[list[float]]:
    """Generate a 1536-dim OpenAI embedding for the given text (truncated to ~8000 tokens)."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set — skipping CV embedding")
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
        # Truncate to ~6000 chars to stay comfortably within token limits
        truncated = text[:24_000]
        resp = await client.embeddings.create(
            model="text-embedding-3-small",
            input=truncated,
        )
        return resp.data[0].embedding
    except Exception as e:
        logger.error(f"OpenAI embedding failed: {e}")
        return None


# ── Database operations ───────────────────────────────────────────────────────

def save_cv(
    supabase,
    user_id: str,
    filename: str,
    file_size_bytes: int,
    mime_type: str,
    parsed_text: str,
    embedding: Optional[list[float]],
) -> dict:
    """
    Insert a new CV record into cv_files.
    Demotes all existing CVs for this user (is_primary = false) then marks the new one primary.
    Returns the inserted row.
    """
    # Demote previous primaries
    try:
        supabase.table("cv_files") \
            .update({"is_primary": False}) \
            .eq("user_id", user_id) \
            .eq("is_primary", True) \
            .execute()
    except Exception as e:
        logger.warning(f"Could not demote previous primary CVs: {e}")

    record = {
        "user_id": user_id,
        "filename": filename,
        "storage_path": "",        # not using Supabase Storage — text stored directly
        "file_size_bytes": file_size_bytes,
        "mime_type": mime_type,
        "parsed_text": parsed_text,
        "is_primary": True,
    }
    if embedding is not None:
        record["embedding"] = embedding

    res = supabase.table("cv_files").insert(record).execute()
    return res.data[0] if res.data else {}


def list_cvs(supabase, user_id: str) -> list[dict]:
    """Return all CVs for a user, newest first, without the embedding vector."""
    res = supabase.table("cv_files") \
        .select("id, filename, file_size_bytes, mime_type, uploaded_at, is_primary") \
        .eq("user_id", user_id) \
        .order("uploaded_at", desc=True) \
        .execute()
    return res.data or []


def delete_cv(supabase, cv_id: str, user_id: str) -> bool:
    """Delete a CV and its chunks (cascades via FK). Returns True if deleted."""
    res = supabase.table("cv_files") \
        .delete() \
        .eq("id", cv_id) \
        .eq("user_id", user_id) \
        .execute()
    return bool(res.data)


def get_primary_cv_text(supabase, user_id: str) -> Optional[str]:
    """
    Fetch the parsed_text of the user's primary CV.
    Falls back to the most recently uploaded if no primary is set.
    Returns None if the user has no CVs.
    """
    try:
        res = supabase.table("cv_files") \
            .select("parsed_text") \
            .eq("user_id", user_id) \
            .eq("is_primary", True) \
            .limit(1) \
            .execute()
        if res.data and res.data[0].get("parsed_text"):
            return res.data[0]["parsed_text"]

        # Fallback: latest upload
        res2 = supabase.table("cv_files") \
            .select("parsed_text") \
            .eq("user_id", user_id) \
            .order("uploaded_at", desc=True) \
            .limit(1) \
            .execute()
        if res2.data and res2.data[0].get("parsed_text"):
            return res2.data[0]["parsed_text"]
    except Exception as e:
        logger.error(f"Failed to fetch CV text: {e}")
    return None
