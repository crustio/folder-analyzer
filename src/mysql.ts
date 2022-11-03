import mysql from 'mysql2/promise';
import { logger } from './utils';

const DBName = 'FolderAnalyzer';
const TableNameLinks = 'Links'

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
        let sql = `Create Database If Not Exists ${DBName} Character Set UTF8`
        await this.connection.query(sql);
        logger.info(`[mysql] Database ${DBName} created`);
    }

    async insert(root: string, links: string[]) {

    }

    end() {
        this.connection.end();
    }
}
