import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {accountRoutes} from "$shared/routes/accounts/AccountRoutes";
import {AccountSqlService} from "./sqlservices/accounts/AccountSqlSvc";

const app = new Hono()

app.use('*', cors({
    origin: ['http://localhost:3000', 'http://10.0.0.3:3000']
}));

// const packageService = new PackageSqlService();
// await readYamlToCommands(packageService, (_) => {})

const routes =
    app
        // .route('/commands', commandRoutes(packageService, writeCommandToYaml))
        // .route('/queries/packages', packageQryRoutes(packageService))

        .get('/', (c) => {
            return c.text('This is the Checquery web application.')
        })

        .get('/about', (c) => {
            return c.json({
                name: 'Checquery',
                version: 0.1
            })
        })

        .route('/accounts', accountRoutes(new AccountSqlService()))

export type AppType = typeof routes

export default {
    port: 3001,
    fetch: app.fetch,
}