import { id } from 'ethers';

const signature = "MemoFailed(bytes)";
const selector = id(signature).slice(0, 10);

console.log("Signature:", signature);
console.log("Selector:", selector);
