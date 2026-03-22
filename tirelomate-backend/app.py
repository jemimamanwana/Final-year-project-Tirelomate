from flask import Flask
from flask_cors import CORS
from config import Config
from routes.auth import auth_bp
from routes.user import user_bp
from routes.services import services_bp
from routes.bookings import bookings_bp
from routes.provider import provider_bp
from routes.reviews import reviews_bp
from routes.messages import messages_bp
from routes.payments import payments_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS: Allow all origins during development
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(services_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(provider_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(payments_bp)

    @app.route("/")
    def health():
        return {"status": "ok", "message": "TireloMate API running"}

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
