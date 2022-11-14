import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { logger } from './utils';

const Auth = 'c3ViLTVGcXdqWW9MUXE5Z2NXSGM2azVZd3RuZHg3Q01pQ1FlS1N2THpYb2plZ3ZYY005bToweDIwZjYxODc5ODhiNjIxZjk3ZDQwNGZlZmMzZTQ5MWU5OTU0MWY5MzdjNDNiYWQyNWE3NGQ2OTRjMjA2NWYzODFkOTc5YmY0YTQzYmI3MGZlYzY1MzIwMGI2MmFhZmRiOWFjNzEwODc1YzlkMjhlYTJjNTA2ZDcyZDc1Y2RjNzA2'
const Timeout = 8000 * 1000; // 8000s

export default class IpfsApi {
    private readonly ipfs: IPFSHTTPClient;

    constructor(gateway: string) {
        this.ipfs = create({
            url: gateway + '/api/v0',
            headers: {
                authorization: 'Basic ' + Auth
            },
            timeout: Timeout
        });
        logger.info('[ipfs] Connected');
    }

    async linkCids(ipfsPath: string): Promise<string[]> {
        const cids = [];
        try {
            for await (const link of this.ipfs.ls(ipfsPath)) {
                cids.push(link.cid.toString());
            }
        } catch (error) {
            logger.error(`[ipfs] List links error: ${error}`);
        }
        return cids
    }
}
