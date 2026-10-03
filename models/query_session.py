# models/query_session.py
# Saved query transformation sessions

from datetime import datetime
from .database import db


class QuerySession(db.Model):
    """Saved Power Query transformation session."""

    __tablename__ = "query_sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    file_id = db.Column(db.Integer, db.ForeignKey("files.id"), nullable=True)

    # Session info
    name = db.Column(db.String(255), nullable=False)
    session_key = db.Column(db.String(255), nullable=False)

    # Steps applied (JSON string)
    steps = db.Column(db.Text, nullable=True)
    final_columns = db.Column(db.Text, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "file_id": self.file_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<QuerySession {self.name}>"