# models/dashboard.py
# Saved dashboards with KPI + Chart Layout

from datetime import datetime
from .database import db


class Dashboard(db.Model):
    """Saved dashboard layout for a user."""

    __tablename__ = "dashboards"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    file_id = db.Column(db.Integer, db.ForeignKey("files.id"), nullable=True)

    # Dashboard metadata
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Layout data (JSON strings)
    kpi_customization = db.Column(db.Text, nullable=True)
    chart_layout = db.Column(db.Text, nullable=True)
    filters = db.Column(db.Text, nullable=True)
    chart_preferences = db.Column(db.Text, nullable=True)

    # Stats snapshot
    snapshot_kpis = db.Column(db.Text, nullable=True)

    # Status
    is_default = db.Column(db.Boolean, default=False, nullable=False)

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
            "is_default": self.is_default,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_viewed": self.last_viewed.isoformat() if self.last_viewed else None,
        }

    def __repr__(self):
        return f"<Dashboard {self.name}>"