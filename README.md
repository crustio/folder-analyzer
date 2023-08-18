# Folder analyzer

## 1. Upload folder to ipfs

> For folder upload, refer to this [link](https://www.npmjs.com/package/ipfs-http-client) to build. It is recommended to use this gateway: `https://gw.crustfiles.app`, or build a local IPFS node with a good network for uploading. At the same time, during the upload process, you can record the cids value of the file in the folder or call the IPFS command to obtain the cids value contained in the folder after the upload is completed. The code is as follows:

```typescript
import { create } from 'ipfs-http-client'

async function addFile(ipfs: IPFS.IPFS, rootCid: any) {
    ...

    // Get links from ipfs
    for await (const link of this.ipfs.ls(rootCid)) {
		console.log(link);
    }
	...
}
```

## 2. Place storage order

Next, we need to send a transaction named `Place Storage Order` on Crust chain, this transaction will dispatch your storage requirement to each Crust IPFS nodes through blockchain. Then the IPFS nodes will start pulling your file with IPFS protocol.

> You can find more `crustChainEndpoint` on [LINK](https://github.com/crustio/crust-apps/blob/master/packages/apps-config/src/endpoints/production.ts#L9).

> You can create your own account(`seeds`) on [LINK](https://wiki.crust.network/docs/en/crustAccount).

> `If it's a folder, please set memo = 'folder'; If it's a file, please set memo = ''`

```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';
import { typesBundleForPolkadot, crustTypes } from '@crustio/type-definitions';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';

// Create global chain instance
const crustChainEndpoint = 'wss://rpc.crust.network';
const api = new ApiPromise({
    provider: new WsProvider(crustChainEndpoint),
    typesBundle: typesBundleForPolkadot,
});

async function placeStorageOrder() {
    // 1. Construct place-storage-order tx
    const fileCid = 'Qm123'; // IPFS CID, take `Qm123` as example
    const fileSize = 2 * 1024 * 1024 * 1024; // Let's say 2 gb(in byte)
    const tips = 0;
    const memo = 'folder';
    const tx = api.tx.market.placeStorageOrder(fileCid, fileSize, tips, memo);

    // 2. Load seeds(account)
    const seeds = 'xxx xxx xxx xxx xxx xxx xxx xxx xxx xxx xxx xxx';
    const kr = new Keyring({ type: 'sr25519' });
    const krp = kr.addFromUri(seeds);

    // 3. Send transaction
    await api.isReadyOrError;
    return new Promise((resolve, reject) => {
        tx.signAndSend(krp, ({events = [], status}) => {
            console.log(`💸  Tx status: ${status.type}, nonce: ${tx.nonce}`);

            if (status.isInBlock) {
                events.forEach(({event: {method, section}}) => {
                    if (method === 'ExtrinsicSuccess') {
                        console.log(`✅  Place storage order success!`);
                        resolve(true);
                    }
                });
            } else {
                // Pass it
            }
        }).catch(e => {
            reject(e);
        })
    });
}
```
## 3. Folder information

If you store a folder in Crust. Through the [folder analyzer service](https://github.com/crustio/folder-analyzer), you can obtain relevant information about the folder you placed the order in. There is a certain delay in updating this information, which is determined by the network environment.

### 3.1 Get the cids value contained in the folder

- request
```shell
curl --request GET 'https://folderanalyzer.crustapps.net/api/v1/cids?root=QmQZYQaq48KkY7nWbpfWh8kyEh21yehwPk5xoofnLFVGtV'
```
- result:

```json
[
    "QmcWkLckbnxFh3rAHqPFgAkCdTuHQjkDJwdNnMZEMmKWNP",
    "QmbFEPbHcCVT5XHio78GfQBxT1WJhYB4dY9Bujbcjw9HEG",
    "QmZPVr2ZWX96uA7cP6m7bAkJbKKSpu5Rd4wgb6EWtjcdFp"
]
```

### 3.2 Get the root of the folder to which the cid belongs

- request
```shell
curl --request GET 'https://folderanalyzer.crustapps.net/api/v1/root?cid=QmZPVr2ZWX96uA7cP6m7bAkJbKKSpu5Rd4wgb6EWtjcdFp'
```

- result:
```shell
QmQZYQaq48KkY7nWbpfWh8kyEh21yehwPk5xoofnLFVGtV
```

Additional information such as the number of copies can be obtained on the crust chain by using the root cid of the folder

### 4. Query order status

Then, you can query the order `status{replica_count, storage_duration, ...}` by calling on-chain status.

```typescript
async function getOrderState(cid: string) {
    await api.isReadyOrError;
    return await api.query.market.filesV2(cid);
}
```

And it'll return:

```json
{
    "file_size": 23710,
    "spower": 24895,
    "expired_at": 2594488,
    "calculated_at": 2488,
    "amount": "545.3730 nCRU",
    "prepaid": 0,
    "reported_replica_count": 1,
    "remaining_paid_count": 3,
    "replicas": {
        "cTHATJrSgZM2haKfn5e47NSP5Y5sqSCCToxrShtVifD2Nfxv5": {
            "who": "cTHATJrSgZM2haKfn5e47NSP5Y5sqSCCToxrShtVifD2Nfxv5",
            "valid_at": 2140,
            "anchor": "0xd9aa29dda8ade9718b38681adaf6f84126531246b40a56c02eff8950bb9a78b7c459721ce976c5c0c9cd4c743cae107e25adc3a85ed7f401c8dde509d96dcba0",
            "is_reported": true,
            "created_at": 2140
        }
    }
}
```
