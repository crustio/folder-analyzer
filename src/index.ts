import express from 'express';

const PORT = process.argv[2] || 17635;
const GATEWAY = process.argv[3] || "https://crustwebsites.net";
const CHAINENDPOINT = process.argv[4] || "wss://rpc.crust.network";

const app = express();

async function main() {
    console.log("res.status")
}

main()
