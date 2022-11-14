import mysql from 'mysql2/promise';
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
            host: 'localhost',
            user: this.user,
            password: this.password
        });
        await this.connection.connect();
        logger.info(`[mysql] Connected`);

        var sql = `Create Database If Not Exists ${DBName} Character Set UTF8`
        await this.connection.query(sql);
        logger.info(`[mysql] Database ${DBName} created`);
        await this.connection.query(`use ${DBName}`);

        sql = `create table if not exists ${TableNameRoot}(
            id int primary key auto_increment,
            cid varchar(128) UNIQUE not null,
            root varchar(128) not null,
            block int not null
        )`;

        await this.connection.query(sql);
        logger.info(`[mysql] Table ${TableNameRoot} created`);
    }

    async insertOrUpgrade(root: string, block: number, links: string[]) {
        try {
            for (let index = 0; index < links.length; index++) {
                var sql = `insert into ${TableNameRoot} (cid, root, block)
                values ('${links[index]}', '${root}', ${block})
                on duplicate key
                update root='${root}', block=${block}`;
                await this.connection.execute(sql);
            }
        } catch (error) {
            logger.error(`[mysql] Insert or upgrade error: ${error}`);
        }
    }

    async getRoot(cid: string): Promise<string> {
        var res = "";
        try {
            var sql = `select * from ${TableNameRoot} where cid = '${cid}'`;
            const [rows, _] = await this.connection.execute(sql);
            if (rows && rows[0]) {
                console.log(rows[0]); // For test
                res = rows[0].root;
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
