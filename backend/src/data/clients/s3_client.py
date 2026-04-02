# src/data/clients/s3_client.py

from __future__ import annotations
import logging
import uuid
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from src.config.settings import settings

from src.observability.logging.logger import setup_logger
log = setup_logger()

_s3 = boto3.client(
    "s3",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)


def upload_resume_to_s3(
    file_bytes: bytes,
    filename: str,
    candidate_id: int,
    version: int,
) -> str:
    """
    Uploads bytes to S3 and returns the s3_key.
    Key format:  resumes/{candidate_id}/v{version}_{uuid}_{filename}
    """
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    key = f"resumes/{candidate_id}/v{version}_{uuid.uuid4().hex}.{ext}"

    _s3.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=_content_type(ext),
    )
    log.info(f"Uploaded resume to s3://{settings.S3_BUCKET_NAME}/{key}")
    return key


def get_presigned_url(s3_key: str) -> Optional[str]:
    """Returns a time-limited download URL for the stored resume."""
    try:
        return _s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
            ExpiresIn=settings.S3_PRESIGNED_URL_EXPIRY,
        )
    except ClientError as e:
        log.error(f"Could not generate presigned URL for {s3_key}: {e}")
        return None


def delete_resume_from_s3(s3_key: str) -> None:
    try:
        _s3.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        log.info(f"Deleted {s3_key} from S3")
    except ClientError as e:
        log.warning(f"Could not delete {s3_key}: {e}")


def _content_type(ext: str) -> str:
    return {
        "pdf": "application/pdf",
        "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }.get(ext.lower(), "application/octet-stream")