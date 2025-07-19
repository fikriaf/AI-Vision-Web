import aiofiles
import os
from pathlib import Path
from typing import Optional

class FileHandler:
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.models_dir = Path("models") 
        self.exports_dir = Path("exports")
        
        # Create directories if they don't exist
        for directory in [self.upload_dir, self.models_dir, self.exports_dir]:
            directory.mkdir(exist_ok=True)

    async def save_uploaded_file(self, file_content: bytes, filename: str, directory: str = "uploads") -> str:
        """Save uploaded file to specified directory"""
        target_dir = getattr(self, f"{directory}_dir")
        file_path = target_dir / filename
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        return str(file_path)

    async def read_file(self, file_path: str) -> Optional[bytes]:
        """Read file content"""
        try:
            async with aiofiles.open(file_path, 'rb') as f:
                return await f.read()
        except FileNotFoundError:
            return None

    def get_file_size(self, file_path: str) -> int:
        """Get file size in bytes"""
        try:
            return os.path.getsize(file_path)
        except FileNotFoundError:
            return 0

    def file_exists(self, file_path: str) -> bool:
        """Check if file exists"""
        return os.path.exists(file_path)

    def list_files(self, directory: str, extension: Optional[str] = None) -> list:
        """List files in directory with optional extension filter"""
        target_dir = getattr(self, f"{directory}_dir")
        
        if not target_dir.exists():
            return []
        
        files = []
        for file_path in target_dir.iterdir():
            if file_path.is_file():
                if extension is None or file_path.suffix == extension:
                    files.append(str(file_path))
        
        return files

    async def delete_file(self, file_path: str) -> bool:
        """Delete a file"""
        try:
            os.remove(file_path)
            return True
        except FileNotFoundError:
            return False
