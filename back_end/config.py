import os
from dotenv import load_dotenv

# ✅ 載入 .env 檔案
load_dotenv()

# OpenAI ChatGPT 設定
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Google Vision OCR 設定
key = os.getenv("GOOGLE_PRIVATE_KEY")
if key is None:
    raise ValueError("GOOGLE_PRIVATE_KEY not found in .env or environment!")

GOOGLE_VISION_CREDENTIALS = {
    "type": os.getenv("GOOGLE_TYPE"),
    "project_id": os.getenv("GOOGLE_PROJECT_ID"),
    "private_key_id": os.getenv("GOOGLE_PRIVATE_KEY_ID"),
    "private_key": key.replace("\\n", "\n"),  # ✅ 正確格式
    "client_email": os.getenv("GOOGLE_CLIENT_EMAIL"),
    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
    "auth_uri": os.getenv("GOOGLE_AUTH_URI"),
    "token_uri": os.getenv("GOOGLE_TOKEN_URI"),
    "auth_provider_x509_cert_url": os.getenv("GOOGLE_AUTH_PROVIDER_X509_CERT_URL"),
    "client_x509_cert_url": os.getenv("GOOGLE_CLIENT_X509_CERT_URL")
}
