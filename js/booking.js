/* Booking form — POSTs to /api/bookings */

(function () {
  const form = document.getElementById('bookingForm');
  if (!form) return;
  const status = document.getElementById('formStatus');
  const btn = document.getElementById('submitBtn');

  function setStatus(kind, msg) {
    status.className = 'form-status full ' + kind;
    status.textContent = msg;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Sending...';
    setStatus('info', 'Sending your request...');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json().catch(() => ({}));

      if (res.ok && out.ok) {
        setStatus('success', 'Thank you! Your booking request has been received. We\'ll be in touch within 24 hours at the email or phone you provided.');
        form.reset();
      } else {
        setStatus('error', out.error || 'Something went wrong. Please try again, or email culinarymasterminds@gmail.com directly.');
      }
    } catch (err) {
      setStatus('error', 'Network error. Please check your connection and try again, or email culinarymasterminds@gmail.com directly.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
})();
