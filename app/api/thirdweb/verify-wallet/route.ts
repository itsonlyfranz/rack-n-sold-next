import { thirdwebServer } from '@/lib/thirdweb-server';
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import * as jwt from 'jsonwebtoken';

// For demonstration purposes - in production, store this in a secure env var
// This key is only for generating and verifying JWTs
const JWT_SECRET = process.env.AUTH_PRIVATE_KEY || '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { payload } = data;
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'No payload provided' },
        { status: 400 }
      );
    }

    // For simple message verification
    const { address, message, signature } = payload;
    
    if (!address || !message || !signature) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload format' },
        { status: 400 }
      );
    }

    // Verify the signature
    try {
      // Recover the address from the signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      // Check if the recovered address matches the provided address
      const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();
      
      if (isValid) {
        // Generate a simple JWT token with the verified address
        const token = jwt.sign(
          { 
            address,
            verifiedAt: Date.now(),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
          },
          JWT_SECRET
        );

        return NextResponse.json(
          { 
            success: true, 
            jwt: token,
            address: address,
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.error('Signature verification error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to verify signature' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error verifying wallet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify wallet' },
      { status: 500 }
    );
  }
} 