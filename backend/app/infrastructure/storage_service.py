import base64
import uuid
import boto3
import os
from datetime import datetime

from app.core.config import settings

session = boto3.session.Session()

s3_client = session.client(
    service_name='s3',
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    endpoint_url=settings.AWS_ENDPOINT_URL or None
)

def save_screenshot_base64(screenshot_b64: str) -> str:
    try:
        # Extrai apenas os dados base64 (remove "data:image/png;base64,...")
        header, base64_data = screenshot_b64.split(",", 1)
        image_data = base64.b64decode(base64_data)

        # Cria nome do arquivo
        now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        filename = f"screenshots/{now}_{uuid.uuid4().hex}.png"

        # Faz upload no bucket configurado
        s3_client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=filename,
            Body=image_data,
            ContentType="image/png"
        )

        # Gera URL pública (ou presigned no futuro)
        if settings.AWS_ENDPOINT_URL:
            # LocalStack ou endpoint custom
            return f"{settings.AWS_ENDPOINT_URL}/{settings.AWS_S3_BUCKET}/{filename}"
        else:
            # URL padrão da AWS S3
            return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{filename}"

    except Exception as e:
        print(f"[ERROR] Falha ao salvar screenshot no S3: {e}")
        return ""
