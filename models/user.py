# models/user.py
# User model with authentication

from datetime import datetime
from flask_login import UserMixin
from flask_bcrypt import Bcrypt

from .database import db

bcrypt = Bcrypt()


class User(UserMixin, db.Model):
    """User account model."""

    __tablename__ = "users"

    # Primary key
    id = db.Column(db.Integer, primary_key=True)

    # Authentication
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    # Profile
    full_name = db.Column(db.String(255), nullable=False)
    company = db.Column(db.String(255), nullable=True)
    country = db.Column(db.String(100), nullable=True, default="IN")
    currency = db.Column(db.String(10), nullable=True, default="INR")

    # Account status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)

    # Subscription
    plan = db.Column(db.String(50), default="free", nullable=False)  # free, pro, business
    plan_expires_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)

    # Relationships
    files = db.relationship(
        "File",
        backref="owner",
        lazy=True,
        cascade="all, delete-orphan"
    )
    dashboards = db.relationship(
        "Dashboard",
        backref="owner",
        lazy=True,
        cascade="all, delete-orphan"
    )
    query_sessions = db.relationship(
        "QuerySession",
        backref="owner",
        lazy=True,
        cascade="all, delete-orphan"
    )

    # ========================================
    # PASSWORD METHODS
    # ========================================
    def set_password(self, password):
        """Hash and set password."""
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        """Verify password."""
        return bcrypt.check_password_hash(self.password_hash, password)

    # ========================================
    # FLASK-LOGIN REQUIRED
    # ========================================
    @property
    def is_authenticated(self):
        return True

    # ========================================
    # HELPERS
    # ========================================
    def to_dict(self):
        """Serialize user info (safe fields only)."""
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "company": self.company,
            "country": self.country,
            "currency": self.currency,
            "plan": self.plan,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }

    @property
    def file_count(self):
        return len(self.files)

    @property
    def dashboard_count(self):
        return len(self.dashboards)

    def __repr__(self):
        return f"<User {self.email}>"