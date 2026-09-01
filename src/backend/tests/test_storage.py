import pytest

from cdb.core.storage import LocalStorageProvider, get_storage_provider, sanitize_filename


@pytest.mark.asyncio
async def test_sanitize_filename():
    assert sanitize_filename("../../../secret.pdf") == "secret.pdf"
    assert sanitize_filename("my contract (final) 2026.pdf") == "my_contract__final__2026.pdf"
    assert sanitize_filename("") == "document.pdf"


@pytest.mark.asyncio
async def test_local_storage_provider(tmp_path):
    provider = LocalStorageProvider(base_dir=tmp_path)
    test_bytes = b"%PDF-1.4 sample contract document content"
    filename = "master_services_agreement.pdf"
    content_type = "application/pdf"

    # Save
    storage_key, size_bytes = await provider.save_file(
        file_bytes=test_bytes,
        filename=filename,
        content_type=content_type,
        folder="test_contracts",
    )
    assert storage_key.startswith("test_contracts/")
    assert "master_services_agreement.pdf" in storage_key
    assert size_bytes == len(test_bytes)

    # Read back
    retrieved_bytes, retrieved_type = await provider.get_file_bytes(storage_key)
    assert retrieved_bytes == test_bytes
    assert retrieved_type == "application/pdf"

    # Delete
    deleted = await provider.delete_file(storage_key)
    assert deleted is True

    # Confirm deleted
    with pytest.raises(FileNotFoundError):
        await provider.get_file_bytes(storage_key)


@pytest.mark.asyncio
async def test_get_storage_provider_factory():
    provider = get_storage_provider()
    assert isinstance(provider, LocalStorageProvider)
