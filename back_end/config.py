import os

# OpenAI ChatGPT 設定
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Google Vision OCR 設定
GOOGLE_VISION_CREDENTIALS = {
                "type": os.getenv("GOOGLE_TYPE"),
                "project_id": os.getenv("GOOGLE_PROJECT_ID"),
                "private_key_id": os.getenv("GOOGLE_PRIVATE_KEY_ID"),
                "private_key": os.getenv("GOOGLE_PRIVATE_KEY").replace("\\n", "\n"),
                "client_email": os.getenv("GOOGLE_CLIENT_EMAIL"),
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),  # 如果你 .json 沒這個欄位，可以設為 None
                "auth_uri": os.getenv("GOOGLE_AUTH_URI"),
                "token_uri": os.getenv("GOOGLE_TOKEN_URI"),
                "auth_provider_x509_cert_url": os.getenv("GOOGLE_AUTH_PROVIDER_X509_CERT_URL"),
                "client_x509_cert_url": os.getenv("GOOGLE_CLIENT_X509_CERT_URL")
}
