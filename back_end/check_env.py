from dotenv import load_dotenv
import os

load_dotenv()

print("GOOGLE_PRIVATE_KEY =", os.getenv("GOOGLE_PRIVATE_KEY"))
