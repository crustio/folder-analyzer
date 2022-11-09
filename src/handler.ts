import { Header } from '@polkadot/types/interfaces';
import { map } from 'bluebird';
import { AppContext, Folder, logger } from './utils';

const newFolderMap = new Map<string, Folder>();

// Folder tx handler
export const folderTxHander = async (header: Header, context: AppContext) => {
    try {
        logger.info(`[folderTxHander] Dealing with ${header.number.toNumber()} block`)
        const hash = await context.chain.getBlockHash(header.number.toNumber());
        const newFilesFolders = await context.chain.parseNewFolders(hash.toString(), header.number.toNumber());
        newFilesFolders.forEach(folder => {
            newFolderMap.set(folder.cid, folder);
        });
    } catch (error) {
        logger.error(`[folderTxHander] Error: ${error}`)
    }
}

// Folder parser handler
export const folderParserHandler = async (context: AppContext) {
    logger.info(`[folderParserHandler] Start..`)
}

// API handler
export const findRootHander = async (req, res, context: AppContext) => {
    res.send("OK")
}
