# routes/__init__.py
from .upload_routes import upload_bp
from .clean_routes import clean_bp
from .explorer_routes import explorer_bp
from .dashboard_routes import dashboard_bp
from .query_routes import query_bp
from .export_routes import export_bp
from .pdf_export_routes import pdf_bp
from .auth_routes import auth_bp


def register_blueprints(app):
    """Register all blueprints with the Flask app."""
    app.register_blueprint(auth_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(clean_bp)
    app.register_blueprint(explorer_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(query_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(pdf_bp)