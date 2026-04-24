"""
Tests for the email notification service.

Mocks Flask-Mail so no SMTP connection is needed.
Run with:  python -m pytest tests/test_email_service.py -v
"""

from unittest.mock import patch, MagicMock

import pytest


@pytest.fixture()
def app():
    from app import create_app
    flask_app = create_app()
    flask_app.config["TESTING"] = True
    flask_app.config["MAIL_SUPPRESS_SEND"] = True
    flask_app.config["FRONTEND_URL"] = "http://localhost:5500"
    return flask_app


class TestSendBookingCreatedEmail:

    def test_builds_correct_message(self, app):
        with app.app_context():
            with patch("services.email_service.mail") as mock_mail:
                with patch("services.email_service.threading") as mock_threading:
                    mock_thread = MagicMock()
                    mock_threading.Thread.return_value = mock_thread

                    from services.email_service import send_booking_created_email

                    result = send_booking_created_email(
                        provider_email="provider@example.com",
                        provider_name="Jane Provider",
                        customer_name="John Customer",
                        service_title="Tyre Replacement",
                        booking_date="2026-04-20",
                        booking_time="14:00",
                        notes="Front left tyre",
                        booking_id="abc-123",
                    )

                    assert result is True
                    mock_thread.start.assert_called_once()

                    call_args = mock_threading.Thread.call_args
                    msg = call_args[1]["args"][1] if "args" in call_args[1] else call_args[0][0] if call_args[0] else call_args[1].get("args", [None, None])[1]
                    # Get the msg from the Thread call
                    thread_kwargs = mock_threading.Thread.call_args
                    target_args = thread_kwargs.kwargs.get("args") or thread_kwargs[1].get("args")
                    msg = target_args[1]

                    assert "provider@example.com" in msg.recipients
                    assert "new booking" in msg.subject.lower() or "booking request" in msg.subject.lower()
                    assert "John Customer" in msg.body
                    assert "Tyre Replacement" in msg.body
                    assert "John Customer" in msg.html
                    assert "Tyre Replacement" in msg.html

    def test_returns_false_on_exception(self, app):
        with app.app_context():
            with patch("services.email_service.mail") as mock_mail:
                with patch("services.email_service.Message", side_effect=Exception("SMTP boom")):
                    from services.email_service import send_booking_created_email

                    result = send_booking_created_email(
                        provider_email="provider@example.com",
                        provider_name="Jane",
                        customer_name="John",
                        service_title="Tyre Fix",
                        booking_date="2026-04-20",
                        booking_time="14:00",
                        notes="",
                        booking_id="abc-123",
                    )

                    assert result is False


class TestSendBookingConfirmedEmail:

    def test_builds_correct_message(self, app):
        with app.app_context():
            with patch("services.email_service.mail") as mock_mail:
                with patch("services.email_service.threading") as mock_threading:
                    mock_thread = MagicMock()
                    mock_threading.Thread.return_value = mock_thread

                    from services.email_service import send_booking_confirmed_email

                    result = send_booking_confirmed_email(
                        customer_email="customer@example.com",
                        customer_name="John Customer",
                        provider_name="Jane Provider",
                        service_title="Tyre Replacement",
                        booking_date="2026-04-20",
                        booking_time="14:00",
                        booking_id="abc-123",
                    )

                    assert result is True
                    mock_thread.start.assert_called_once()

                    thread_kwargs = mock_threading.Thread.call_args
                    target_args = thread_kwargs.kwargs.get("args") or thread_kwargs[1].get("args")
                    msg = target_args[1]

                    assert "customer@example.com" in msg.recipients
                    assert "confirmed" in msg.subject.lower() or "accepted" in msg.subject.lower()
                    assert "Jane Provider" in msg.body
                    assert "Tyre Replacement" in msg.body
                    assert "Jane Provider" in msg.html
                    assert "Tyre Replacement" in msg.html

    def test_returns_false_on_exception(self, app):
        with app.app_context():
            with patch("services.email_service.mail") as mock_mail:
                with patch("services.email_service.Message", side_effect=Exception("SMTP boom")):
                    from services.email_service import send_booking_confirmed_email

                    result = send_booking_confirmed_email(
                        customer_email="customer@example.com",
                        customer_name="John",
                        provider_name="Jane",
                        service_title="Tyre Fix",
                        booking_date="2026-04-20",
                        booking_time="14:00",
                        booking_id="abc-123",
                    )

                    assert result is False
