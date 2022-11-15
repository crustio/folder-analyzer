import express, { NextFunction } from 'express';
import { Header } from '@polkadot/types/interfaces';
import timeout from 'connect-timeout';
import IpfsApi from './ipfs';
import { AppContext, logger } from './utils';
import ChainApi from './chain';
import MysqlApi from './mysql';
import { findRootHander, folderParserHandler, folderTxHander } from './handler';

// Read command line parameters
const APITimeout = '600s'
const ParserInterval = 6 * 1000; //6s
const DBUser = process.argv[2];
if (!DBUser) {
    logger.error(`[global]: Please provide DB user name`);
    process.exit(-1);
}
const DBpassword = process.argv[3];
if (!DBpassword) {
    logger.error(`[global]: Please provide DB password`);
    process.exit(-1);
}
const Port = process.argv[4] || 17635;
const Gateway = process.argv[5] || "https://crustwebsites.net";
const ChainEndpoint = process.argv[6] || "wss://rpc.crust.network";

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
    await chain.init();
    // Connect mysql
    const mysql = new MysqlApi(DBUser, DBpassword);
    await mysql.connect();

    // Context
    const context: AppContext = {
        chain,
        ipfs,
        mysql
    }

    // Log handler
    app.use(loggingResponse);
    // API timeout handler
    app.use(timeout(APITimeout));
    // Get routes
    app.get('/api/v1/root', (req, res) => findRootHander(req, res, context));
    // Error handler
    app.use(errorHandler);

    // Subscribe new heads
    context.chain.subscribeNewHeads((b: Header) => folderTxHander(b, context));
    // Start folder parser handler
    folderParserHandler(context, ParserInterval);

    // Start express
    app.listen(Number(Port), '0.0.0.0', () => {
        logger.info(
            `[global]: Folder analyzer is running at https://localhost:${Port}`
        );
    });
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
