import logging
import threading

from flask import current_app
from flask_mail import Message

logger = logging.getLogger(__name__)

BRAND_COLOR = "#E91E63"


def _html_wrapper(title, body_html):
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:5500")
    return f"""\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:{BRAND_COLOR};padding:24px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;">TireloMate</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 24px;">
            <h2 style="margin:0 0 16px;color:#333333;">{title}</h2>
            {body_html}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;text-align:center;color:#999999;font-size:12px;">
            &copy; TireloMate &mdash; Connecting you with trusted service providers.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _details_box(service_title, booking_date, booking_time, notes=None):
    rows = f"""\
    <tr><td style="padding:8px;font-weight:bold;color:#555;">Service</td><td style="padding:8px;">{service_title}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;color:#555;">Date</td><td style="padding:8px;">{booking_date}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;color:#555;">Time</td><td style="padding:8px;">{booking_time}</td></tr>"""
    if notes:
        rows += f'\n    <tr><td style="padding:8px;font-weight:bold;color:#555;">Notes</td><td style="padding:8px;">{notes}</td></tr>'
    return f'<table style="width:100%;border:1px solid #eeeeee;border-radius:6px;border-collapse:collapse;margin:16px 0;">{rows}</table>'


def _cta_button(label, url):
    return (
        f'<div style="text-align:center;margin:24px 0;">'
        f'<a href="{url}" style="background:{BRAND_COLOR};color:#ffffff;padding:12px 32px;'
        f'text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">{label}</a></div>'
    )


def _send_async(app, msg, mail):
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as exc:
            logger.exception("Failed to send email to %s: %s", msg.recipients, exc)


def send_booking_created_email(
    provider_email, provider_name, customer_name,
    service_title, booking_date, booking_time, notes, booking_id,
):
    try:
        app = current_app._get_current_object()
        from app import mail
        frontend_url = app.config.get("FRONTEND_URL", "http://localhost:5500")

        cta_url = f"{frontend_url}/Services-provider-dashboard.html?booking={booking_id}&action=review"

        subject = f"New booking request from {customer_name}"
        details = _details_box(service_title, booking_date, booking_time, notes)
        cta = _cta_button("Review Booking Request", cta_url)

        html = _html_wrapper(
            "You Have a New Booking Request",
            f"<p>Hi {provider_name},</p>"
            f"<p><strong>{customer_name}</strong> has requested a booking for your service.</p>"
            f"{details}{cta}",
        )

        plain = (
            f"Hi {provider_name},\n\n"
            f"{customer_name} has requested a booking for your service.\n\n"
            f"Service: {service_title}\n"
            f"Date: {booking_date}\n"
            f"Time: {booking_time}\n"
            f"Notes: {notes or 'N/A'}\n\n"
            f"Review the booking request: {cta_url}\n"
        )

        msg = Message(subject=subject, recipients=[provider_email], html=html, body=plain)
        thread = threading.Thread(target=_send_async, args=(app, msg, mail))
        thread.start()
        return True
    except Exception as exc:
        logger.exception("Error preparing booking-created email: %s", exc)
        return False


def send_booking_confirmed_email(
    customer_email, customer_name, provider_name,
    service_title, booking_date, booking_time, booking_id,
):
    try:
        app = current_app._get_current_object()
        from app import mail
        frontend_url = app.config.get("FRONTEND_URL", "http://localhost:5500")

        cta_url = f"{frontend_url}/dashboard.html?booking={booking_id}"

        subject = f"Your booking has been accepted by {provider_name}"
        details = _details_box(service_title, booking_date, booking_time)
        cta = _cta_button("View Booking", cta_url)

        html = _html_wrapper(
            "Your Booking Has Been Accepted!",
            f"<p>Hi {customer_name},</p>"
            f"<p>Great news! <strong>{provider_name}</strong> has confirmed your booking.</p>"
            f"{details}{cta}",
        )

        plain = (
            f"Hi {customer_name},\n\n"
            f"Great news! {provider_name} has confirmed your booking.\n\n"
            f"Service: {service_title}\n"
            f"Date: {booking_date}\n"
            f"Time: {booking_time}\n\n"
            f"View your booking: {cta_url}\n"
        )

        msg = Message(subject=subject, recipients=[customer_email], html=html, body=plain)
        thread = threading.Thread(target=_send_async, args=(app, msg, mail))
        thread.start()
        return True
    except Exception as exc:
        logger.exception("Error preparing booking-confirmed email: %s", exc)
        return False
