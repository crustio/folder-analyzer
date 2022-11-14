import Bluebird from 'bluebird';
import { createLogger, format, transports } from 'winston';
import ChainApi from './chain';
import IpfsApi from './ipfs';
import MysqlApi from './mysql';

export interface AppContext {
    chain: ChainApi;
    ipfs: IpfsApi;
    mysql: MysqlApi;
}

export interface Folder {
    cid: string;
    size: number;
    blockNum: number;
}

/**
 * Convert from hex to string
 * @param hex Hex string with prefix `0x`
 * @returns With string back
 */
export function hexToString(hex: string): string {
    return Buffer.from(hex.substring(2), 'hex').toString();
}

export const sleep = async (t: number): Promise<void> => {
    await Bluebird.delay(t);
}

export const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.colorize(),
        format.errors({ stack: true }),
        format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
    ),
    transports: [
        //
        // - Write to all logs with level `info` and below to `crust-api-combined.log`.
        // - Write all logs error (and below) to `crust-api-error.log`.
        //
        new transports.Console(),
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' }),
    ],
});
