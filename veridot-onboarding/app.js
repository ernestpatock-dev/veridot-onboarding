// app.js - minimal Web3 UI using ethers.js
const CONNECT_BTN = document.getElementById("connectBtn");
const ADDR_P = document.getElementById("addr");
const BALANCE_H = document.getElementById("balance");
const SUPPLY_H = document.getElementById("totalSupply");
const SYMBOL_H = document.getElementById("symbol");
const OWNER_AREA = document.getElementById("ownerArea");
const MINT_TO = document.getElementById("mintTo");
const MINT_AMOUNT = document.getElementById("mintAmount");
const MINT_BTN = document.getElementById("mintBtn");

// ============== CONFIGURE THESE ==============
const CHAIN_ID = 137; // Polygon mainnet
const TOKEN_ADDRESS = "0xFA6770adc67240a1d53cdAA20163A8d4Dbb631c2"; // <--- replace after deploy

// Minimal ERC20 ABI
const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function mint(address to, uint256 amount) external"
];

let provider, signer, contract, userAddress;

async function init() {
  if (!window.ethereum) {
    CONNECT_BTN.textContent = "Install MetaMask";
    CONNECT_BTN.onclick = () => window.open("https://metamask.io/");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);

  // ✅ Ensure we're connected to the correct network (Polygon Mainnet)
  const { chainId } = await provider.getNetwork();
  if (chainId !== CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x89" }], // 137 in hex
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        // Polygon not added — add it manually
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x89",
            chainName: "Polygon Mainnet",
            nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
            rpcUrls: ["https://polygon-rpc.com/"],
            blockExplorerUrls: ["https://polygonscan.com/"],
          }],
        });
      } else {
        throw switchError;
      }
    }
  }

  CONNECT_BTN.onclick = connectWallet;
}

async function connectWallet() {
  try {
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    ADDR_P.textContent = `Connected: ${userAddress}`;
    contract = new ethers.Contract(TOKEN_ADDRESS, ABI, provider);

    // Display symbol, balance, totalSupply
    const [sym, decimals, balRaw, supplyRaw] = await Promise.all([
      contract.symbol().catch(() => "VDC"),
      contract.decimals().catch(() => 18),
      contract.balanceOf(userAddress).catch(() => ethers.BigNumber.from(0)),
      contract.totalSupply().catch(() => ethers.BigNumber.from(0))
    ]);
    SYMBOL_H.textContent = sym;
    const decimalsNum = Number(decimals);
    const balanceFormatted = ethers.utils.formatUnits(balRaw, decimalsNum);
    const supplyFormatted = ethers.utils.formatUnits(supplyRaw, decimalsNum);
    BALANCE_H.textContent = balanceFormatted;
    SUPPLY_H.textContent = supplyFormatted;

    // Check owner and show owner area if signer is owner
    const contractWithSigner = new ethers.Contract(TOKEN_ADDRESS, ABI, signer);
    try {
      const owner = await contractWithSigner.owner();
      if (owner && owner.toLowerCase() === userAddress.toLowerCase()) {
        OWNER_AREA.classList.remove("hidden");
      }
    } catch (err) {
      console.log("owner() not available or error:", err);
    }

    // Refresh balances periodically
    setInterval(async () => {
      const b = await contract.balanceOf(userAddress);
      const s = await contract.totalSupply();
      BALANCE_H.textContent = ethers.utils.formatUnits(b, decimalsNum);
      SUPPLY_H.textContent = ethers.utils.formatUnits(s, decimalsNum);
    }, 15000);

  } catch (err) {
    console.error(err);
    ADDR_P.textContent = `Error: ${err.message || err}`;
  }
}

MINT_BTN.onclick = async () => {
  if (!signer) return alert("Connect wallet and ensure you are owner");
  const to = MINT_TO.value.trim();
  const amount = MINT_AMOUNT.value.trim();
  if (!ethers.utils.isAddress(to)) return alert("Invalid recipient address");
  if (!amount || isNaN(amount) || Number(amount) <= 0) return alert("Invalid amount");

  const decimals = await contract.decimals();
  const wei = ethers.utils.parseUnits(amount, decimals);
  const contractWithSigner = new ethers.Contract(TOKEN_ADDRESS, ABI, signer);

  try {
    const tx = await contractWithSigner.mint(to, wei);
    alert("Mint tx submitted. Confirm in wallet. TxHash: " + tx.hash);
    await tx.wait();
    alert("Mint confirmed.");
    const b = await contract.balanceOf(await signer.getAddress());
    const s = await contract.totalSupply();
    BALANCE_H.textContent = ethers.utils.formatUnits(b, decimals);
    SUPPLY_H.textContent = ethers.utils.formatUnits(s, decimals);
  } catch (err) {
    console.error(err);
    alert("Mint failed: " + (err.message || err));
  }
};

init();
