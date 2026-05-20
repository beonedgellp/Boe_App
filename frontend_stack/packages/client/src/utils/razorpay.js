export function openRazorpayCheckout({ keyId, orderId, amount, currency, name, description, userEmail, userContact, onSuccess, onFailure }) {
  if (!window.Razorpay) {
    alert('Razorpay checkout script not loaded. Please refresh and try again.');
    return;
  }
  if (!keyId) {
    alert('Razorpay is not configured for this payment. Please contact support.');
    return;
  }
  const options = {
    key: keyId,
    amount: Math.round(amount * 100), // Razorpay expects paise
    currency: currency || 'INR',
    name: name || 'BeOnEdge',
    description: description || 'Investment payment',
    order_id: orderId,
    handler: function (response) {
      onSuccess?.(response);
    },
    modal: {
      ondismiss: function () {
        onFailure?.({ reason: 'dismissed' });
      },
    },
    prefill: {
      email: userEmail || '',
      contact: userContact || '',
    },
    theme: {
      color: '#1a56db',
    },
  };
  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (response) {
    onFailure?.(response.error);
  });
  rzp.open();
}
