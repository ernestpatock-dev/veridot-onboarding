VeriDot Onboarding Site (Netlify-ready)

1) Replace TOKEN_ADDRESS in app.js with your deployed token contract address.
2) Host the folder on Netlify:
   - Create a new site > drag & drop the site folder (contains index.html, style.css, app.js)
   - Or connect a Git repo and deploy.
3) Provide contributors the site link. They can connect MetaMask and check balances.

Important:
- Mint button is only visible if the connected wallet equals the contract owner (owner() function available).
- Do not include private keys in code.
