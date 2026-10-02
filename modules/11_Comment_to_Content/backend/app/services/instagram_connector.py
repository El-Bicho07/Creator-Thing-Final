import logging
from typing import List, Dict, Any
from backend.app.config import settings

logger = logging.getLogger(__name__)

class InstagramGraphAPIConnector:
    """
    Instagram Graph API Connector for Instagram Business / Creator accounts.
    
    FEATURE FLAG: ENABLE_INSTAGRAM_GRAPH_API
    By default, this is disabled because Instagram Graph API requires:
    1. A Meta Developer App with 'instagram_basic' and 'instagram_manage_comments' permissions.
    2. A Facebook Page connected to an Instagram Business or Creator account.
    3. User Access Token with page permissions and valid OAuth exchange.
    """
    def __init__(self):
        self.enabled = settings.ENABLE_INSTAGRAM_GRAPH_API
        self.app_id = settings.INSTAGRAM_APP_ID
        self.app_secret = settings.INSTAGRAM_APP_SECRET
        self.access_token = settings.INSTAGRAM_ACCESS_TOKEN
        self.base_url = "https://graph.facebook.com/v19.0"

    def is_configured(self) -> bool:
        return bool(self.enabled and self.access_token)

    async def fetch_media_comments(self, instagram_account_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        TODO: Implement production webhook or polling sync with Meta Graph API.
        
        Steps required when ENABLE_INSTAGRAM_GRAPH_API=true:
        1. Query GET /{instagram_account_id}/media?fields=id,caption,media_type,timestamp,comments_count
        2. For each media item, query GET /{media_id}/comments?fields=id,text,username,timestamp,like_count
        3. Handle pagination via paging.cursors.after
        4. Normalize into ComIdea comment format:
           {
               "comment_id": comment["id"],
               "username": f"@{comment.get('username', 'user')}",
               "text": comment.get("text", ""),
               "likes": comment.get("like_count", 0),
               "timestamp": comment.get("timestamp", ""),
               "post_caption": media_item.get("caption", "")
           }
        """
        if not self.is_configured():
            logger.info("Instagram Graph API is not enabled or credentials are missing. Returning empty or stub list.")
            return []

        # When enabled with valid token, integrate with httpx to fetch live comments
        # import httpx
        # async with httpx.AsyncClient() as client:
        #     res = await client.get(f"{self.base_url}/{instagram_account_id}/media", params={
        #         "access_token": self.access_token,
        #         "fields": "id,caption,comments{id,text,username,timestamp,like_count}"
        #     })
        #     res.raise_for_status()
        #     data = res.json()
        #     ...
        return []

instagram_connector = InstagramGraphAPIConnector()
