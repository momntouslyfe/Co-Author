import type {
  UddoktapayCheckoutRequest,
  UddoktapayCheckoutResponse,
  UddoktapayVerifyRequest,
  UddoktapayVerifyResponse,
} from '@/types/uddoktapay';

/**
 * Get Uddoktapay configuration from environment variables
 */
export function getUddoktapayConfig() {
  const apiKey = process.env.UDDOKTAPAY_API_KEY;
  const baseUrl = process.env.UDDOKTAPAY_BASE_URL || 'https://sandbox.uddoktapay.com';
  
  if (!apiKey) {
    throw new Error('UDDOKTAPAY_API_KEY is not configured');
  }
  
  return {
    apiKey,
    baseUrl,
    checkoutEndpoint: `${baseUrl}/api/checkout-v2`,
    verifyEndpoint: `${baseUrl}/api/verify-payment`,
  };
}

/**
 * Create a payment session with Uddoktapay
 */
export async function createPayment(
  data: UddoktapayCheckoutRequest
): Promise<UddoktapayCheckoutResponse> {
  try {
    const config = getUddoktapayConfig();
    
    const response = await fetch(config.checkoutEndpoint, {
      method: 'POST',
      headers: {
        'RT-UDDOKTAPAY-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        status: false,
        message: result.message || 'Failed to create payment session',
      };
    }
    
    return result;
  } catch (error) {
    console.error('Uddoktapay createPayment error:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Verify a payment using invoice ID
 */
export async function verifyPayment(
  invoiceId: string
): Promise<UddoktapayVerifyResponse> {
  try {
    const config = getUddoktapayConfig();
    
    const response = await fetch(config.verifyEndpoint, {
      method: 'POST',
      headers: {
        'RT-UDDOKTAPAY-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        status: false,
        message: result.message || 'Failed to verify payment',
      };
    }
    
    return result;
  } catch (error) {
    console.error('Uddoktapay verifyPayment error:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Test Uddoktapay API connection
 */
export async function testConnection(
  apiKey: string,
  baseUrl: string
): Promise<{ success: boolean; message: string }> {
  try {
    const verifyEndpoint = `${baseUrl}/api/verify-payment`;
    
    // Test with a dummy invoice ID - this should return an error but confirms API key is valid
    const response = await fetch(verifyEndpoint, {
      method: 'POST',
      headers: {
        'RT-UDDOKTAPAY-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ invoice_id: 'test_connection_check' }),
    });
    
    // We expect this to fail (invalid invoice), but if we get 401, API key is wrong
    if (response.status === 401) {
      return {
        success: false,
        message: 'Invalid API key',
      };
    }
    
    // Any other response means the API key is accepted
    return {
      success: true,
      message: 'Connection successful',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
