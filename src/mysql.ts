import * as mysql from 'mysql';
import { logger } from './utils';

const DBName = 'FolderAnalyzer';
const TableNameRoot = 'Root'

export default class MysqlApi {
    private pool: mysql.Pool;
    private user: string;
    private password: string;

    constructor(user: string, password: string) {
        this.user = user;
        this.password = password;
    }

    async connect() {
        this.pool = mysql.createPool({
            connectionLimit: 10,
            host: '127.0.0.1',
            user: this.user,
            password: this.password,
            database: `${DBName}`
        });

        let sql = `create table if not exists ${TableNameRoot}(
                    id int primary key auto_increment,
                    cid varchar(128) UNIQUE not null,
                    root varchar(128) not null,
                    block int not null
                )`;
        await this.queryPromise(sql);
        logger.info(`[mysql] Table ${TableNameRoot} created`);
    }

    executeQuery = function (query, callback) {
        this.pool.getConnection(function (err, connection) {
            if (err) {
                connection.release();
                throw err;
            }
            connection.query(query, function (err, rows) {
                connection.release();
                if (!err) {
                    callback(null, { rows: rows });
                }
            });
            connection.on('error', function (err) {
                throw err;
            });
        });
    }

    queryPromise = async (sql: string) => {
        return new Promise((resolve, reject) => {
            this.executeQuery(sql, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result.rows);
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
}
