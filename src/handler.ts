import { Header } from '@polkadot/types/interfaces';
import { AppContext, Folder, logger, sleep } from './utils';

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

const ParserJobMaxCount = 20;
var parserJobCurrentCount = 0;
// Folder parser handler
export const folderParserHandler = async (context: AppContext, interval: number) => {
    do {
        try {
            for (const [_, folder] of newFolderMap) {
                if (parserJobCurrentCount < ParserJobMaxCount) {
                    parserJobCurrentCount = parserJobCurrentCount + 1;
                    folderParser(context, folder);
                    newFolderMap.delete(folder.cid);
                }
            }
        } catch (error) {
            logger.error(`[folderParserHandler] Error ${error}`)
        }
        await sleep(interval);
    } while (true);
}

const folderParser = async (context: AppContext, folder: Folder) => {
    logger.info(`[folderParserHandler] Parse ${folder.cid} folder start`);
    const links = await context.ipfs.linkCids(folder.cid);
    links.push(folder.cid);
    await context.mysql.insertOrUpgrade(folder.cid, folder.blockNum, links);
    parserJobCurrentCount = parserJobCurrentCount - 1;
    if (parserJobCurrentCount < 0) {
        parserJobCurrentCount = 0;
    }
    logger.info(`[folderParserHandler] Parse ${folder.cid} folder end`);
}

// API handler
export const findRootHander = async (req, res, context: AppContext) => {
    const cid = req.query.cid;
    if (cid) {
        const root = await context.mysql.getRoot(cid);
        if (root && root != "") {
            res.send(root);
        } else {
            res.status(404).send("Can't find root");
        }
    } else {
        res.status(400).send("Please give right cid");
    }
}
