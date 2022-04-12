import Config from './config';
import { ConnectionOptions } from 'typeorm';

const config: ConnectionOptions = {
    // @ts-ignore
    type: Config.Database.Type,
    host: Config.Database.Host,
    port: Config.Database.Port,
    username: Config.Database.Username,
    password: Config.Database.Password,
    database: Config.Database.Name,
    entities: [__dirname + '/../**/*.entity.js'],
	charset: Config.Database.Charset,
    synchronize: Config.Database.AutoSync,
    migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
    cli: {
        migrationsDir: 'src/migrations',
    }
};

export = config;