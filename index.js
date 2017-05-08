import Koa from 'koa';
import _ from 'koa-route';

import config from '~/lib/config';
// import { respondToMessages } from '~/lib/session';

const app = new Koa();

app.use(_.get('/', (ctx) => {
    ctx.body = 'ok';
}));

app.use(_.post('/flowbot', (ctx) => {
    console.log(ctx.request);
    ctx.body = 'post';
}));

app.listen(config.port || 3000);
