
import * as crypto from "https://deno.land/std@0.168.0/crypto/mod.ts";

/**
 * Verify that the webhook request came from Paystack
 * @param payload - The payload from the webhook request
 * @param signature - The signature from the request headers
 * @param secret - The Paystack secret key
 */
export const verifyPaystackWebhook = async (payload: string, signature: string, secret: string): Promise<boolean> => {
  try {
    if (!signature || !payload || !secret) {
      return false;
    }
    
    // Convert the secret to a TextEncoder
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign", "verify"]
    );
    
    // Create a signature from the payload
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    // Convert the signature to a hex string
    const calculatedSignature = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return calculatedSignature === signature;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
};
