import Bluebird from 'bluebird';
import { createLogger, format, transports } from 'winston';
import ChainApi from './chain';
import IpfsApi from './ipfs';

export interface AppContext {
    chain: ChainApi;
    ipfs: IpfsApi;
}

export const sleep = (t: number): Promise<void> => Bluebird.delay(t);

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
