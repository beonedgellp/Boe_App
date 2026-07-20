// Global augmentations for patterns used across the app.

// Service adapters attach these fields to thrown Errors.
interface Error {
  code?: any;
  status?: any;
  details?: any;
}

// Razorpay checkout is loaded via a <script> tag in index.html.
interface Window {
  Razorpay?: any;
}
