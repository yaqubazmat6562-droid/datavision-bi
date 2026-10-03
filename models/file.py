# models/file.py
# Uploaded file tracking

from datetime import datetime
from .database import db


class File(db.Model):
    """Uploaded dataset file."""

    __tablename__ = "files"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # File info
    original_name = db.Column(db.String(255), nullable=False)
    stored_name = db.Column(db.String(255), nullable=False, unique=True)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # bytes
    file_type = db.Column(db.String(20), nullable=False)  # xlsx, xls, csv

    # Dataset info
    rows = db.Column(db.Integer, default=0)
    columns = db.Column(db.Integer, default=0)
    column_names = db.Column(db.Text, nullable=True)  # JSON list as string

    # Metadata
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)

    # Status
    is_cleaned = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "original_name": self.original_name,
            "stored_name": self.stored_name,
            "file_size": self.file_size,
            "file_size_mb": round(self.file_size / 1024 / 1024, 2),
            "file_type": self.file_type,
            "rows": self.rows,
            "columns": self.columns,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "is_cleaned": self.is_cleaned,
        }

    def __repr__(self):
        return f"<File {self.original_name}>"