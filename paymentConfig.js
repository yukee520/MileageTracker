// ============================================================
// TOYYIBPAY PAYMENT CONFIGURATION - STANDALONE
// ============================================================

export const TOYYIBPAY_CONFIG = {
  // ToyyibPay API endpoint
  toyyibpayApiUrl: 'https://toyyibpay.com/api',
  
  // Your ToyyibPay credentials - REPLACE WITH YOUR ACTUAL CREDENTIALS
  userSecretKey: 'o8sy7nux-akq3-m49x-g2oo-525z5gi6pmeg',
  categoryCode: 'mz6vknv0',
  
  // Map subscription tiers to amounts (in cents)
  tierAmounts: {
    'Personal Free': 0,
    'Personal Basic': 499,   // RM4.99
    'Personal Pro': 999,     // RM9.99
    'Group Basic': 700,      // RM7.00 per seat
    'Group Pro': 1200        // RM12.00 per seat
  },
  
  // Display amounts
  tierDisplayAmounts: {
    'Personal Free': 'FREE',
    'Personal Basic': 'RM4.99',
    'Personal Pro': 'RM9.99',
    'Group Basic': 'RM7.00/seat',
    'Group Pro': 'RM12.00/seat'
  },
  
  // Map tier to database tier
  tierToDbTier: {
    'Personal Free': 'personal_free',
    'Personal Basic': 'personal_basic',
    'Personal Pro': 'personal_pro',
    'Group Basic': 'team_basic',
    'Group Pro': 'team_pro'
  },
  
  // Payment return URL (deep linking)
  returnUrlScheme: 'mileagetracker://payment/return',
  
  // Webhook URL for payment confirmation
  webhookUrl: 'https://your-webhook-url.com/toyyibpay-webhook'
};

export default TOYYIBPAY_CONFIG;
