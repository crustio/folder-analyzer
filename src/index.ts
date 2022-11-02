import express, { NextFunction } from 'express';
import { Request, Response } from 'express';
import timeout from 'connect-timeout';
import IpfsApi from './ipfs';
import { AppContext, logger } from './utils';
import ChainApi from './chain';

const APITimeout = '600s'
const Port = process.argv[2] || 17635;
const Gateway = process.argv[3] || "https://crustwebsites.net";
const ChainEndpoint = process.argv[4] || "wss://rpc.crust.network";

const app = express();

async function main() {
    // Log configurations
    logger.info(`[global]: API port: ${Port}`)
    logger.info(`[global]: IPFS gateway: ${Gateway}`)
    logger.info(`[global]: Chain endponit: ${ChainEndpoint}`)

    // Connect ipfs gateway
    const ipfs = new IpfsApi(Gateway);
    // Connect chain
    const chain = new ChainApi(ChainEndpoint);
    await chain.initApi();
    // Context
    const context: AppContext = {
        chain,
        ipfs
    }

    // Log handler
    app.use(loggingResponse);
    // API timeout handler
    app.use(timeout(APITimeout));
    // Get routes
    app.get('/api/v1/root', (req, res) => { findRootHander(req, res, context) });
    // Error handler
    app.use(errorHandler);

    // Start express
    app.listen(Port, () => {
        logger.info(
            `[global]: Folder analyzer is running at https://localhost:${Port}`
        );
    });
}

const findRootHander = async (req, res, context) => {
    res.send("OK")
}

const errorHandler = (
    err: any,
    _req: any | null,
    res: any | null,
    _next: any
) => {
    const errMsg: string = '' + err ? err.message : 'Unknown error';
    logger.error(`[global]: Error catched: ${errMsg}.`);
    if (res) {
        res.status(400).send({
            status: 'error',
            message: errMsg,
        });
    }
};

const loggingResponse = (_: any, res: any, next: any) => {
    const send = res.send;
    res.send = function (...args: any) {
        if (args.length > 0) {
            logger.info(`  ↪ [${res.statusCode}]: ${args[0]}`);
        }
        send.call(res, ...args);
    } as any;
    next();
};

main()
