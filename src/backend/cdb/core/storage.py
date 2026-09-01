import abc
import os
import re
import uuid
from pathlib import Path

from cdb.core.config import settings
from cdb.core.errors import ValidationError


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal or invalid characters."""
    base = os.path.basename(filename)
    # Remove any character that isn't alphanumeric, dot, underscore, or dash
    cleaned = re.sub(r"[^\w\.-]", "_", base)
    return cleaned or "document.pdf"


class StorageProvider(abc.ABC):
    """Abstract base class for storage providers."""

    @abc.abstractmethod
    async def save_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        folder: str = "contracts",
    ) -> tuple[str, int]:
        """
        Saves file bytes to the storage backend.
        Returns: (storage_key, size_bytes)
        """
        pass

    @abc.abstractmethod
    async def get_file_bytes(self, storage_key: str) -> tuple[bytes, str]:
        """
        Retrieves file bytes and content_type from storage.
        Returns: (file_bytes, content_type)
        """
        pass

    @abc.abstractmethod
    async def delete_file(self, storage_key: str) -> bool:
        """Deletes a file by its storage key."""
        pass

    @abc.abstractmethod
    async def get_download_url(self, storage_key: str, filename: str | None = None) -> str | None:
        """Generates a presigned URL or direct URL if available."""
        pass


class LocalStorageProvider(StorageProvider):
    """Local filesystem storage provider for Docker & local development."""

    def __init__(self, base_dir: str | Path | None = None) -> None:
        self.base_dir = Path(base_dir or settings.STORAGE_LOCAL_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, storage_key: str) -> Path:
        target = (self.base_dir / storage_key).resolve()
        # Ensure target is strictly within base_dir to avoid directory traversal
        if not str(target).startswith(str(self.base_dir)):
            raise ValidationError("Invalid storage path.")
        return target

    async def save_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        folder: str = "contracts",
    ) -> tuple[str, int]:
        clean_name = sanitize_filename(filename)
        unique_prefix = uuid.uuid4().hex[:12]
        storage_key = f"{folder}/{unique_prefix}_{clean_name}"

        target_path = self._resolve_path(storage_key)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        target_path.write_bytes(file_bytes)
        return storage_key, len(file_bytes)

    async def get_file_bytes(self, storage_key: str) -> tuple[bytes, str]:
        target_path = self._resolve_path(storage_key)
        if not target_path.exists() or not target_path.is_file():
            raise FileNotFoundError(f"File '{storage_key}' not found on storage.")

        file_bytes = target_path.read_bytes()
        content_type = "application/pdf"
        if target_path.suffix.lower() == ".docx":
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif target_path.suffix.lower() == ".doc":
            content_type = "application/msword"
        elif target_path.suffix.lower() == ".png":
            content_type = "image/png"
        elif target_path.suffix.lower() in [".jpg", ".jpeg"]:
            content_type = "image/jpeg"

        return file_bytes, content_type

    async def delete_file(self, storage_key: str) -> bool:
        try:
            target_path = self._resolve_path(storage_key)
            if target_path.exists() and target_path.is_file():
                target_path.unlink()
                return True
        except Exception:
            pass
        return False

    async def get_download_url(self, storage_key: str, filename: str | None = None) -> str | None:
        return None


class S3StorageProvider(StorageProvider):
    """
    S3 / Cloudflare R2 storage provider skeleton for cloud deployments.
    Uses S3-compatible API (Cloudflare R2, AWS S3, MinIO).
    """

    def __init__(self) -> None:
        self.account_id = settings.R2_ACCOUNT_ID
        self.access_key = settings.R2_ACCESS_KEY_ID
        self.secret_key = settings.R2_SECRET_ACCESS_KEY
        self.bucket_name = settings.R2_BUCKET_NAME
        self.endpoint_url = settings.R2_ENDPOINT_URL

    async def save_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        folder: str = "contracts",
    ) -> tuple[str, int]:
        # When R2 credentials are provided, boto3 / aioboto3 uploads here.
        # Fallback to local if not yet provisioned:
        return await _local_fallback_provider.save_file(file_bytes, filename, content_type, folder)

    async def get_file_bytes(self, storage_key: str) -> tuple[bytes, str]:
        return await _local_fallback_provider.get_file_bytes(storage_key)

    async def delete_file(self, storage_key: str) -> bool:
        return await _local_fallback_provider.delete_file(storage_key)

    async def get_download_url(self, storage_key: str, filename: str | None = None) -> str | None:
        return None


_local_fallback_provider = LocalStorageProvider()


def get_storage_provider() -> StorageProvider:
    """Returns the configured storage provider instance."""
    backend = (settings.STORAGE_BACKEND or "local").lower()
    if backend in ["r2", "s3", "cloudflare"] and settings.R2_ACCESS_KEY_ID:
        return S3StorageProvider()
    return _local_fallback_provider
