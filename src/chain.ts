import { ApiPromise, WsProvider } from '@polkadot/api';
import { BlockHash, Header, SignedBlock } from '@polkadot/types/interfaces';
import { typesBundleForPolkadot, crustTypes } from '@crustio/type-definitions';
import { UnsubscribePromise, VoidFn } from '@polkadot/api/types';
import { logger, sleep } from './utils';

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
        logger.info('[Chain] connected');
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
            logger.info('⛓ Connection broken, waiting for chain running.');
            await sleep(6000); // IMPORTANT: Sequential matters(need give time for create ApiPromise)
            this.init(); // Try to recreate api to connect running chain
        }

        // Waiting for chain synchronization
        while (await this.isSyncing()) {
            logger.info(
                `⛓ Chain is synchronizing, current block number ${(
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

    /**
     * Used to determine whether the chain is synchronizing
     * @returns true/false
     */
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

    /**
     * Get best block's header
     * @returns header
     */
    async header(): Promise<Header> {
        return this.api.rpc.chain.getHeader();
    }

    private async withApiReady(): Promise<boolean> {
        try {
            await this.api.isReadyOrError;
            return true;
        } catch (e) {
            logger.error(`💥 Error connecting with Chain: %s`, e);
            return false;
        }
    }

}