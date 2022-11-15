import * as mysql from 'mysql';
import { logger } from './utils';

const DBName = 'FolderAnalyzer';
const TableNameRoot = 'Root'

export default class MysqlApi {
    private connection: mysql.Connection;
    private user: string;
    private password: string;

    constructor(user: string, password: string) {
        this.user = user;
        this.password = password;
    }

    async connect() {
        this.connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: this.user,
            password: this.password
        });

        await this.connectPromise();
        logger.info(`[mysql] Connected`);
        var sql = `Create Database If Not Exists ${DBName} Character Set UTF8`
        await this.queryPromise(sql);
        logger.info(`[mysql] Database ${DBName} created`);
        await this.queryPromise(`use ${DBName}`);

        sql = `create table if not exists ${TableNameRoot}(
                    id int primary key auto_increment,
                    cid varchar(128) UNIQUE not null,
                    root varchar(128) not null,
                    block int not null
                )`;
        await this.queryPromise(sql);
        logger.info(`[mysql] Table ${TableNameRoot} created`);
    }

    connectPromise = async () => {
        return new Promise((resolve, reject) => {
            this.connection.connect(err => {
                if (err) {
                    reject(err);
                } else {
                    resolve("ok");
                }
            });
        });
    };

    queryPromise = async (sql: string) => {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    };

    async insertOrUpgrade(root: string, block: number, links: string[]) {
        try {
            for (let index = 0; index < links.length; index++) {
                var sql = `insert into ${TableNameRoot} (cid, root, block)
                values ('${links[index]}', '${root}', ${block})
                on duplicate key
                update root='${root}', block=${block}`;
                await this.queryPromise(sql);
            }
        } catch (error) {
            logger.error(`[mysql] Insert or upgrade error: ${error}`);
        }
    }

    async getRoot(cid: string): Promise<string> {
        var res = "";
        try {
            var sql = `select * from ${TableNameRoot} where cid = '${cid}'`;
            const result = await this.queryPromise(sql);
            if (result && result[0]) {
                res = result[0].root;
            }
        } catch (error) {
            logger.error(`[mysql] Get root error: ${error}`);
        }
        return res;
    }

    end() {
        this.connection.end();
    }
}
