import { ethers } from 'ethers';
import axios from 'axios';

// Minimal ABI for Circle TokenMessenger
const TOKEN_MESSENGER_ABI = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 _nonce)',
  'event MessageSent(bytes message)'
];

// Minimal ABI for Circle MessageTransmitter
const MESSAGE_TRANSMITTER_ABI = [
  'function receiveMessage(bytes message, bytes attestation) external returns (bool success)'
];

export class CCTPService {
  /**
   * Burn USDC on source chain
   */
  static async burnUSDC(
    signer: ethers.Signer,
    tokenMessengerAddress: string,
    usdcAddress: string,
    amount: bigint,
    destinationDomain: number,
    mintRecipientAddress: string
  ): Promise<{ txHash: string; messageBytes: string; messageHash: string }> {
    const messengerContract = new ethers.Contract(tokenMessengerAddress, TOKEN_MESSENGER_ABI, signer);
    const mintRecipientBytes32 = ethers.zeroPadValue(mintRecipientAddress, 32);

    const tx = await messengerContract.depositForBurn(
      amount,
      destinationDomain,
      mintRecipientBytes32,
      usdcAddress
    );

    const receipt = await tx.wait();

    let messageBytes = '';
    for (const log of receipt.logs) {
      try {
        const parsedLog = messengerContract.interface.parseLog(log);
        if (parsedLog && parsedLog.name === 'MessageSent') {
          messageBytes = parsedLog.args.message;
          break;
        }
      } catch (e) {
        // Skip logs not belonging to interface
      }
    }

    if (!messageBytes) {
      throw new Error('MessageSent event not found in transaction receipt');
    }

    const messageHash = ethers.keccak256(messageBytes);
    return { txHash: receipt.hash, messageBytes, messageHash };
  }

  /**
   * Poll Circle Iris API for Attestation Signature
   */
  static async fetchAttestation(
    messageHash: string,
    irisApiUrl: string = 'https://iris-api-sandbox.circle.com/v1/attestations',
    timeoutMs: number = 300000
  ): Promise<string> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await axios.get(`${irisApiUrl}/${messageHash}`);
        if (response.data && response.data.status === 'complete') {
          return response.data.attestation;
        }
      } catch (err) {
        // API returns 404 while signature is being signed by Circle validators
      }
      
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }

    throw new Error('Circle CCTP Attestation polling timed out');
  }

  /**
   * Mint USDC on destination chain
   */
  static async mintUSDC(
    signer: ethers.Signer,
    messageTransmitterAddress: string,
    messageBytes: string,
    attestationSignature: string
  ): Promise<string> {
    const transmitterContract = new ethers.Contract(messageTransmitterAddress, MESSAGE_TRANSMITTER_ABI, signer);
    const tx = await transmitterContract.receiveMessage(messageBytes, attestationSignature);
    const receipt = await tx.wait();
    return receipt.hash;
  }
}
