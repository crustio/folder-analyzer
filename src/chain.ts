import { ApiPromise, WsProvider } from '@polkadot/api';
import { BlockHash, Header, Extrinsic, EventRecord } from '@polkadot/types/interfaces';
import { typesBundleForPolkadot, crustTypes } from '@crustio/type-definitions';
import { UnsubscribePromise, VoidFn } from '@polkadot/api/types';
import { Folder, hexToString, logger, sleep } from './utils';

export default class ChainApi {
    private readonly endponit: string;
    private api!: ApiPromise;

    constructor(endponit: string) {
        this.endponit = endponit;
    }

    async init(): Promise<void> {
        if (this.api && this.api.disconnect) {
            this.api.disconnect().then().catch();
        }

        this.api = new ApiPromise({
            provider: new WsProvider(this.endponit),
            typesBundle: typesBundleForPolkadot,
        });

        await this.api.isReady;
        while (!this.api.isConnected) {
            logger.info('[Chain] Waiting for api to connect');
            await sleep(2 * 1000);
        }
        logger.info('[Chain] Connected');
    }

    // stop this api instance
    async stop(): Promise<void> {
        if (this.api) {
            const api = this.api;
            if (api.disconnect) {
                await api.disconnect();
            }
        }
    }

    // reconnect this api instance
    async reconnect(): Promise<void> {
        await this.stop();
        await sleep(30 * 1000);
        await this.init();
        await sleep(10 * 1000);
    }

    isConnected(): boolean {
        return this.api.isConnected;
    }

    chainApi(): ApiPromise {
        return this.api;
    }

    /// READ methods
    /**
     * Register a pubsub event, dealing with new block
     * @param handler handling with new block
     * @returns unsubscribe signal
     * @throws ApiPromise error
     */
    async subscribeNewHeads(handler: (b: Header) => void): UnsubscribePromise {
        // Waiting for API
        while (!(await this.withApiReady())) {
            logger.info('[Chain] Connection broken, waiting for chain running.');
            await sleep(6000); // IMPORTANT: Sequential matters(need give time for create ApiPromise)
            this.init(); // Try to recreate api to connect running chain
        }

        // Waiting for chain synchronization
        while (await this.isSyncing()) {
            logger.info(
                `[Chain] Chain is synchronizing, current block number ${(
                    await this.header()
                ).number.toNumber()}`,
            );
            await sleep(6000);
        }

        // Subscribe finalized event
        return await this.api.rpc.chain.subscribeFinalizedHeads((head: Header) =>
            handler(head),
        );
    }

    async getBlockHash(blockNum: number): Promise<BlockHash> {
        return this.api.rpc.chain.getBlockHash(blockNum);
    }

    async parseNewFolders(blockHash: string, blockNum: number): Promise<Folder[]> {
        await this.withApiReady();
        try {
            const block = await this.api.rpc.chain.getBlock(blockHash);
            const exs: Extrinsic[] = block.block.extrinsics;
            const ers: EventRecord[] = await this.api.query.system.events.at(blockHash);
            const newFolders: Folder[] = [];

            for (const { event: { data, method }, phase, } of ers) {
                if (method === 'FileSuccess') {
                    if (data.length < 2) {
                        continue
                    };

                    // Find new successful file order from extrinsincs
                    const exIdx = phase.asApplyExtrinsic.toNumber();
                    const ex = exs[exIdx];
                    const exData = ex.method.args as any;
                    // "0x666f6c646572" is 'folder'
                    if (exData[3] == "0x666f6c646572") {
                        const size = exData[1].toNumber() / 1024 / 1024;
                        if (size == 0) {
                            logger.info(`[chain] New folder find: ${hexToString(data[1].toString())}, size < 1MB`)
                        } else {
                            logger.info(`[chain] New folder find: ${hexToString(data[1].toString())}, size: ${size} MB`)
                        }
                        newFolders.push({
                            cid: hexToString(data[1].toString()),
                            size: size,
                            blockNum: blockNum
                        });
                    }
                }
            }
            return newFolders;
        } catch (err) {
            logger.error(`[chain] Parse folder error at block(${blockNum}): ${err}`);
            return [];
        }
    }

    async isSyncing(): Promise<boolean> {
        const health = await this.api.rpc.system.health();
        let res = health.isSyncing.isTrue;

        if (!res) {
            const h_before = await this.header();
            await sleep(3000);
            const h_after = await this.header();
            if (h_before.number.toNumber() + 1 < h_after.number.toNumber()) {
                res = true;
            }
        }

        return res;
    }

    async replicaCount(cid: string): Promise<number> {
        const file: any = await this.api.query.market.files(cid); // eslint-disable-line
        if (file.isEmpty) {
            return 0;
        }
        const fi = file.toJSON() as any; // eslint-disable-line
        return fi.amount.toNumber();
    }


    async header(): Promise<Header> {
        return this.api.rpc.chain.getHeader();
    }

    private async withApiReady(): Promise<boolean> {
        try {
            await this.api.isReadyOrError;
            return true;
        } catch (e) {
            logger.error(`[chain] Error connecting with Chain: %s`, e);
            return false;
        }
    }
}
