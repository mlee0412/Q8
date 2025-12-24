import { NextRequest, NextResponse } from 'next/server';
import { 
  Configuration, 
  PlaidApi, 
  PlaidEnvironments, 
  Products, 
  CountryCode,
  DepositoryAccountSubtype,
  CreditAccountSubtype,
} from 'plaid';

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = (process.env.PLAID_ENV || 'sandbox') as keyof typeof PlaidEnvironments;

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

/**
 * POST /api/finance/plaid/link-token
 * Generate a Plaid Link token for initializing Link
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Plaid is configured
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      return NextResponse.json(
        { 
          error: 'Plaid not configured',
          configured: false,
          message: 'Add PLAID_CLIENT_ID and PLAID_SECRET to your environment variables'
        },
        { status: 200 }
      );
    }

    const body = await request.json();
    const { userId, accessToken } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Base request config
    const linkTokenConfig: Parameters<typeof plaidClient.linkTokenCreate>[0] = {
      user: { client_user_id: userId },
      client_name: 'Q8 Finance Hub',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      // Enable account selection
      account_filters: {
        depository: {
          account_subtypes: [
            DepositoryAccountSubtype.Checking,
            DepositoryAccountSubtype.Savings,
            DepositoryAccountSubtype.MoneyMarket,
            DepositoryAccountSubtype.Cd,
          ],
        },
        credit: {
          account_subtypes: [CreditAccountSubtype.CreditCard],
        },
      },
    };

    // If updating an existing link (re-auth), include access_token
    if (accessToken) {
      linkTokenConfig.access_token = accessToken;
    }

    const response = await plaidClient.linkTokenCreate(linkTokenConfig);

    return NextResponse.json({
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
      requestId: response.data.request_id,
    });
  } catch (error: any) {
    console.error('Plaid link token error:', error.response?.data || error.message);
    
    // Handle specific Plaid errors
    if (error.response?.data?.error_code) {
      return NextResponse.json(
        {
          error: error.response.data.error_message,
          errorCode: error.response.data.error_code,
          errorType: error.response.data.error_type,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
