# 使用官方 Python 形象
FROM python:3.11

# 設定工作目錄
WORKDIR /app

# 複製檔案進容器
COPY . .

# 安裝依賴
RUN pip install --upgrade pip
RUN pip install -r requirements-lite.txt

# 執行 Django 遷移 & 啟動
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
