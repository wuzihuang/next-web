async function parseCart(response) {
  if (!response.ok) {
    throw new Error('cart_request_failed');
  }
  return response.json();
}

async function refreshCartCount() {
  const countNode = document.querySelector('[data-nb-cart-count]');
  if (!countNode) {
    return;
  }
  const response = await fetch('/cart.js', {
    headers: { Accept: 'application/json' },
  });
  const cart = await parseCart(response);
  countNode.textContent = String(cart.item_count || 0);
}

async function addProductForm(form) {
  const submit = form.querySelector('[type="submit"]');
  if (submit) {
    submit.disabled = true;
  }
  try {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form),
    });
    if (!response.ok) {
      const payload = await response.json().catch(function () {
        return {};
      });
      throw new Error(payload.description || payload.message || 'unavailable');
    }
    await refreshCartCount();
    window.location.href = '/cart';
  } catch (error) {
    form.submit();
  } finally {
    if (submit) {
      submit.disabled = false;
    }
  }
}

function bindProductForms() {
  document.querySelectorAll('[data-type="add-to-cart-form"]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      addProductForm(form);
    });
  });
}

function bindVariantRadios() {
  document.querySelectorAll('.nb-variant-list input[type="radio"]').forEach(function (input) {
    input.addEventListener('change', function () {
      const form = input.closest('form');
      const button = form && form.querySelector('[type="submit"], .buy');
      if (!button) {
        return;
      }
      if (input.disabled) {
        button.setAttribute('disabled', 'disabled');
        button.classList.add('is-disabled');
      } else {
        button.removeAttribute('disabled');
        button.classList.remove('is-disabled');
        button.setAttribute('type', 'submit');
        button.setAttribute('name', 'add');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  bindProductForms();
  bindVariantRadios();
});
