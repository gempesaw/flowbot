import { expect } from 'chai';
import td from 'testdouble';
import timers from 'testdouble-timers';
import bcsd from 'bounded-context-stuff-doer';

import deploy from '~/lib/commands/deploy';

timers.use(td);

describe('Deploy', () => {
    const context = 'context';
    const event = { content: `.deploy ${context}` };

    let clock;
    let current, newest, update, restart, validate;
    beforeEach(() => {
        current = td.replace(bcsd, 'current');
        newest = td.replace(bcsd, 'newest');
        update = td.replace(bcsd, 'update');
        restart = td.replace(bcsd, 'restart');
        validate = td.replace(bcsd, 'validateContext');

        td.when(bcsd.validateContext(context)).thenReturn(true);
    });

    afterEach(() => {
        deploy.cancel();
        td.reset();
    });

    it('should reject invalid contexts', async function () {
        td.when(bcsd.validateContext(context)).thenReturn(false);
        const res = await deploy.queue(event);
        expect(res).to.include('a valid context');
    });

    it('should only run one at a time', async function () {
        td.when(bcsd.current(context)).thenReturn('current');
        td.when(bcsd.newest(context)).thenReturn('newest');

        await deploy.queue(event);
        const failure = await deploy.queue(event);
        expect(failure).to.include('please wait');
    });

    it('should allow two deploys to run sequentially', async function () {
        td.when(bcsd.current(context)).thenReturn('current');
        td.when(bcsd.newest(context)).thenReturn('newest');

        clock = td.timers();
        const success1 = await deploy.queue(event);
        clock.tick(8001);
        const success2 = await deploy.queue(event);
        expect(success2).to.include('will be updated');
    });

    it('should respond with the current and newest build', async function () {
        td.when(bcsd.current(context)).thenReturn('current');
        td.when(bcsd.newest(context)).thenReturn('newest');

        const res = await deploy.queue(event);
        expect(res).to.include('Current Build: current');
        expect(res).to.include('Newest Build:  newest');
    });

    it('should do nothing when current is newest', async function () {
        td.when(bcsd.current(context)).thenReturn('newest');
        td.when(bcsd.newest(context)).thenReturn('newest');
        clock = td.timers();

        const res = await deploy.queue(event);
        clock.tick(8001);
        expect(res).to.include('already deployed');
        td.verify(bcsd.update(context, 'newest'), { times: 0});
    });

    describe('confirmation', () => {
        beforeEach(() => {
            clock = td.timers();
            td.when(newest(context)).thenReturn('newest');
        });

        it('should schedule an update for later', async function () {
            await deploy.queue(event);
            clock.tick(8001);
            td.verify(bcsd.update(context, 'newest'));
        });

        it('should send a restart', async function () {
            await deploy.deploy(context);
            td.verify(bcsd.restart(context));
        });
    });

    describe('cancellation', () => {
        beforeEach(() => {
            clock = td.timers();
            td.when(newest(context)).thenReturn('newest');
        });

        it('should not deploy', async function () {
            await deploy.queue(event);
            deploy.cancel();
            clock.tick(8001);
            td.verify(bcsd.update(context, 'newest'), { times: 0});
        });
    });

});
