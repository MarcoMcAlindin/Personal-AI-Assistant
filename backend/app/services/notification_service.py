import logging
from typing import List

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class NotificationService:
    async def send_push_notification(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: dict = None,
    ) -> None:
        """Send a push notification to one or more Expo push tokens.

        Errors are logged but never raised -- push delivery is best-effort.
        """
        if not tokens:
            return
        if data is None:
            data = {}

        messages = [
            {
                "to": token,
                "title": title,
                "body": body,
                "data": data,
                "sound": "default",
            }
            for token in tokens
        ]

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=messages,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                logger.info(
                    "[NotificationService] Sent push to %d token(s): %s",
                    len(tokens),
                    title,
                )
        except Exception as e:
            logger.error("[NotificationService] Push failed: %s", e)
