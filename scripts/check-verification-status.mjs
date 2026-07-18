const explorerApiUrl = "https://testnet.arcscan.app/api";

const guids = {
  USDC: "428266f0fc0a3b0926a6e81d4ba53203104f0e266a54999f",
  EURC: "66fe48c23b5f5363ea73f860e7671adbc62b3d046a5499a0",
  cirBTC: "f592f76a4e08c7efb394bd222b2580a2da39805e6a5499a0"
};

async function main() {
  for (const [name, guid] of Object.entries(guids)) {
    console.log(`Checking status for ${name} GUID: ${guid}...`);
    const params = new URLSearchParams();
    params.append('apikey', 'dummy');
    params.append('module', 'contract');
    params.append('action', 'checkverifystatus');
    params.append('guid', guid);

    try {
      const response = await fetch(`${explorerApiUrl}?${params.toString()}`);
      const data = await response.json();
      console.log(`Result:`, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("Failed:", e.message);
    }
  }
}

main();
