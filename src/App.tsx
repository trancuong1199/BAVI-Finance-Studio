import { useState, useEffect, useCallback, startTransition } from 'react';
import { ethers } from 'ethers';
import { SwapWidget } from './components/SwapWidget';
import { NetworkStats } from './components/NetworkStats';
import { ArcAppKit } from './components/ArcAppKit';
import { Faucet } from './components/Faucet';
import { Logs } from './components/Logs';
import { Analytics } from './components/Analytics';
import { CircleSmartContracts } from './components/CircleSmartContracts';
import { Payments } from './components/Payments';
import { FeaturesDoc } from './components/FeaturesDoc';
import { BackgroundAnimation } from './components/BackgroundAnimation';
import { TransactionMemos } from './components/TransactionMemos';
import { Activity, Layers, Repeat, Wallet, X, ChevronDown, Menu, Bot, Send, Settings } from 'lucide-react';
import { MerchantTreasury } from './components/MerchantTreasury';
import { saveTransaction } from './lib/TransactionHistory';
import { PresentationDeck } from './components/PresentationDeck';

// Global fetch interceptor to strip x-user-agent headers causing CORS preflight blocks on Circle telemetry logs
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.includes('/stablecoinKits/logs')) {
      if (init && init.headers) {
        if (init.headers instanceof Headers) {
          init.headers.delete('x-user-agent');
          init.headers.delete('X-User-Agent');
        } else if (Array.isArray(init.headers)) {
          init.headers = init.headers.filter(([key]) => key.toLowerCase() !== 'x-user-agent');
        } else if (typeof init.headers === 'object') {
          const newHeaders = { ...init.headers } as Record<string, string>;
          delete newHeaders['x-user-agent'];
          delete newHeaders['X-User-Agent'];
          init.headers = newHeaders;
        }
      }
    }
    return originalFetch.call(this, input, init);
  };
}

type ViewState = 'swap' | 'uniswap' | 'payments' | 'logs' | 'analytics' | 'faucet' | 'contracts' | 'doc' | 'memos' | 'merchant-treasury' | 'bridge' | 'presentation';

interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

function getInitialView(): ViewState {
  const path = window.location.pathname.replace(/^\//, '');
  const validViews: ViewState[] = ['swap', 'uniswap', 'payments', 'logs', 'analytics', 'faucet', 'contracts', 'doc', 'memos', 'merchant-treasury', 'bridge', 'presentation'];
  if (validViews.includes(path as ViewState)) {
    return path as ViewState;
  }
  return 'swap';
}

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(getInitialView);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- GLOBAL AUTONOMOUS CHATBOT ENGINE ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string; logs?: string }>>([
    {
      sender: 'agent',
      text: 'Hello! I am BaviAgent Coordinator. I can help you automate actions on Build on Arc:\n\n1. 🔄 Swap (e.g. "Swap 1 USDC to EURC")\n2. 🏺 Vault Deposit (e.g. "Deposit 2 USDC to Vault")\n3. 💼 Create Escrow Job ERC-8183 (e.g. "Hire agent to audit for 3 USDC")\n4. 🌉 Bridge CCTP (e.g. "Open bridge page")\n5. 🧭 Switch Tab (e.g. "Go to Faucet")\n\nDescribe your request or choose a quick suggestion below!',
      time: new Date().toLocaleTimeString()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatExecuting, setChatExecuting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('GEMINI_API_KEY') || '');

  const GEMINI_SYSTEM_PROMPT = `
You are BaviAgent Coordinator, a helpful AI assistant for the Arc Layer 1 Testnet (a stablecoin-native EVM L1 by Circle).
Analyze the user's input. You must reply in natural language. If the user wants to execute a Web3 action, you must also provide structured command parameters so the frontend can execute it.
Build on Arc details:
- Supported tokens: USDC, EURC, cirBTC.
- Supported actions: 
  1. swap (parameters: amount, fromToken, toToken)
  2. deposit (parameters: amount, token)
  3. transfer (parameters: amount, token, recipient)
  4. navigate (parameters: view - can be 'swap', 'uniswap', 'bridge', 'payments', 'faucet', 'contracts', 'memos', 'merchant-treasury', 'doc')
  5. escrow (parameters: amount, description)

Return your response strictly as a JSON object with this schema:
{
  "reply": "Your natural language response in English. Be friendly and describe what you are about to do if there is an action.",
  "command": {
    "action": "swap" | "deposit" | "transfer" | "navigate" | "escrow" | null,
    "amount": "string (e.g. '1.5')",
    "token": "USDC" | "EURC" | "cirBTC" | null,
    "fromToken": "USDC" | "EURC" | null,
    "toToken": "USDC" | "EURC" | null,
    "recipient": "string (0x address)",
    "view": "string (view name)",
    "description": "string (for escrow jobs)"
  }
}
Do not include any markdown formatting like \`\`\`json. Return pure JSON string.
`;

  const getGeminiResponse = async (userPrompt: string) => {
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) return null;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${GEMINI_SYSTEM_PROMPT}\n\nUser input: "${userPrompt}"` }]
            }
          ]
        })
      });
      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) {
        const cleanJson = textResponse.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
      }
    } catch (e) {
      console.error("Gemini API call failed", e);
    }
    return null;
  };

  const getEthersSigner = async () => {
    const provider = getProvider();
    if (!provider) throw new Error("Wallet not connected");
    const ethersProvider = new ethers.BrowserProvider(provider);
    return await ethersProvider.getSigner();
  };

  // 1. Swap USDC -> EURC or EURC -> USDC
  const chatbotSwap = async (amount: string, fromToken: 'USDC' | 'EURC') => {
    const signer = await getEthersSigner();
    const from = await signer.getAddress();
    const valueIn = parseFloat(amount);

    const ROUTER_ADDRESS = '0x509cF58CdA08C7aee83a2BdBb4A1Eac907343D01';
    const WUSDC_ADDRESS = '0x911b4000D3422F482F4062a913885f7b035382Df';
    const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

    const erc20Abi = [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function balanceOf(address account) view returns (uint256)"
    ];
    const wusdcAbi = [
      "function deposit() payable",
      "function withdraw(uint256 amount)"
    ];
    const routerAbi = [
      "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
    ];

    let txHash;
    if (fromToken === 'USDC') {
      const amountWei = BigInt(Math.floor(valueIn * 1e18));
      const wusdc = new ethers.Contract(WUSDC_ADDRESS, wusdcAbi, signer);
      const wrapTx = await wusdc.deposit({ value: amountWei });
      await wrapTx.wait();

      const wusdcErc20 = new ethers.Contract(WUSDC_ADDRESS, erc20Abi, signer);
      const approveTx = await wusdcErc20.approve(ROUTER_ADDRESS, amountWei);
      await approveTx.wait();

      const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, signer);
      const params = {
        tokenIn: WUSDC_ADDRESS,
        tokenOut: EURC_ADDRESS,
        fee: 100,
        recipient: from,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        amountIn: amountWei,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n
      };
      const swapTx = await router.exactInputSingle(params);
      const receipt = await swapTx.wait();
      txHash = receipt.hash;
    } else {
      const amountWei = BigInt(Math.floor(valueIn * 1e6));
      const eurc = new ethers.Contract(EURC_ADDRESS, erc20Abi, signer);
      const approveTx = await eurc.approve(ROUTER_ADDRESS, amountWei);
      await approveTx.wait();

      const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, signer);
      const params = {
        tokenIn: EURC_ADDRESS,
        tokenOut: WUSDC_ADDRESS,
        fee: 100,
        recipient: from,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        amountIn: amountWei,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n
      };
      const swapTx = await router.exactInputSingle(params);
      await swapTx.wait();

      const wusdcContract = new ethers.Contract(WUSDC_ADDRESS, [...wusdcAbi, ...erc20Abi], signer);
      const wusdcBalance = await wusdcContract.balanceOf(from);
      if (wusdcBalance > 0n) {
        const withdrawTx = await wusdcContract.withdraw(wusdcBalance);
        const receipt = await withdrawTx.wait();
        txHash = receipt.hash;
      }
    }
    return txHash;
  };

  // 2. Deposit to Vault
  const chatbotDeposit = async (amount: string, token: 'USDC' | 'EURC' | 'cirBTC') => {
    const signer = await getEthersSigner();
    const vaultAddresses = {
      USDC: "0x428266f0Fc0a3B0926a6E81D4ba53203104F0E26",
      EURC: "0x66fe48c23b5f5363ea73f860e7671adbc62b3d04",
      cirBTC: "0xf592f76a4e08c7efb394bd222b2580a2da39805e"
    };

    const tokenAddresses = {
      USDC: "0x3600000000000000000000000000000000000000",
      EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
      cirBTC: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF"
    };

    const decimalsMap = {
      USDC: 18,
      EURC: 6,
      cirBTC: 8
    };

    const vaultAddress = vaultAddresses[token];
    const tokenAddress = tokenAddresses[token];
    const decimals = decimalsMap[token];
    const amountUnits = ethers.parseUnits(amount, decimals);

    const erc20Abi = [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ];
    const vaultAbi = [
      "function deposit(uint256 amount) external"
    ];

    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
    const approveTx = await tokenContract.approve(vaultAddress, amountUnits);
    await approveTx.wait();

    const vaultContract = new ethers.Contract(vaultAddress, vaultAbi, signer);
    const depositTx = await vaultContract.deposit(amountUnits);
    const receipt = await depositTx.wait();
    return receipt.hash;
  };

  // 4. Direct ERC-20 token transfer on Arc Testnet
  const chatbotTransfer = async (amount: string, token: 'USDC' | 'EURC' | 'cirBTC', recipient: string) => {
    const signer = await getEthersSigner();

    const tokenAddresses = {
      USDC: "0x3600000000000000000000000000000000000000",
      EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
      cirBTC: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF"
    };

    const decimalsMap = {
      USDC: 18,
      EURC: 6,
      cirBTC: 8
    };

    const tokenAddress = tokenAddresses[token];
    const decimals = decimalsMap[token];
    const amountUnits = ethers.parseUnits(amount, decimals);

    const erc20Abi = [
      "function transfer(address to, uint256 amount) returns (bool)"
    ];

    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
    const transferTx = await tokenContract.transfer(recipient, amountUnits);
    const receipt = await transferTx.wait();
    return receipt.hash;
  };

  // 5. Autonomous Escrow Lifecycle (ERC-8183)
  const chatbotEscrowFlow = async (desc: string, budgetAmt: string) => {
    const addAgentMessage = (text: string, logs?: string) => {
      setChatMessages(prev => [...prev, {
        sender: 'agent',
        text,
        time: new Date().toLocaleTimeString(),
        logs
      }]);
    };

    const AGENTIC_COMMERCE_CONTRACT = "0x0747EEf0706327138c69792bF28Cd525089e4583";
    const USDC_CONTRACT = "0x3600000000000000000000000000000000000000";

    const agenticCommerceAbi = [
      "function createJob(address provider, address evaluator, uint256 expiredAt, string description, address hook) returns (uint256 jobId)",
      "function setBudget(uint256 jobId, uint256 amount, bytes optParams)",
      "function fund(uint256 jobId, bytes optParams)",
      "function submit(uint256 jobId, bytes32 deliverable, bytes optParams)",
      "function complete(uint256 jobId, bytes32 reason, bytes optParams)",
      "event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 expiredAt, address hook)"
    ];
    const erc20Abi = [
      "function approve(address spender, uint256 amount) returns (bool)"
    ];

    try {
      const signer = await getEthersSigner();
      const userAddr = await signer.getAddress();
      const contract = new ethers.Contract(AGENTIC_COMMERCE_CONTRACT, agenticCommerceAbi, signer);

      addAgentMessage("💼 [Escrow - 1/3] Submitting Job creation & budget configuration to Build on Arc... Please confirm in MetaMask.");
      const expiredAt = Math.floor(Date.now() / 1000) + 3600 * 24;
      const createTx = await contract.createJob(userAddr, userAddr, expiredAt, desc, "0x0000000000000000000000000000000000000000");
      const receipt = await createTx.wait();

      let newJobId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'JobCreated') {
            newJobId = parsedLog.args[0].toString();
            break;
          }
        } catch (e) { }
      }
      if (!newJobId) throw new Error("Could not extract Job ID from event");

      const budgetUnits = ethers.parseUnits(budgetAmt, 6);
      const budgetTx = await contract.setBudget(newJobId, budgetUnits, "0x");
      await budgetTx.wait();

      addAgentMessage(`🟢 Transaction successful! Job ID: ${newJobId} has been created.`);

      // Approve & Fund
      addAgentMessage(`🪙 [Escrow - 2/3] Approving and funding Job ${newJobId}... Please confirm in MetaMask.`);
      const usdc = new ethers.Contract(USDC_CONTRACT, erc20Abi, signer);
      const approveTx = await usdc.approve(AGENTIC_COMMERCE_CONTRACT, budgetUnits);
      await approveTx.wait();

      const fundTx = await contract.fund(newJobId, "0x");
      await fundTx.wait();
      addAgentMessage("🟢 Escrow funds deposited successfully.");

      // Submit & Complete
      addAgentMessage(`🚀 [Escrow - 3/3] Agent automatically submitting deliverable and completing payment release... Please confirm in MetaMask.`);
      const deliverableHash = ethers.id("arc-erc8183-chatbot-deliverable");
      const submitTx = await contract.submit(newJobId, deliverableHash, "0x");
      await submitTx.wait();

      const reasonHash = ethers.id("work-delivered-and-approved");
      const completeTx = await contract.complete(newJobId, reasonHash, "0x");
      await completeTx.wait();

      addAgentMessage(`🏆 Escrow Job ${newJobId} completed and settled successfully!`);

      // Save to transaction history
      saveTransaction({
        id: `tx-escrow-${Date.now()}`,
        action: 'Escrow Completed',
        amount: budgetAmt,
        from: userAddr,
        to: AGENTIC_COMMERCE_CONTRACT,
        txHash: completeTx.hash,
        status: 'COMPLETE',
        explorerUrl: `https://testnet.arcscan.app/tx/${completeTx.hash}`,
        timestamp: Date.now(),
        tokenSymbol: 'USDC'
      });
    } catch (err: any) {
      addAgentMessage(`❌ Escrow Error: ${err.message || err.toString()}`);
    }
  };

  const handleSendChatMessage = async (textToSubmit?: string) => {
    const text = textToSubmit || chatInput;
    if (!text.trim() || chatExecuting) return;

    setChatMessages(prev => [...prev, {
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString()
    }]);

    if (!textToSubmit) {
      setChatInput('');
    }

    setChatExecuting(true);
    const addAgentMessage = (txt: string, logs?: string) => {
      setChatMessages(prev => [...prev, {
        sender: 'agent',
        text: txt,
        time: new Date().toLocaleTimeString(),
        logs
      }]);
    };

    try {
      const apiKey = localStorage.getItem('GEMINI_API_KEY');
      if (apiKey) {
        addAgentMessage("🤖 Analyzing request with Gemini AI...");
        const aiRes = await getGeminiResponse(text);
        if (aiRes) {
          addAgentMessage(aiRes.reply);

          const cmd = aiRes.command;
          if (cmd && cmd.action) {
            if (cmd.action === 'navigate') {
              let label = cmd.view;
              if (cmd.view === 'uniswap') label = "Uniswap 🦄";
              else if (cmd.view === 'bridge') label = "CCTP Bridge 🌉";
              else if (cmd.view === 'payments') label = "Payments 💳";
              else if (cmd.view === 'logs') label = "Logs 📋";
              else if (cmd.view === 'analytics') label = "Analytics 📈";
              else if (cmd.view === 'faucet') label = "Faucet 🚰";
              else if (cmd.view === 'contracts') label = "Contracts 🏺";
              else if (cmd.view === 'memos') label = "Tx Memos 📋";
              else if (cmd.view === 'merchant-treasury') label = "Custom SCP Contract 🏺";
              else if (cmd.view === 'doc') label = "Docs 📖";

              let view = cmd.view;
              if (cmd.view === 'universal' || cmd.view === 'lifi') {
                view = 'swap';
                setActiveWidget('lifi');
                label = "Universal LI.FI Swap 🌐";
              } else if (cmd.view === 'native' || cmd.view === 'swap') {
                view = 'swap';
                setActiveWidget('native');
                label = "Native Arc Swap 🔄";
              }

              navigateTo(view as any);
              addAgentMessage(`🧭 Navigated to **${label}**.`);
              setChatExecuting(false);
              return;
            }

            if (cmd.action === 'swap') {
              const amt = cmd.amount || "1.0";
              const fromToken = cmd.fromToken || "USDC";
              const toToken = cmd.toToken || "EURC";
              addAgentMessage(`🔄 Executing swap of ${amt} ${fromToken} ➔ ${toToken} on UnitFlow V3 Router... Please confirm in MetaMask.`);
              const tx = await chatbotSwap(amt, fromToken as any);
              addAgentMessage(`🟢 Swap completed successfully!`, `Tx Hash: ${tx}`);
              window.dispatchEvent(new Event('swap_executed'));
              setChatExecuting(false);
              return;
            }

            if (cmd.action === 'deposit') {
              const amt = cmd.amount || "5.0";
              const token = cmd.token || "USDC";
              addAgentMessage(`🏺 Initiating deposit of ${amt} ${token} into corresponding Merchant Vault... Please confirm in MetaMask.`);
              const tx = await chatbotDeposit(amt, token as any);
              addAgentMessage(`🟢 Deposit successful! ${amt} ${token} is now securely locked in the vault.`, `Tx Hash: ${tx}`);
              window.dispatchEvent(new Event('swap_executed'));
              setChatExecuting(false);
              return;
            }

            if (cmd.action === 'transfer') {
              const amt = cmd.amount || "1.0";
              const token = cmd.token || "USDC";
              const recipient = cmd.recipient;
              if (!recipient) {
                addAgentMessage("⚠️ Recipient address is missing from the request.");
                setChatExecuting(false);
                return;
              }
              addAgentMessage(`💸 Initiating transfer of ${amt} ${token} to recipient ${recipient.slice(0, 6)}...${recipient.slice(-4)}... Please confirm in MetaMask.`);
              const tx = await chatbotTransfer(amt, token as any, recipient);
              addAgentMessage(`🟢 Transfer completed successfully!`, `Tx Hash: ${tx}`);
              window.dispatchEvent(new Event('swap_executed'));
              setChatExecuting(false);
              return;
            }

            if (cmd.action === 'escrow') {
              const amt = cmd.amount || "2.0";
              const desc = cmd.description || "Escrow Job";
              addAgentMessage(`💼 Received request: Escrow Job "${desc}" with budget ${amt} USDC. Initiating autonomous flow...`);
              await chatbotEscrowFlow(desc, amt);
              window.dispatchEvent(new Event('swap_executed'));
              setChatExecuting(false);
              return;
            }
          }
          setChatExecuting(false);
          return;
        }
      }

      const lower = text.toLowerCase();

      // Greeting handler
      if (lower.includes("hello") || lower.includes("hi") || lower.includes("chào") || lower.includes("hey") || lower.includes("xin chào")) {
        addAgentMessage("👋 Hello! I am your autonomous Web3 assistant on Build on Arc. How can I help you today?\n\nYou can ask me to:\n• Swap tokens (e.g. \"Swap 1 USDC to EURC\")\n• Deposit to vaults (e.g. \"Deposit 2 USDC to Vault\")\n• Transfer funds (e.g. \"Send 5 USDC to 0x...\")\n• Create escrow jobs (e.g. \"Create escrow job 3 USDC\")\n• Switch pages (e.g. \"Go to Bridge\")");
        setChatExecuting(false);
        return;
      }

      // Navigation handler
      if (lower.includes("chuyển") || lower.includes("mở") || lower.includes("go to") || lower.includes("open") || lower.includes("switch")) {
        let view: ViewState = 'swap';
        let label = "Swap";
        if (lower.includes("uniswap") || lower.includes("uni")) { view = 'uniswap'; label = "Uniswap 🦄"; }
        else if (lower.includes("bridge") || lower.includes("cctp")) { view = 'bridge'; label = "CCTP Bridge 🌉"; }
        else if (lower.includes("payment") || lower.includes("thanh toán")) { view = 'payments'; label = "Payments 💳"; }
        else if (lower.includes("log") || lower.includes("lịch sử")) { view = 'logs'; label = "Logs 📋"; }
        else if (lower.includes("analytic") || lower.includes("biểu đồ")) { view = 'analytics'; label = "Analytics 📈"; }
        else if (lower.includes("faucet") || lower.includes("vòi")) { view = 'faucet'; label = "Faucet 🚰"; }
        else if (lower.includes("contract") || lower.includes("hợp đồng")) { view = 'contracts'; label = "Contracts 🏺"; }
        else if (lower.includes("memo") || lower.includes("ghi chú")) { view = 'memos'; label = "Tx Memos 📋"; }
        else if (lower.includes("treasury") || lower.includes("vault") || lower.includes("kho")) { view = 'merchant-treasury'; label = "Custom SCP Contract 🏺"; }
        else if (lower.includes("doc") || lower.includes("tài liệu")) { view = 'doc'; label = "Docs 📖"; }
        else if (lower.includes("universal") || lower.includes("lifi")) {
          view = 'swap';
          label = "Universal LI.FI Swap 🌐";
          setActiveWidget('lifi');
        } else if (lower.includes("native") || lower.includes("swap")) {
          view = 'swap';
          label = "Native Arc Swap 🔄";
          setActiveWidget('native');
        }

        navigateTo(view);
        addAgentMessage(`🧭 Navigated you to **${label}** page.`);
        setChatExecuting(false);
        return;
      }

      // Transfer / Send handler
      if (lower.includes("send") || lower.includes("chuyển") || lower.includes("transfer")) {
        const addressMatch = text.match(/(0x[a-fA-F0-9]{40})/);
        const amountMatch = text.match(/(\d+(\.\d+)?)/);

        if (!addressMatch) {
          addAgentMessage("⚠️ Please provide a valid recipient Ethereum address (0x...).");
          setChatExecuting(false);
          return;
        }

        const recipient = addressMatch[1];
        const amt = amountMatch ? amountMatch[1] : "1.0";

        let token: 'USDC' | 'EURC' | 'cirBTC' = 'USDC';
        if (lower.includes("eurc")) token = 'EURC';
        else if (lower.includes("btc") || lower.includes("bitcoin")) token = 'cirBTC';

        addAgentMessage(`💸 Initiating transfer of ${amt} ${token} to recipient ${recipient.slice(0, 6)}...${recipient.slice(-4)}... Please confirm in MetaMask.`);
        const tx = await chatbotTransfer(amt, token, recipient);
        addAgentMessage(`🟢 Transfer completed successfully!`, `Tx Hash: ${tx}`);
        window.dispatchEvent(new Event('swap_executed'));
        setChatExecuting(false);
        return;
      }

      // Swap handler
      if (lower.includes("swap") || lower.includes("đổi")) {
        const match = text.match(/(\d+(\.\d+)?)/);
        const amt = match ? match[1] : "1.0";
        const isFromEurc = lower.includes("eurc sang usdc") || lower.includes("eurc to usdc");
        const fromToken = isFromEurc ? 'EURC' : 'USDC';
        const toToken = isFromEurc ? 'USDC' : 'EURC';

        addAgentMessage(`🔄 Executing swap of ${amt} ${fromToken} ➔ ${toToken} on UnitFlow V3 Router... Please confirm in MetaMask.`);
        const tx = await chatbotSwap(amt, fromToken);
        addAgentMessage(`🟢 Swap completed successfully!`, `Tx Hash: ${tx}`);
        window.dispatchEvent(new Event('swap_executed'));
        setChatExecuting(false);
        return;
      }

      // Deposit handler
      if (lower.includes("deposit") || lower.includes("nạp")) {
        const match = text.match(/(\d+(\.\d+)?)/);
        const amt = match ? match[1] : "5.0";
        let token: 'USDC' | 'EURC' | 'cirBTC' = 'USDC';
        if (lower.includes("eurc")) token = 'EURC';
        else if (lower.includes("btc") || lower.includes("bitcoin")) token = 'cirBTC';

        addAgentMessage(`🏺 Initiating deposit of ${amt} ${token} into corresponding Merchant Vault... Please confirm in MetaMask.`);
        const tx = await chatbotDeposit(amt, token);
        addAgentMessage(`🟢 Deposit successful! ${amt} ${token} is now securely locked in the vault.`, `Tx Hash: ${tx}`);
        window.dispatchEvent(new Event('swap_executed'));
        setChatExecuting(false);
        return;
      }

      // Escrow / Job handler
      if (lower.includes("job") || lower.includes("escrow") || lower.includes("thuê") || lower.includes("hire") || lower.includes("audit")) {
        const match = text.match(/(\d+(\.\d+)?)/);
        const amt = match ? match[1] : "2.0";
        let desc = "Audit Smart Contract";
        if (lower.includes("data")) desc = "Oracle Data Purchase";
        else if (lower.includes("code") || lower.includes("làm")) desc = "Software Development Task";

        addAgentMessage(`💼 Received request: Escrow Job "${desc}" with budget ${amt} USDC. Initiating autonomous flow...`);
        await chatbotEscrowFlow(desc, amt);
        window.dispatchEvent(new Event('swap_executed'));
        setChatExecuting(false);
        return;
      }

      // Default fallback
      setTimeout(() => {
        addAgentMessage("🤖 I didn't recognize that request. Please try typing a clear command or choose a suggestion chip below!");
        setChatExecuting(false);
      }, 800);

    } catch (err: any) {
      addAgentMessage(`❌ Execution error: ${err.message || err.toString()}`);
      setChatExecuting(false);
    }
  };



  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view: ViewState) => {
    startTransition(() => {
      setCurrentView(view);
      setIsMobileMenuOpen(false);
    });
    window.history.pushState({}, '', `/${view === 'swap' ? '' : view}`);
  };
  const [activeWidget, setActiveWidget] = useState<'lifi' | 'native'>('native');
  const [address, setAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<any>(null);
  const [availableWallets, setAvailableWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connectedWalletInfo, setConnectedWalletInfo] = useState<EIP6963ProviderDetail['info'] | null>(null);

  // EIP-6963: Listen for wallets announcing themselves
  useEffect(() => {
    const handleAnnounce = (event: any) => {
      const detail: EIP6963ProviderDetail = event.detail;
      console.log('Discovered wallet:', detail.info.name);

      setAvailableWallets(prev => {
        if (!prev.find(w => w.info.uuid === detail.info.uuid)) {
          return [...prev, detail];
        }
        return prev;
      });
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce);
    };
  }, []);

  // Auto-connect previously connected wallet
  useEffect(() => {
    const savedRDNS = localStorage.getItem('connectedWalletRDNS');
    if (savedRDNS && availableWallets.length > 0 && !walletProvider) {
      const wallet = availableWallets.find(w => w.info.rdns === savedRDNS);
      if (wallet) {
        setWalletProvider(wallet.provider);
        wallet.provider.request({ method: 'eth_accounts' })
          .then((accounts: any) => {
            if (Array.isArray(accounts) && accounts.length > 0) {
              setAddress(accounts[0]);
              setConnectedWalletInfo(wallet.info);
            }
          }).catch((e: any) => console.log('Auto-connect failed', e));
      }
    }
  }, [availableWallets, walletProvider]);

  // Fallback: Attempt to auto-connect with window.ethereum if EIP-6963 is slow or missing
  useEffect(() => {
    const attemptAutoConnect = async () => {
      if (localStorage.getItem('connectedWalletRDNS')) return; // Prioritize EIP-6963
      try {
        const eth = (window as any).ethereum;
        if (eth && !walletProvider) {
          const accounts = await eth.request({ method: 'eth_accounts' });
          if (Array.isArray(accounts) && accounts.length > 0) {
            setAddress(accounts[0]);
            setWalletProvider(eth);
          }
        }
      } catch (err) { }
    };
    setTimeout(attemptAutoConnect, 500);
  }, [walletProvider]);

  // Fallback: if EIP-6963 found nothing, fall back to window.ethereum
  const getFallbackProvider = useCallback(() => {
    const eth = (window as any).ethereum;
    if (!eth) return null;
    // If providers array exists, try to find MetaMask
    if (Array.isArray(eth.providers)) {
      const mm = eth.providers.find((p: any) => p.isMetaMask === true);
      return mm || eth.providers[0];
    }
    return eth;
  }, []);

  const getProvider = useCallback((): any => {
    if (walletProvider) return walletProvider;
    return getFallbackProvider();
  }, [walletProvider, getFallbackProvider]);

  const connectWallet = async (providerDetail?: EIP6963ProviderDetail) => {
    if (providerDetail) {
      // User selected a specific wallet from the Modal
      try {
        const accounts = await providerDetail.provider.request({ method: 'eth_requestAccounts' });
        if (Array.isArray(accounts) && accounts.length > 0) {
          setAddress(accounts[0]);
          setWalletProvider(providerDetail.provider);
          setConnectedWalletInfo(providerDetail.info);
          localStorage.setItem('connectedWalletRDNS', providerDetail.info.rdns);
          setShowWalletModal(false);
        }
      } catch (err: any) {
        console.error('Wallet connection failed:', err);
        alert(`Connection failed: ${err.message || 'Rejected'}`);
      }
      return;
    }

    // "Connect Wallet" button clicked
    if (availableWallets.length > 0) {
      setShowWalletModal(true);
      return;
    }

    // Fallback: no EIP-6963 wallets detected, try window.ethereum
    const fallbackProvider = getFallbackProvider();
    if (!fallbackProvider) {
      alert('No wallet extension found.\n\nPlease install a Web3 Wallet (like OKX, MetaMask, Phantom) and refresh the page.');
      return;
    }

    try {
      const accounts = await fallbackProvider.request({ method: 'eth_requestAccounts' });
      if (Array.isArray(accounts) && accounts.length > 0) {
        setAddress(accounts[0]);
        setWalletProvider(fallbackProvider);
        setConnectedWalletInfo({
          uuid: 'fallback',
          name: 'MetaMask',
          icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
          rdns: 'io.metamask'
        });
      }
    } catch (err: any) {
      console.error('Fallback connect error:', err);
      alert('Connection rejected. Please click "Connect Wallet" and approve in your wallet.');
    }
  };

  return (
    <>
      <BackgroundAnimation />
      <div className="app-container">
        <div className="mobile-header">
          <div className="nav-brand" onClick={() => navigateTo('swap')} style={{ cursor: 'pointer' }}>
            <Activity color="#3b82f6" />
            BAVI Studio
          </div>
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={24} color="#f8fafc" />
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}

        <aside className={`sidebar animate-fade-in ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="nav-brand" onClick={() => navigateTo('swap')} style={{ cursor: 'pointer' }}>
            <Activity color="#3b82f6" />
            BAVI Finance Studio
          </div>

          <div className="nav-links">
            <a
              className={`nav-link ${currentView === 'swap' ? 'active' : ''}`}
              onClick={() => navigateTo('swap')}
            >
              Swap
            </a>

            <a
              className={`nav-link ${currentView === 'payments' ? 'active' : ''}`}
              onClick={() => navigateTo('payments')}
            >
              Payments
            </a>
            <a
              className={`nav-link ${currentView === 'analytics' ? 'active' : ''}`}
              onClick={() => navigateTo('analytics')}
            >
              Analytics
            </a>
            <a
              className={`nav-link ${currentView === 'faucet' ? 'active' : ''}`}
              onClick={() => navigateTo('faucet')}
            >
              Faucet
            </a>
            <a
              className={`nav-link ${currentView === 'memos' ? 'active' : ''}`}
              onClick={() => navigateTo('memos')}
              style={currentView === 'memos' ? { boxShadow: 'inset 4px 0 0 #3b82f6', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--text-primary)' } : {}}
            >
              Tx Memos 📋
            </a>
            <a
              className={`nav-link ${currentView === 'merchant-treasury' ? 'active' : ''}`}
              onClick={() => navigateTo('merchant-treasury')}
              style={currentView === 'merchant-treasury' ? { boxShadow: 'inset 4px 0 0 #a78bfa', background: 'rgba(167, 139, 250, 0.15)', color: 'var(--text-primary)' } : {}}
            >
              <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: '1.25', fontSize: '1.1rem' }}>
                <span>Custom SCP</span>
                <span>Contract</span>
              </span>
              <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center' }}>🏺</span>
            </a>
            <a
              className={`nav-link ${currentView === 'presentation' ? 'active' : ''}`}
              onClick={() => navigateTo('presentation')}
              style={currentView === 'presentation' ? { boxShadow: 'inset 4px 0 0 #38bdf8', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--text-primary)' } : {}}
            >
              Presentation Deck 📊
            </a>
            <a
              className={`nav-link ${currentView === 'doc' ? 'active' : ''}`}
              onClick={() => navigateTo('doc')}
            >
              Docs
            </a>
          </div>

          <div className="header-controls">
            <div className="status-pulse" style={{ borderRadius: '24px', cursor: 'default', width: 'fit-content' }}>
              <div className="pulse-dot"></div>
              Build on Arc
            </div>

            <button onClick={() => connectWallet()} className="wallet-button" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '24px', width: 'fit-content' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {connectedWalletInfo ? (
                  <img src={connectedWalletInfo.icon} alt={connectedWalletInfo.name} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                ) : (
                  <Wallet size={24} color="var(--text-secondary)" />
                )}
              </div>

              <span style={{ fontSize: '14px', fontWeight: 600, margin: '0 2px' }}>
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
              </span>

              <ChevronDown size={16} color="var(--text-secondary)" />
            </button>
          </div>
        </aside>

        <div className="main-content-area">
          {currentView === 'swap' && (
            <main className="main-grid">
              <NetworkStats connectedAccount={address} />

              <div className="widget-switcher-container">
                <div className="glass-panel widget-switcher">
                  <button
                    onClick={() => setActiveWidget('native')}
                    className={`switcher-btn ${activeWidget === 'native' ? 'active' : ''}`}
                  >
                    <Layers size={18} />
                    Native Arc
                  </button>
                  <button
                    onClick={() => setActiveWidget('lifi')}
                    className={`switcher-btn ${activeWidget === 'lifi' ? 'active' : ''}`}
                  >
                    <Repeat size={18} />
                    Universal (LI.FI)
                  </button>
                </div>

                <div className="animate-fade-in">
                  {activeWidget === 'native'
                    ? <ArcAppKit connectedAccount={address} getProvider={getProvider} />
                    : <SwapWidget />}
                </div>
              </div>
            </main>
          )}


          {currentView === 'payments' && (
            <main className="page-view">
              <Payments walletProvider={walletProvider} address={address || ''} />
            </main>
          )}

          {currentView === 'logs' && (
            <main className="page-view">
              <Logs />
            </main>
          )}

          {currentView === 'analytics' && (
            <main className="page-view">
              <Analytics address={address} />
            </main>
          )}

          {currentView === 'faucet' && (
            <main className="page-view">
              <Faucet connectedAccount={address} />
            </main>
          )}

          {currentView === 'contracts' && (
            <main className="page-view">
              <CircleSmartContracts />
            </main>
          )}

          {currentView === 'memos' && (
            <main className="page-view">
              <TransactionMemos walletProvider={walletProvider} address={address || ''} />
            </main>
          )}



          {currentView === 'presentation' && (
            <main className="page-view">
              <PresentationDeck />
            </main>
          )}

          {currentView === 'doc' && (
            <main className="page-view">
              <FeaturesDoc />
            </main>
          )}

          {currentView === 'merchant-treasury' && (
            <main className="page-view">
              <MerchantTreasury connectedAccount={address} walletProvider={getProvider()} />
            </main>
          )}

          {/* Wallet Selection Modal */}
          {showWalletModal && (
            <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
              <div className="wallet-modal" onClick={e => e.stopPropagation()}>
                <div className="wallet-modal-header">
                  <h3 className="wallet-modal-title">Connect a Wallet</h3>
                  <button className="wallet-close-btn" onClick={() => setShowWalletModal(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="wallet-list">
                  {availableWallets.map(wallet => (
                    <div
                      key={wallet.info.uuid}
                      className="wallet-item"
                      onClick={() => connectWallet(wallet)}
                    >
                      <img src={wallet.info.icon} alt={wallet.info.name} className="wallet-icon" />
                      <span className="wallet-name">{wallet.info.name}</span>
                      <span className="wallet-status">Detected</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Box for Autonomous Agent */}
      <div className="agent-chat-container">
        {/* CSS Style Injection for Premium Animations & Fonts */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

          .agent-chat-container {
            position: fixed;
            bottom: 25px;
            right: 25px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            font-family: 'Outfit', 'Inter', sans-serif;
          }

          /* Custom Scrollbar styling */
          .custom-scrollbar::-webkit-scrollbar {
            width: 5px;
            height: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            transition: background 0.2s;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.25);
          }

          @keyframes agentFloat {
            0% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-6px) scale(1.02); }
            100% { transform: translateY(0px) scale(1); }
          }
          @keyframes agentPulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
            70% { box-shadow: 0 0 0 15px rgba(139, 92, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
          }
          @keyframes agentWindowOpen {
            from { opacity: 0; transform: translateY(20px) scale(0.95); filter: blur(5px); }
            to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          }
          @keyframes agentMsgSlide {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes onlinePulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
          
          .agent-toggle-btn {
            animation: agentFloat 4s ease-in-out infinite, agentPulseGlow 2.5s infinite;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #d946ef 100%) !important;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            border: 1px solid rgba(255, 255, 255, 0.25) !important;
          }
          .agent-toggle-btn:hover {
            transform: scale(1.08) rotate(3deg) !important;
            filter: brightness(1.15) saturate(1.1);
          }
          .agent-chat-window {
            animation: agentWindowOpen 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            background: rgba(10, 15, 28, 0.84) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            backdrop-filter: blur(25px) !important;
            -webkit-backdrop-filter: blur(25px) !important;
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.08) !important;
            width: 480px !important;
            height: 640px !important;
          }
          .agent-msg-bubble {
            animation: agentMsgSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .agent-chip {
            transition: all 0.25s ease !important;
            background: rgba(255, 255, 255, 0.03) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
          }
          .agent-chip:hover:not(:disabled) {
            background: rgba(139, 92, 246, 0.12) !important;
            border-color: rgba(139, 92, 246, 0.35) !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
          }
          .agent-online-ring::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: #10b981;
            animation: onlinePulse 2s infinite ease-out;
            left: 0;
            top: 0;
          }

          /* Responsive Rules for Mobile */
          @media (max-width: 600px) {
            .agent-chat-container {
              bottom: 15px !important;
              right: 15px !important;
            }
            .agent-chat-window {
              width: calc(100vw - 30px) !important;
              height: 520px !important;
              max-height: calc(100vh - 100px) !important;
            }
            .agent-toggle-btn {
              width: 56px !important;
              height: 56px !important;
            }
          }
        ` }} />

        {/* Toggle Button */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="agent-toggle-btn"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Bot size={30} color="white" />
            <span className="agent-online-ring" style={{ position: 'absolute', top: '2px', right: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid #0f172a' }}></span>
          </button>
        )}

        {/* Chat Window */}
        {chatOpen && (
          <div className="agent-chat-window" style={{
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Top Accent Line */}
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #d946ef)' }}></div>

            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(20, 24, 40, 0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <Bot size={24} color="#60a5fa" />
                  </div>
                  <div>
                    <h4 style={{ color: '#fff', margin: 0, fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.3px' }}>BaviAgent Coordinator</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#10b981', marginTop: '2px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', position: 'relative' }}></span>
                      {apiKeyInput ? 'AI Mode Active' : 'Online & Autonomous'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: '32px', height: '32px', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  >
                    <Settings size={16} color={apiKeyInput ? '#10b981' : '#9ca3af'} />
                  </button>
                  <button
                    onClick={() => setChatOpen(false)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: '32px', height: '32px', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* API Key settings panel */}
              {showSettings && (
                <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(15, 23, 40, 0.98)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>Enter your Gemini API Key to enable AI intent understanding:</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem('GEMINI_API_KEY', apiKeyInput);
                        setShowSettings(false);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px 12px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Message History */}
            <div style={{ flex: 1, padding: '1.2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }} className="custom-scrollbar">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="agent-msg-bubble" style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '1rem 1.25rem',
                    borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: msg.sender === 'user' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.04)',
                    color: msg.sender === 'user' ? '#fff' : '#e2e8f0',
                    fontSize: '0.98rem',
                    lineHeight: '1.5',
                    border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: msg.sender === 'user' ? '0 4px 15px rgba(37, 99, 235, 0.2)' : 'none',
                  }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                    {msg.logs && (
                      <div style={{
                        marginTop: '0.6rem',
                        padding: '0.75rem',
                        background: 'rgba(0,0,0,0.65)',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontFamily: 'monospace',
                        color: '#34d399',
                        border: '1px solid rgba(255,255,255,0.05)',
                        overflowX: 'auto',
                      }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.logs}</pre>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.3rem', padding: '0 0.2rem' }}>{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Suggestion Chips */}
            <div style={{ padding: '0.6rem 1.2rem', display: 'flex', gap: '0.6rem', overflowX: 'auto', whiteSpace: 'nowrap', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(10,12,20,0.3)' }} className="custom-scrollbar">
              <button
                disabled={chatExecuting}
                onClick={() => handleSendChatMessage("Swap 1 USDC to EURC")}
                className="agent-chip"
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  color: '#60a5fa',
                  fontSize: '0.85rem',
                  cursor: chatExecuting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                🔄 Swap 1 USDC
              </button>
              <button
                disabled={chatExecuting}
                onClick={() => handleSendChatMessage("Deposit 2 USDC to Vault")}
                className="agent-chip"
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  color: '#c084fc',
                  fontSize: '0.85rem',
                  cursor: chatExecuting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                🏺 Deposit 2 USDC
              </button>
              <button
                disabled={chatExecuting}
                onClick={() => handleSendChatMessage("Open Faucet page")}
                className="agent-chip"
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  color: '#34d399',
                  fontSize: '0.85rem',
                  cursor: chatExecuting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                🚰 Faucet Page
              </button>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }}
              style={{ display: 'flex', padding: '1rem 1.2rem', background: 'rgba(20, 24, 40, 0.5)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <input
                type="text"
                placeholder={chatExecuting ? "Agent executing..." : "e.g. Swap 1 USDC to EURC..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatExecuting}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '0.85rem 1.1rem',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#8b5cf6'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <button
                type="submit"
                disabled={chatExecuting || !chatInput.trim()}
                style={{
                  marginLeft: '0.75rem',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: chatExecuting || !chatInput.trim() ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  border: chatExecuting || !chatInput.trim() ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: chatExecuting || !chatInput.trim() ? 'not-allowed' : 'pointer',
                  color: chatExecuting || !chatInput.trim() ? '#4b5563' : '#fff',
                  transition: 'all 0.2s',
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
