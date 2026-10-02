// R2Cash Global — progressive enhancements. The site works without JavaScript;
// this adds the mobile menu toggle and friendly contact-form validation.
(function () {
  'use strict';

  // ---------- Mobile menu ----------
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    var label = toggle.querySelector('.nav-toggle-label');
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      if (label) label.textContent = open ? 'Close' : 'Menu';
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 1080px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  // ---------- Contact form ----------
  var form = document.getElementById('contact-form');
  if (!form) return;

  var status = document.getElementById('form-status');
  var endpoint = (form.getAttribute('data-endpoint') || '').trim();
  var mailTo = form.getAttribute('data-mailto');

  // Pre-select the service when arriving from a link like /contact/?service=ai-receptionist
  var params = new URLSearchParams(window.location.search);
  var wanted = params.get('service');
  var select = form.querySelector('#service');
  if (wanted && select) {
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === wanted) { select.selectedIndex = i; break; }
    }
  }

  var rules = {
    name: function (v) { return v ? '' : 'Enter your name.'; },
    email: function (v) {
      if (!v) return 'Enter your business email so we can reply.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter an email address like name@company.com.';
    },
    phone: function (v) {
      if (!v) return '';
      return v.replace(/\D/g, '').length >= 7 ? '' : 'Enter a full phone number, including area code.';
    },
    service: function (v) { return v ? '' : 'Choose the service you are interested in.'; },
    message: function (v) {
      if (!v) return 'Tell us briefly what you need help with.';
      return v.length < 10 ? 'Add a little more detail (at least 10 characters).' : '';
    },
  };

  function fieldValue(name) {
    var el = form.elements[name];
    return el ? String(el.value || '').trim() : '';
  }

  function showError(name, msg) {
    var input = form.elements[name];
    var err = document.getElementById(name + '-error');
    if (!input || !err) return;
    err.textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function validate() {
    var first = null;
    Object.keys(rules).forEach(function (name) {
      var msg = rules[name](fieldValue(name));
      showError(name, msg);
      if (msg && !first) first = form.elements[name];
    });
    // Phone is required when the person asks for a call, text or WhatsApp reply.
    var method = (form.querySelector('input[name="contact_method"]:checked') || {}).value;
    if (method && method !== 'email' && !fieldValue('phone')) {
      showError('phone', 'Add a phone number so we can reach you by ' + (method === 'whatsapp' ? 'WhatsApp' : 'phone') + '.');
      if (!first) first = form.elements.phone;
    }
    return first;
  }

  Object.keys(rules).forEach(function (name) {
    var el = form.elements[name];
    if (!el) return;
    el.addEventListener('blur', function () {
      if (el.getAttribute('aria-invalid') === 'true' || el.value) showError(name, rules[name](fieldValue(name)));
    });
  });

  function setStatus(kind, title, body) {
    status.className = 'form-status is-' + kind;
    status.innerHTML = '';
    var h = document.createElement('h3');
    h.textContent = title;
    var p = document.createElement('p');
    p.textContent = body;
    status.appendChild(h);
    status.appendChild(p);
    status.setAttribute('tabindex', '-1');
    status.focus();
  }

  function summary() {
    var method = (form.querySelector('input[name="contact_method"]:checked') || {}).value || 'email';
    var svc = select && select.selectedIndex > 0 ? select.options[select.selectedIndex].text : '';
    return [
      'Name: ' + fieldValue('name'),
      'Company: ' + (fieldValue('company') || '—'),
      'Email: ' + fieldValue('email'),
      'Phone: ' + (fieldValue('phone') || '—'),
      'Service of interest: ' + svc,
      'Preferred contact method: ' + method,
      'Consent to calls/texts: ' + (form.elements.consent && form.elements.consent.checked ? 'Yes' : 'No'),
      '',
      fieldValue('message'),
    ].join('\n');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    // Honeypot: real visitors never fill this hidden field.
    if (form.elements._gotcha && form.elements._gotcha.value) return;

    var firstInvalid = validate();
    if (firstInvalid) {
      setStatus('error', 'Please check the highlighted fields.', 'Some required information is missing or incomplete.');
      firstInvalid.focus();
      return;
    }

    var button = form.querySelector('button[type="submit"]');

    if (!endpoint) {
      // No delivery service is connected yet: hand off to the visitor's email app
      // and say so plainly, rather than pretending the message was sent.
      var subject = 'Consultation request from ' + fieldValue('name') + (fieldValue('company') ? ' (' + fieldValue('company') + ')' : '');
      window.location.href = 'mailto:' + mailTo + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(summary());
      setStatus(
        'info',
        'Your email app should now open with your message ready to send.',
        'Press Send in your email app to deliver it to ' + mailTo + '. If nothing opened, email us directly, or call or WhatsApp +1 (786) 999-2008.'
      );
      return;
    }

    button.disabled = true;
    button.textContent = 'Sending…';
    fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        setStatus('success', 'Message sent.', 'Thank you. We will reply during business hours, Monday to Friday, 8 AM to 5 PM Eastern.');
      })
      .catch(function () {
        setStatus('error', 'Your message could not be sent.', 'Please try again, or email ' + mailTo + ' or call +1 (786) 999-2008.');
      })
      .then(function () {
        button.disabled = false;
        button.textContent = 'Send request';
      });
  });
})();
