# models/dashboard.py
# Saved dashboards

from datetime import datetime
from .database import db


class Dashboard(db.Model):
    """Saved dashboard for a user."""

    __tablename__ = "dashboards"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    file_id = db.Column(db.Integer, db.ForeignKey("files.id"), nullable=True)

    # Dashboard metadata
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Configuration (JSON as string)
    filters = db.Column(db.Text, nullable=True)
    chart_preferences = db.Column(db.Text, nullable=True)

    # Stats snapshot
    snapshot_kpis = db.Column(db.Text, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_viewed = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "file_id": self.file_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Dashboard {self.name}>"