"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SYNTH_OPTIONS = exports.IntegrationTest = exports.IntegrationTests = void 0;
// Helper functions for integration tests
const assert = require("assert");
const child_process_1 = require("child_process");
const path = require("path");
const cx_api_1 = require("@aws-cdk/cx-api");
const cxapi = require("@aws-cdk/cx-api");
const fs = require("fs-extra");
const CDK_OUTDIR = 'cdk-integ.out';
const CDK_INTEG_STACK_PRAGMA = '/// !cdk-integ';
const PRAGMA_PREFIX = 'pragma:';
const SET_CONTEXT_PRAGMA_PREFIX = 'pragma:set-context:';
class IntegrationTests {
    constructor(directory) {
        this.directory = directory;
    }
    async fromCliArgs(tests) {
        let allTests = await this.discover();
        const all = allTests.map(x => x.name);
        let foundAll = true;
        if (tests && tests.length > 0) {
            // Pare down found tests to filter
            allTests = allTests.filter(t => tests.includes(t.name));
            const selectedNames = allTests.map(t => t.name);
            for (const unmatched of tests.filter(t => !selectedNames.includes(t))) {
                process.stderr.write(`No such integ test: ${unmatched}\n`);
                foundAll = false;
            }
        }
        if (!foundAll) {
            process.stderr.write(`Available tests: ${all.join(' ')}\n`);
            return [];
        }
        return allTests;
    }
    async discover() {
        const files = await this.readTree();
        const integs = files.filter(fileName => path.basename(fileName).startsWith('integ.') && path.basename(fileName).endsWith('.js'));
        return this.request(integs);
    }
    async request(files) {
        return files.map(fileName => new IntegrationTest(this.directory, fileName));
    }
    async readTree() {
        const ret = new Array();
        const rootDir = this.directory;
        async function recurse(dir) {
            const files = await fs.readdir(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const statf = await fs.stat(fullPath);
                if (statf.isFile()) {
                    ret.push(fullPath.slice(rootDir.length + 1));
                }
                if (statf.isDirectory()) {
                    await recurse(path.join(fullPath));
                }
            }
        }
        await recurse(this.directory);
        return ret;
    }
}
exports.IntegrationTests = IntegrationTests;
class IntegrationTest {
    constructor(directory, name) {
        this.directory = directory;
        this.name = name;
        const baseName = this.name.endsWith('.js') ? this.name.slice(0, -3) : this.name;
        this.expectedFileName = baseName + '.expected.json';
        this.expectedFilePath = path.join(this.directory, this.expectedFileName);
        this.sourceFilePath = path.join(this.directory, this.name);
        this.cdkContextPath = path.join(this.directory, 'cdk.context.json');
    }
    /**
     * Do a CDK synth, mimicking the CLI (without actually using it)
     *
     * The CLI has a pretty slow startup time because of all the modules it needs to load,
     * and we are running this in a tight loop. Bypass it to be quicker!
     *
     * Return the "main" template or a concatenation of all listed templates in the pragma
     */
    async cdkSynthFast(options = {}) {
        var _a;
        const context = {
            ...options.context,
        };
        // apply context from set-context pragma
        // usage: pragma:set-context:key=value
        const ctxPragmas = (await this.pragmas()).filter(p => p.startsWith(SET_CONTEXT_PRAGMA_PREFIX));
        for (const p of ctxPragmas) {
            const instruction = p.substring(SET_CONTEXT_PRAGMA_PREFIX.length);
            const [key, value] = instruction.split('=');
            if (key == null || value == null) {
                throw new Error(`invalid "set-context" pragma syntax. example: "pragma:set-context:@aws-cdk/core:newStyleStackSynthesis=true" got: ${p}`);
            }
            context[key] = value;
        }
        try {
            await exec(['node', `${this.name}`], {
                cwd: this.directory,
                env: {
                    ...options.env,
                    CDK_CONTEXT_JSON: JSON.stringify(context),
                    CDK_DEFAULT_ACCOUNT: '12345678',
                    CDK_DEFAULT_REGION: 'test-region',
                    CDK_OUTDIR,
                    CDK_CLI_ASM_VERSION: '5.0.0',
                },
            });
            // Interpret the cloud assembly directly here. Not great, but I'm wary
            // adding dependencies on the libraries that model it.
            //
            // FIXME: Refactor later if it doesn't introduce dependency cycles
            const cloudManifest = await fs.readJSON(path.resolve(this.directory, CDK_OUTDIR, 'manifest.json'));
            const stacks = {};
            for (const [artifactId, artifact] of Object.entries((_a = cloudManifest.artifacts) !== null && _a !== void 0 ? _a : {})) {
                if (artifact.type !== 'aws:cloudformation:stack') {
                    continue;
                }
                const template = await fs.readJSON(path.resolve(this.directory, CDK_OUTDIR, artifact.properties.templateFile));
                stacks[artifactId] = template;
            }
            const stacksToDiff = await this.readStackPragma();
            if (stacksToDiff.length > 0) {
                // This is a monster. I'm sorry. :(
                const templates = stacksToDiff.length === 1 && stacksToDiff[0] === '*'
                    ? Object.values(stacks)
                    : stacksToDiff.map(templateForStackName);
                // We're supposed to just return *a* template (which is an object), but there's a crazy
                // case in which we diff multiple templates at once and then they're an array. And it works somehow.
                return templates.length === 1 ? templates[0] : templates;
            }
            else {
                const names = Object.keys(stacks);
                if (names.length !== 1) {
                    throw new Error('"cdk-integ" can only operate on apps with a single stack.\n\n' +
                        '  If your app has multiple stacks, specify which stack to select by adding this to your test source:\n\n' +
                        `      ${CDK_INTEG_STACK_PRAGMA} STACK ...\n\n` +
                        `  Available stacks: ${names.join(' ')} (wildcards are also supported)\n`);
                }
                return stacks[names[0]];
            }
            function templateForStackName(name) {
                if (!stacks[name]) {
                    throw new Error(`No such stack in output: ${name}`);
                }
                return stacks[name];
            }
        }
        finally {
            this.cleanupTemporaryFiles();
        }
    }
    /**
     * Invoke the CDK CLI with some options
     */
    async invokeCli(args, options = {}) {
        // Write context to cdk.json, afterwards delete. We need to do this because there is no way
        // to pass structured context data from the command-line, currently.
        if (options.context) {
            await this.writeCdkContext(options.context);
        }
        else {
            this.cleanupTemporaryFiles();
        }
        const cliSwitches = [
            // This would otherwise trip on every version update
            '--no-version-reporting',
            // don't inject cloudformation metadata into template
            '--no-path-metadata',
            '--no-asset-metadata',
            // save a copy step by not staging assets
            '--no-staging',
            // Different output directory
            '-o', CDK_OUTDIR,
        ];
        try {
            const cdk = require.resolve('aws-cdk/bin/cdk');
            return exec([cdk, '-a', `node ${this.name}`, ...cliSwitches, ...args], {
                cwd: this.directory,
                json: options.json,
                verbose: options.verbose,
                env: options.env,
            });
        }
        finally {
            this.cleanupTemporaryFiles();
        }
    }
    hasExpected() {
        return fs.existsSync(this.expectedFilePath);
    }
    /**
     * Returns the single test stack to use.
     *
     * If the test has a single stack, it will be chosen. Otherwise a pragma is expected within the
     * test file the name of the stack:
     *
     * @example
     *
     *    /// !cdk-integ <stack-name>
     *
     */
    async determineTestStack() {
        const pragma = (await this.readStackPragma());
        if (pragma.length > 0) {
            return pragma;
        }
        const stacks = (await this.invokeCli(['ls'], { ...exports.DEFAULT_SYNTH_OPTIONS })).split('\n');
        if (stacks.length !== 1) {
            throw new Error('"cdk-integ" can only operate on apps with a single stack.\n\n' +
                '  If your app has multiple stacks, specify which stack to select by adding this to your test source:\n\n' +
                `      ${CDK_INTEG_STACK_PRAGMA} STACK ...\n\n` +
                `  Available stacks: ${stacks.join(' ')} (wildcards are also supported)\n`);
        }
        return stacks;
    }
    async readExpected() {
        return JSON.parse(await fs.readFile(this.expectedFilePath, { encoding: 'utf-8' }));
    }
    /**
     * Write the expected JSON to the given file
     *
     * Only write the file if the evaluated contents of the JSON are actually
     * different. This prevents silly diffs where different JSON stringifications
     * lead to different spacings or ordering, even if nothing actually changed in
     * the file.
     */
    async writeExpected(actual) {
        if (await fs.pathExists(this.expectedFilePath)) {
            const original = await fs.readJson(this.expectedFilePath);
            if (deepEqual(original, actual)) {
                return; // Nothing to do
            }
        }
        await fs.writeFile(this.expectedFilePath, JSON.stringify(actual, undefined, 2), { encoding: 'utf-8' });
    }
    /**
     * Return the non-stack pragmas
     *
     * These are all pragmas that start with "pragma:".
     *
     * For backwards compatibility reasons, all pragmas that DON'T start with this
     * string are considered to be stack names.
     */
    async pragmas() {
        return (await this.readIntegPragma()).filter(p => p.startsWith(PRAGMA_PREFIX));
    }
    async writeCdkContext(config) {
        await fs.writeFile(this.cdkContextPath, JSON.stringify(config, undefined, 2), { encoding: 'utf-8' });
    }
    cleanupTemporaryFiles() {
        if (fs.existsSync(this.cdkContextPath)) {
            fs.unlinkSync(this.cdkContextPath);
        }
        const cdkOutPath = path.join(this.directory, CDK_OUTDIR);
        if (fs.existsSync(cdkOutPath)) {
            fs.removeSync(cdkOutPath);
        }
    }
    /**
     * Reads stack names from the "!cdk-integ" pragma.
     *
     * Every word that's NOT prefixed by "pragma:" is considered a stack name.
     *
     * @example
     *
     *    /// !cdk-integ <stack-name>
     */
    async readStackPragma() {
        return (await this.readIntegPragma()).filter(p => !p.startsWith(PRAGMA_PREFIX));
    }
    /**
     * Read arbitrary cdk-integ pragma directives
     *
     * Reads the test source file and looks for the "!cdk-integ" pragma. If it exists, returns it's
     * contents. This allows integ tests to supply custom command line arguments to "cdk deploy" and "cdk synth".
     *
     * @example
     *
     *    /// !cdk-integ [...]
     */
    async readIntegPragma() {
        const source = await fs.readFile(this.sourceFilePath, { encoding: 'utf-8' });
        const pragmaLine = source.split('\n').find(x => x.startsWith(CDK_INTEG_STACK_PRAGMA + ' '));
        if (!pragmaLine) {
            return [];
        }
        const args = pragmaLine.substring(CDK_INTEG_STACK_PRAGMA.length).trim().split(' ');
        if (args.length === 0) {
            throw new Error(`Invalid syntax for cdk-integ pragma. Usage: "${CDK_INTEG_STACK_PRAGMA} [STACK] [pragma:PRAGMA] [...]"`);
        }
        return args;
    }
}
exports.IntegrationTest = IntegrationTest;
const futureFlags = {};
Object.entries(cxapi.FUTURE_FLAGS)
    .filter(([k, _]) => !cxapi.FUTURE_FLAGS_EXPIRED.includes(k))
    .forEach(([k, v]) => futureFlags[k] = v);
// Default context we run all integ tests with, so they don't depend on the
// account of the exercising user.
exports.DEFAULT_SYNTH_OPTIONS = {
    context: {
        // use old-style synthesis in snapshot tests
        [cxapi.NEW_STYLE_STACK_SYNTHESIS_CONTEXT]: false,
        [cxapi.AVAILABILITY_ZONE_FALLBACK_CONTEXT_KEY]: ['test-region-1a', 'test-region-1b', 'test-region-1c'],
        'availability-zones:account=12345678:region=test-region': ['test-region-1a', 'test-region-1b', 'test-region-1c'],
        'ssm:account=12345678:parameterName=/aws/service/ami-amazon-linux-latest/amzn-ami-hvm-x86_64-gp2:region=test-region': 'ami-1234',
        'ssm:account=12345678:parameterName=/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2:region=test-region': 'ami-1234',
        'ssm:account=12345678:parameterName=/aws/service/ecs/optimized-ami/amazon-linux/recommended:region=test-region': '{"image_id": "ami-1234"}',
        // eslint-disable-next-line max-len
        'ami:account=12345678:filters.image-type.0=machine:filters.name.0=amzn-ami-vpc-nat-*:filters.state.0=available:owners.0=amazon:region=test-region': 'ami-1234',
        'vpc-provider:account=12345678:filter.isDefault=true:region=test-region:returnAsymmetricSubnets=true': {
            vpcId: 'vpc-60900905',
            subnetGroups: [
                {
                    type: 'Public',
                    name: 'Public',
                    subnets: [
                        {
                            subnetId: 'subnet-e19455ca',
                            availabilityZone: 'us-east-1a',
                            routeTableId: 'rtb-e19455ca',
                        },
                        {
                            subnetId: 'subnet-e0c24797',
                            availabilityZone: 'us-east-1b',
                            routeTableId: 'rtb-e0c24797',
                        },
                        {
                            subnetId: 'subnet-ccd77395',
                            availabilityZone: 'us-east-1c',
                            routeTableId: 'rtb-ccd77395',
                        },
                    ],
                },
            ],
        },
        // Restricting to these target partitions makes most service principals synthesize to
        // `service.${URL_SUFFIX}`, which is technically *incorrect* (it's only `amazonaws.com`
        // or `amazonaws.com.cn`, never UrlSuffix for any of the restricted regions) but it's what
        // most existing integ tests contain, and we want to disturb as few as possible.
        [cx_api_1.TARGET_PARTITIONS]: ['aws', 'aws-cn'],
        ...futureFlags,
    },
    env: {
        CDK_INTEG_ACCOUNT: '12345678',
        CDK_INTEG_REGION: 'test-region',
    },
};
/**
 * Our own execute function which doesn't use shells and strings.
 */
function exec(commandLine, options = {}) {
    const proc = child_process_1.spawnSync(commandLine[0], commandLine.slice(1), {
        stdio: ['ignore', 'pipe', options.verbose ? 'inherit' : 'pipe'],
        env: {
            ...process.env,
            CDK_INTEG_MODE: '1',
            ...options.env,
        },
        cwd: options.cwd,
    });
    if (proc.error) {
        throw proc.error;
    }
    if (proc.status !== 0) {
        if (process.stderr) { // will be 'null' in verbose mode
            process.stderr.write(proc.stderr);
        }
        throw new Error(`Command exited with ${proc.status ? `status ${proc.status}` : `signal ${proc.signal}`}`);
    }
    const output = proc.stdout.toString('utf-8').trim();
    try {
        if (options.json) {
            if (output.length === 0) {
                return {};
            }
            return JSON.parse(output);
        }
        return output;
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error('Not JSON: ' + output);
        throw new Error('Command output is not JSON');
    }
}
function deepEqual(a, b) {
    try {
        assert.deepEqual(a, b);
        return true;
    }
    catch (e) {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWctaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludGVnLWhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEseUNBQXlDO0FBQ3pDLGlDQUFpQztBQUNqQyxpREFBMEM7QUFDMUMsNkJBQTZCO0FBQzdCLDRDQUFvRDtBQUNwRCx5Q0FBeUM7QUFDekMsK0JBQStCO0FBRS9CLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQztBQUVuQyxNQUFNLHNCQUFzQixHQUFHLGdCQUFnQixDQUFDO0FBQ2hELE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQztBQUNoQyxNQUFNLHlCQUF5QixHQUFHLHFCQUFxQixDQUFDO0FBRXhELE1BQWEsZ0JBQWdCO0lBQzNCLFlBQTZCLFNBQWlCO1FBQWpCLGNBQVMsR0FBVCxTQUFTLENBQVE7SUFDOUMsQ0FBQztJQUVNLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBZ0I7UUFDdkMsSUFBSSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDckMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFFcEIsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDN0Isa0NBQWtDO1lBQ2xDLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUV4RCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELEtBQUssTUFBTSxTQUFTLElBQUksS0FBSyxDQUFDLE1B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QUksRUFBRSxDQUFDO0lBRXBELElBQUk7UUFDRixJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDaEIsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFBRSxPQUFPLEVBQUUsQ0FBQzthQUFFO1lBRXZDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUMzQjtRQUNELE9BQU8sTUFBTSxDQUFDO0tBQ2Y7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsQ0FBQztRQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7S0FDL0M7QUFDSCxDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsQ0FBTSxFQUFFLENBQU07SUFDL0IsSUFBSTtRQUNGLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gSGVscGVyIGZ1bmN0aW9ucyBmb3IgaW50ZWdyYXRpb24gdGVzdHNcbmltcG9ydCAqIGFzIGFzc2VydCBmcm9tICdhc3NlcnQnO1xuaW1wb3J0IHsgc3Bhd25TeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgVEFSR0VUX1BBUlRJVElPTlMgfSBmcm9tICdAYXdzLWNkay9jeC1hcGknO1xuaW1wb3J0ICogYXMgY3hhcGkgZnJvbSAnQGF3cy1jZGsvY3gtYXBpJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcblxuY29uc3QgQ0RLX09VVERJUiA9ICdjZGstaW50ZWcub3V0JztcblxuY29uc3QgQ0RLX0lOVEVHX1NUQUNLX1BSQUdNQSA9ICcvLy8gIWNkay1pbnRlZyc7XG5jb25zdCBQUkFHTUFfUFJFRklYID0gJ3ByYWdtYTonO1xuY29uc3QgU0VUX0NPTlRFWFRfUFJBR01BX1BSRUZJWCA9ICdwcmFnbWE6c2V0LWNvbnRleHQ6JztcblxuZXhwb3J0IGNsYXNzIEludGVncmF0aW9uVGVzdHMge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGRpcmVjdG9yeTogc3RyaW5nKSB7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZnJvbUNsaUFyZ3ModGVzdHM/OiBzdHJpbmdbXSk6IFByb21pc2U8SW50ZWdyYXRpb25UZXN0W10+IHtcbiAgICBsZXQgYWxsVGVzdHMgPSBhd2FpdCB0aGlzLmRpc2NvdmVyKCk7XG4gICAgY29uc3QgYWxsID0gYWxsVGVzdHMubWFwKHggPT4geC5uYW1lKTtcbiAgICBsZXQgZm91bmRBbGwgPSB0cnVlO1xuXG4gICAgaWYgKHRlc3RzICYmIHRlc3RzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIFBhcmUgZG93biBmb3VuZCB0ZXN0cyB0byBmaWx0ZXJcbiAgICAgIGFsbFRlc3RzID0gYWxsVGVzdHMuZmlsdGVyKHQgPT4gdGVzdHMuaW5jbHVkZXModC5uYW1lKSk7XG5cbiAgICAgIGNvbnN0IHNlbGVjdGVkTmFtZXMgPSBhbGxUZXN0cy5tYXAodCA9PiB0Lm5hbWUpO1xuICAgICAgZm9yIChjb25zdCB1bm1hdGNoZWQgb2YgdGVzdHMuZmlsdGVyKHQgPT4gIXNlbGVjdGVkTmFtZXMuaW5jbHVkZXModCkpKSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBObyBzdWNoIGludGVnIHRlc3Q6ICR7dW5tYXRjaGVkfVxcbmApO1xuICAgICAgICBmb3VuZEFsbCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghZm91bmRBbGwpIHtcbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBBdmFpbGFibGUgdGVzdHM6ICR7YWxsLmpvaW4oJyAnKX1cXG5gKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWxsVGVzdHM7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZGlzY292ZXIoKTogUHJvbWlzZTxJbnRlZ3JhdGlvblRlc3RbXT4ge1xuICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgdGhpcy5yZWFkVHJlZSgpO1xuICAgIGNvbnN0IGludGVncyA9IGZpbGVzLmZpbHRlcihmaWxlTmFtZSA9PiBwYXRoLmJhc2VuYW1lKGZpbGVOYW1lKS5zdGFydHNXaXRoKCdpbnRlZy4nKSAmJiBwYXRoLmJhc2VuYW1lKGZpbGVOYW1lKS5lbmRzV2l0aCgnLmpzJykpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoaW50ZWdzKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZXF1ZXN0KGZpbGVzOiBzdHJpbmdbXSk6IFByb21pc2U8SW50ZWdyYXRpb25UZXN0W10+IHtcbiAgICByZXR1cm4gZmlsZXMubWFwKGZpbGVOYW1lID0+IG5ldyBJbnRlZ3JhdGlvblRlc3QodGhpcy5kaXJlY3RvcnksIGZpbGVOYW1lKSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlYWRUcmVlKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCByZXQgPSBuZXcgQXJyYXk8c3RyaW5nPigpO1xuXG4gICAgY29uc3Qgcm9vdERpciA9IHRoaXMuZGlyZWN0b3J5O1xuXG4gICAgYXN5bmMgZnVuY3Rpb24gcmVjdXJzZShkaXI6IHN0cmluZykge1xuICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCBmcy5yZWFkZGlyKGRpcik7XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyLCBmaWxlKTtcbiAgICAgICAgY29uc3Qgc3RhdGYgPSBhd2FpdCBmcy5zdGF0KGZ1bGxQYXRoKTtcbiAgICAgICAgaWYgKHN0YXRmLmlzRmlsZSgpKSB7IHJldC5wdXNoKGZ1bGxQYXRoLnNsaWNlKHJvb3REaXIubGVuZ3RoICsgMSkpOyB9XG4gICAgICAgIGlmIChzdGF0Zi5pc0RpcmVjdG9yeSgpKSB7IGF3YWl0IHJlY3Vyc2UocGF0aC5qb2luKGZ1bGxQYXRoKSk7IH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCByZWN1cnNlKHRoaXMuZGlyZWN0b3J5KTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3ludGhPcHRpb25zIHtcbiAgcmVhZG9ubHkgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIGFueT47XG4gIHJlYWRvbmx5IGVudj86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRlZ3JhdGlvblRlc3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgZXhwZWN0ZWRGaWxlTmFtZTogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IGV4cGVjdGVkRmlsZVBhdGg6IHN0cmluZztcbiAgcHJpdmF0ZSByZWFkb25seSBjZGtDb250ZXh0UGF0aDogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IHNvdXJjZUZpbGVQYXRoOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBkaXJlY3Rvcnk6IHN0cmluZywgcHVibGljIHJlYWRvbmx5IG5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IGJhc2VOYW1lID0gdGhpcy5uYW1lLmVuZHNXaXRoKCcuanMnKSA/IHRoaXMubmFtZS5zbGljZSgwLCAtMykgOiB0aGlzLm5hbWU7XG4gICAgdGhpcy5leHBlY3RlZEZpbGVOYW1lID0gYmFzZU5hbWUgKyAnLmV4cGVjdGVkLmpzb24nO1xuICAgIHRoaXMuZXhwZWN0ZWRGaWxlUGF0aCA9IHBhdGguam9pbih0aGlzLmRpcmVjdG9yeSwgdGhpcy5leHBlY3RlZEZpbGVOYW1lKTtcbiAgICB0aGlzLnNvdXJjZUZpbGVQYXRoID0gcGF0aC5qb2luKHRoaXMuZGlyZWN0b3J5LCB0aGlzLm5hbWUpO1xuICAgIHRoaXMuY2RrQ29udGV4dFBhdGggPSBwYXRoLmpvaW4odGhpcy5kaXJlY3RvcnksICdjZGsuY29udGV4dC5qc29uJyk7XG4gIH1cblxuICAvKipcbiAgICogRG8gYSBDREsgc3ludGgsIG1pbWlja2luZyB0aGUgQ0xJICh3aXRob3V0IGFjdHVhbGx5IHVzaW5nIGl0KVxuICAgKlxuICAgKiBUaGUgQ0xJIGhhcyBhIHByZXR0eSBzbG93IHN0YXJ0dXAgdGltZSBiZWNhdXNlIG9mIGFsbCB0aGUgbW9kdWxlcyBpdCBuZWVkcyB0byBsb2FkLFxuICAgKiBhbmQgd2UgYXJlIHJ1bm5pbmcgdGhpcyBpbiBhIHRpZ2h0IGxvb3AuIEJ5cGFzcyBpdCB0byBiZSBxdWlja2VyIVxuICAgKlxuICAgKiBSZXR1cm4gdGhlIFwibWFpblwiIHRlbXBsYXRlIG9yIGEgY29uY2F0ZW5hdGlvbiBvZiBhbGwgbGlzdGVkIHRlbXBsYXRlcyBpbiB0aGUgcHJhZ21hXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgY2RrU3ludGhGYXN0KG9wdGlvbnM6IFN5bnRoT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCBjb250ZXh0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgLi4ub3B0aW9ucy5jb250ZXh0LFxuICAgIH07XG5cbiAgICAvLyBhcHBseSBjb250ZXh0IGZyb20gc2V0LWNvbnRleHQgcHJhZ21hXG4gICAgLy8gdXNhZ2U6IHByYWdtYTpzZXQtY29udGV4dDprZXk9dmFsdWVcbiAgICBjb25zdCBjdHhQcmFnbWFzID0gKGF3YWl0IHRoaXMucHJhZ21hcygpKS5maWx0ZXIocCA9PiBwLnN0YXJ0c1dpdGgoU0VUX0NPTlRFWFRfUFJBR01BX1BSRUZJWCkpO1xuICAgIGZvciAoY29uc3QgcCBvZiBjdHhQcmFnbWFzKSB7XG4gICAgICBjb25zdCBpbnN0cnVjdGlvbiA9IHAuc3Vic3RyaW5nKFNFVF9DT05URVhUX1BSQUdNQV9QUkVGSVgubGVuZ3RoKTtcbiAgICAgIGNvbnN0IFtrZXksIHZhbHVlXSA9IGluc3RydWN0aW9uLnNwbGl0KCc9Jyk7XG4gICAgICBpZiAoa2V5ID09IG51bGwgfHwgdmFsdWUgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgXCJzZXQtY29udGV4dFwiIHByYWdtYSBzeW50YXguIGV4YW1wbGU6IFwicHJhZ21hOnNldC1jb250ZXh0OkBhd3MtY2RrL2NvcmU6bmV3U3R5bGVTdGFja1N5bnRoZXNpcz10cnVlXCIgZ290OiAke3B9YCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnRleHRba2V5XSA9IHZhbHVlO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGVjKFsnbm9kZScsIGAke3RoaXMubmFtZX1gXSwge1xuICAgICAgICBjd2Q6IHRoaXMuZGlyZWN0b3J5LFxuICAgICAgICBlbnY6IHtcbiAgICAgICAgICAuLi5vcHRpb25zLmVudixcbiAgICAgICAgICBDREtfQ09OVEVYVF9KU09OOiBKU09OLnN0cmluZ2lmeShjb250ZXh0KSxcbiAgICAgICAgICBDREtfREVGQVVMVF9BQ0NPVU5UOiAnMTIzNDU2NzgnLFxuICAgICAgICAgIENES19ERUZBVUxUX1JFR0lPTjogJ3Rlc3QtcmVnaW9uJyxcbiAgICAgICAgICBDREtfT1VURElSLFxuICAgICAgICAgIENES19DTElfQVNNX1ZFUlNJT046ICc1LjAuMCcsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgLy8gSW50ZXJwcmV0IHRoZSBjbG91ZCBhc3NlbWJseSBkaXJlY3RseSBoZXJlLiBOb3QgZ3JlYXQsIGJ1dCBJJ20gd2FyeVxuICAgICAgLy8gYWRkaW5nIGRlcGVuZGVuY2llcyBvbiB0aGUgbGlicmFyaWVzIHRoYXQgbW9kZWwgaXQuXG4gICAgICAvL1xuICAgICAgLy8gRklYTUU6IFJlZmFjdG9yIGxhdGVyIGlmIGl0IGRvZXNuJ3QgaW50cm9kdWNlIGRlcGVuZGVuY3kgY3ljbGVzXG4gICAgICBjb25zdCBjbG91ZE1hbmlmZXN0ID0gYXdhaXQgZnMucmVhZEpTT04ocGF0aC5yZXNvbHZlKHRoaXMuZGlyZWN0b3J5LCBDREtfT1VURElSLCAnbWFuaWZlc3QuanNvbicpKTtcbiAgICAgIGNvbnN0IHN0YWNrczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgICAgZm9yIChjb25zdCBbYXJ0aWZhY3RJZCwgYXJ0aWZhY3RdIG9mIE9iamVjdC5lbnRyaWVzKGNsb3VkTWFuaWZlc3QuYXJ0aWZhY3RzID8/IHt9KSBhcyBBcnJheTxbc3RyaW5nLCBhbnldPikge1xuICAgICAgICBpZiAoYXJ0aWZhY3QudHlwZSAhPT0gJ2F3czpjbG91ZGZvcm1hdGlvbjpzdGFjaycpIHsgY29udGludWU7IH1cblxuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGF3YWl0IGZzLnJlYWRKU09OKHBhdGgucmVzb2x2ZSh0aGlzLmRpcmVjdG9yeSwgQ0RLX09VVERJUiwgYXJ0aWZhY3QucHJvcGVydGllcy50ZW1wbGF0ZUZpbGUpKTtcbiAgICAgICAgc3RhY2tzW2FydGlmYWN0SWRdID0gdGVtcGxhdGU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN0YWNrc1RvRGlmZiA9IGF3YWl0IHRoaXMucmVhZFN0YWNrUHJhZ21hKCk7XG5cbiAgICAgIGlmIChzdGFja3NUb0RpZmYubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBUaGlzIGlzIGEgbW9uc3Rlci4gSSdtIHNvcnJ5LiA6KFxuICAgICAgICBjb25zdCB0ZW1wbGF0ZXMgPSBzdGFja3NUb0RpZmYubGVuZ3RoID09PSAxICYmIHN0YWNrc1RvRGlmZlswXSA9PT0gJyonXG4gICAgICAgICAgPyBPYmplY3QudmFsdWVzKHN0YWNrcylcbiAgICAgICAgICA6IHN0YWNrc1RvRGlmZi5tYXAodGVtcGxhdGVGb3JTdGFja05hbWUpO1xuXG4gICAgICAgIC8vIFdlJ3JlIHN1cHBvc2VkIHRvIGp1c3QgcmV0dXJuICphKiB0ZW1wbGF0ZSAod2hpY2ggaXMgYW4gb2JqZWN0KSwgYnV0IHRoZXJlJ3MgYSBjcmF6eVxuICAgICAgICAvLyBjYXNlIGluIHdoaWNoIHdlIGRpZmYgbXVsdGlwbGUgdGVtcGxhdGVzIGF0IG9uY2UgYW5kIHRoZW4gdGhleSdyZSBhbiBhcnJheS4gQW5kIGl0IHdvcmtzIHNvbWVob3cuXG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZXMubGVuZ3RoID09PSAxID8gdGVtcGxhdGVzWzBdIDogdGVtcGxhdGVzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbmFtZXMgPSBPYmplY3Qua2V5cyhzdGFja3MpO1xuICAgICAgICBpZiAobmFtZXMubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcImNkay1pbnRlZ1wiIGNhbiBvbmx5IG9wZXJhdGUgb24gYXBwcyB3aXRoIGEgc2luZ2xlIHN0YWNrLlxcblxcbicgK1xuICAgICAgICAgICAgJyAgSWYgeW91ciBhcHAgaGFzIG11bHRpcGxlIHN0YWNrcywgc3BlY2lmeSB3aGljaCBzdGFjayB0byBzZWxlY3QgYnkgYWRkaW5nIHRoaXMgdG8geW91ciB0ZXN0IHNvdXJjZTpcXG5cXG4nICtcbiAgICAgICAgICAgIGAgICAgICAke0NES19JTlRFR19TVEFDS19QUkFHTUF9IFNUQUNLIC4uLlxcblxcbmAgK1xuICAgICAgICAgICAgYCAgQXZhaWxhYmxlIHN0YWNrczogJHtuYW1lcy5qb2luKCcgJyl9ICh3aWxkY2FyZHMgYXJlIGFsc28gc3VwcG9ydGVkKVxcbmApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGFja3NbbmFtZXNbMF1dO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiB0ZW1wbGF0ZUZvclN0YWNrTmFtZShuYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKCFzdGFja3NbbmFtZV0pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhY2sgaW4gb3V0cHV0OiAke25hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YWNrc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5jbGVhbnVwVGVtcG9yYXJ5RmlsZXMoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW52b2tlIHRoZSBDREsgQ0xJIHdpdGggc29tZSBvcHRpb25zXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgaW52b2tlQ2xpKGFyZ3M6IHN0cmluZ1tdLCBvcHRpb25zOiB7IGpzb24/OiBib29sZWFuLCBjb250ZXh0PzogYW55LCB2ZXJib3NlPzogYm9vbGVhbiwgZW52PzogYW55IH0gPSB7IH0pOiBQcm9taXNlPGFueT4ge1xuICAgIC8vIFdyaXRlIGNvbnRleHQgdG8gY2RrLmpzb24sIGFmdGVyd2FyZHMgZGVsZXRlLiBXZSBuZWVkIHRvIGRvIHRoaXMgYmVjYXVzZSB0aGVyZSBpcyBubyB3YXlcbiAgICAvLyB0byBwYXNzIHN0cnVjdHVyZWQgY29udGV4dCBkYXRhIGZyb20gdGhlIGNvbW1hbmQtbGluZSwgY3VycmVudGx5LlxuICAgIGlmIChvcHRpb25zLmNvbnRleHQpIHtcbiAgICAgIGF3YWl0IHRoaXMud3JpdGVDZGtDb250ZXh0KG9wdGlvbnMuY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY2xlYW51cFRlbXBvcmFyeUZpbGVzKCk7XG4gICAgfVxuXG4gICAgY29uc3QgY2xpU3dpdGNoZXMgPSBbXG4gICAgICAvLyBUaGlzIHdvdWxkIG90aGVyd2lzZSB0cmlwIG9uIGV2ZXJ5IHZlcnNpb24gdXBkYXRlXG4gICAgICAnLS1uby12ZXJzaW9uLXJlcG9ydGluZycsXG4gICAgICAvLyBkb24ndCBpbmplY3QgY2xvdWRmb3JtYXRpb24gbWV0YWRhdGEgaW50byB0ZW1wbGF0ZVxuICAgICAgJy0tbm8tcGF0aC1tZXRhZGF0YScsXG4gICAgICAnLS1uby1hc3NldC1tZXRhZGF0YScsXG4gICAgICAvLyBzYXZlIGEgY29weSBzdGVwIGJ5IG5vdCBzdGFnaW5nIGFzc2V0c1xuICAgICAgJy0tbm8tc3RhZ2luZycsXG4gICAgICAvLyBEaWZmZXJlbnQgb3V0cHV0IGRpcmVjdG9yeVxuICAgICAgJy1vJywgQ0RLX09VVERJUixcbiAgICBdO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNkayA9IHJlcXVpcmUucmVzb2x2ZSgnYXdzLWNkay9iaW4vY2RrJyk7XG4gICAgICByZXR1cm4gZXhlYyhbY2RrLCAnLWEnLCBgbm9kZSAke3RoaXMubmFtZX1gLCAuLi5jbGlTd2l0Y2hlcywgLi4uYXJnc10sIHtcbiAgICAgICAgY3dkOiB0aGlzLmRpcmVjdG9yeSxcbiAgICAgICAganNvbjogb3B0aW9ucy5qc29uLFxuICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIGVudjogb3B0aW9ucy5lbnYsXG4gICAgICB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5jbGVhbnVwVGVtcG9yYXJ5RmlsZXMoKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgaGFzRXhwZWN0ZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZzLmV4aXN0c1N5bmModGhpcy5leHBlY3RlZEZpbGVQYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBzaW5nbGUgdGVzdCBzdGFjayB0byB1c2UuXG4gICAqXG4gICAqIElmIHRoZSB0ZXN0IGhhcyBhIHNpbmdsZSBzdGFjaywgaXQgd2lsbCBiZSBjaG9zZW4uIE90aGVyd2lzZSBhIHByYWdtYSBpcyBleHBlY3RlZCB3aXRoaW4gdGhlXG4gICAqIHRlc3QgZmlsZSB0aGUgbmFtZSBvZiB0aGUgc3RhY2s6XG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqICAgIC8vLyAhY2RrLWludGVnIDxzdGFjay1uYW1lPlxuICAgKlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGRldGVybWluZVRlc3RTdGFjaygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgcHJhZ21hID0gKGF3YWl0IHRoaXMucmVhZFN0YWNrUHJhZ21hKCkpO1xuICAgIGlmIChwcmFnbWEubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHByYWdtYTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGFja3MgPSAoYXdhaXQgdGhpcy5pbnZva2VDbGkoWydscyddLCB7IC4uLkRFRkFVTFRfU1lOVEhfT1BUSU9OUyB9KSkuc3BsaXQoJ1xcbicpO1xuICAgIGlmIChzdGFja3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wiY2RrLWludGVnXCIgY2FuIG9ubHkgb3BlcmF0ZSBvbiBhcHBzIHdpdGggYSBzaW5nbGUgc3RhY2suXFxuXFxuJyArXG4gICAgICAgICcgIElmIHlvdXIgYXBwIGhhcyBtdWx0aXBsZSBzdGFja3MsIHNwZWNpZnkgd2hpY2ggc3RhY2sgdG8gc2VsZWN0IGJ5IGFkZGluZyB0aGlzIHRvIHlvdXIgdGVzdCBzb3VyY2U6XFxuXFxuJyArXG4gICAgICAgIGAgICAgICAke0NES19JTlRFR19TVEFDS19QUkFHTUF9IFNUQUNLIC4uLlxcblxcbmAgK1xuICAgICAgICBgICBBdmFpbGFibGUgc3RhY2tzOiAke3N0YWNrcy5qb2luKCcgJyl9ICh3aWxkY2FyZHMgYXJlIGFsc28gc3VwcG9ydGVkKVxcbmApO1xuICAgIH1cblxuICAgIHJldHVybiBzdGFja3M7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVhZEV4cGVjdGVkKCk6IFByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoYXdhaXQgZnMucmVhZEZpbGUodGhpcy5leHBlY3RlZEZpbGVQYXRoLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZSB0aGUgZXhwZWN0ZWQgSlNPTiB0byB0aGUgZ2l2ZW4gZmlsZVxuICAgKlxuICAgKiBPbmx5IHdyaXRlIHRoZSBmaWxlIGlmIHRoZSBldmFsdWF0ZWQgY29udGVudHMgb2YgdGhlIEpTT04gYXJlIGFjdHVhbGx5XG4gICAqIGRpZmZlcmVudC4gVGhpcyBwcmV2ZW50cyBzaWxseSBkaWZmcyB3aGVyZSBkaWZmZXJlbnQgSlNPTiBzdHJpbmdpZmljYXRpb25zXG4gICAqIGxlYWQgdG8gZGlmZmVyZW50IHNwYWNpbmdzIG9yIG9yZGVyaW5nLCBldmVuIGlmIG5vdGhpbmcgYWN0dWFsbHkgY2hhbmdlZCBpblxuICAgKiB0aGUgZmlsZS5cbiAgICovXG4gIHB1YmxpYyBhc3luYyB3cml0ZUV4cGVjdGVkKGFjdHVhbDogYW55KSB7XG4gICAgaWYgKGF3YWl0IGZzLnBhdGhFeGlzdHModGhpcy5leHBlY3RlZEZpbGVQYXRoKSkge1xuICAgICAgY29uc3Qgb3JpZ2luYWwgPSBhd2FpdCBmcy5yZWFkSnNvbih0aGlzLmV4cGVjdGVkRmlsZVBhdGgpO1xuICAgICAgaWYgKGRlZXBFcXVhbChvcmlnaW5hbCwgYWN0dWFsKSkge1xuICAgICAgICByZXR1cm47IC8vIE5vdGhpbmcgdG8gZG9cbiAgICAgIH1cbiAgICB9XG4gICAgYXdhaXQgZnMud3JpdGVGaWxlKHRoaXMuZXhwZWN0ZWRGaWxlUGF0aCwgSlNPTi5zdHJpbmdpZnkoYWN0dWFsLCB1bmRlZmluZWQsIDIpLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgbm9uLXN0YWNrIHByYWdtYXNcbiAgICpcbiAgICogVGhlc2UgYXJlIGFsbCBwcmFnbWFzIHRoYXQgc3RhcnQgd2l0aCBcInByYWdtYTpcIi5cbiAgICpcbiAgICogRm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHJlYXNvbnMsIGFsbCBwcmFnbWFzIHRoYXQgRE9OJ1Qgc3RhcnQgd2l0aCB0aGlzXG4gICAqIHN0cmluZyBhcmUgY29uc2lkZXJlZCB0byBiZSBzdGFjayBuYW1lcy5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBwcmFnbWFzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICByZXR1cm4gKGF3YWl0IHRoaXMucmVhZEludGVnUHJhZ21hKCkpLmZpbHRlcihwID0+IHAuc3RhcnRzV2l0aChQUkFHTUFfUFJFRklYKSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHdyaXRlQ2RrQ29udGV4dChjb25maWc6IGFueSkge1xuICAgIGF3YWl0IGZzLndyaXRlRmlsZSh0aGlzLmNka0NvbnRleHRQYXRoLCBKU09OLnN0cmluZ2lmeShjb25maWcsIHVuZGVmaW5lZCwgMiksIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSk7XG4gIH1cblxuICBwcml2YXRlIGNsZWFudXBUZW1wb3JhcnlGaWxlcygpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyh0aGlzLmNka0NvbnRleHRQYXRoKSkge1xuICAgICAgZnMudW5saW5rU3luYyh0aGlzLmNka0NvbnRleHRQYXRoKTtcbiAgICB9XG5cbiAgICBjb25zdCBjZGtPdXRQYXRoID0gcGF0aC5qb2luKHRoaXMuZGlyZWN0b3J5LCBDREtfT1VURElSKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjZGtPdXRQYXRoKSkge1xuICAgICAgZnMucmVtb3ZlU3luYyhjZGtPdXRQYXRoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVhZHMgc3RhY2sgbmFtZXMgZnJvbSB0aGUgXCIhY2RrLWludGVnXCIgcHJhZ21hLlxuICAgKlxuICAgKiBFdmVyeSB3b3JkIHRoYXQncyBOT1QgcHJlZml4ZWQgYnkgXCJwcmFnbWE6XCIgaXMgY29uc2lkZXJlZCBhIHN0YWNrIG5hbWUuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqICAgIC8vLyAhY2RrLWludGVnIDxzdGFjay1uYW1lPlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyByZWFkU3RhY2tQcmFnbWEoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIHJldHVybiAoYXdhaXQgdGhpcy5yZWFkSW50ZWdQcmFnbWEoKSkuZmlsdGVyKHAgPT4gIXAuc3RhcnRzV2l0aChQUkFHTUFfUFJFRklYKSk7XG4gIH1cblxuICAvKipcbiAgICogUmVhZCBhcmJpdHJhcnkgY2RrLWludGVnIHByYWdtYSBkaXJlY3RpdmVzXG4gICAqXG4gICAqIFJlYWRzIHRoZSB0ZXN0IHNvdXJjZSBmaWxlIGFuZCBsb29rcyBmb3IgdGhlIFwiIWNkay1pbnRlZ1wiIHByYWdtYS4gSWYgaXQgZXhpc3RzLCByZXR1cm5zIGl0J3NcbiAgICogY29udGVudHMuIFRoaXMgYWxsb3dzIGludGVnIHRlc3RzIHRvIHN1cHBseSBjdXN0b20gY29tbWFuZCBsaW5lIGFyZ3VtZW50cyB0byBcImNkayBkZXBsb3lcIiBhbmQgXCJjZGsgc3ludGhcIi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogICAgLy8vICFjZGstaW50ZWcgWy4uLl1cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcmVhZEludGVnUHJhZ21hKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCBzb3VyY2UgPSBhd2FpdCBmcy5yZWFkRmlsZSh0aGlzLnNvdXJjZUZpbGVQYXRoLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pO1xuICAgIGNvbnN0IHByYWdtYUxpbmUgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpLmZpbmQoeCA9PiB4LnN0YXJ0c1dpdGgoQ0RLX0lOVEVHX1NUQUNLX1BSQUdNQSArICcgJykpO1xuICAgIGlmICghcHJhZ21hTGluZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGFyZ3MgPSBwcmFnbWFMaW5lLnN1YnN0cmluZyhDREtfSU5URUdfU1RBQ0tfUFJBR01BLmxlbmd0aCkudHJpbSgpLnNwbGl0KCcgJyk7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgc3ludGF4IGZvciBjZGstaW50ZWcgcHJhZ21hLiBVc2FnZTogXCIke0NES19JTlRFR19TVEFDS19QUkFHTUF9IFtTVEFDS10gW3ByYWdtYTpQUkFHTUFdIFsuLi5dXCJgKTtcbiAgICB9XG4gICAgcmV0dXJuIGFyZ3M7XG4gIH1cbn1cblxuY29uc3QgZnV0dXJlRmxhZ3M6IHtba2V5OiBzdHJpbmddOiBhbnl9ID0ge307XG5PYmplY3QuZW50cmllcyhjeGFwaS5GVVRVUkVfRkxBR1MpXG4gIC5maWx0ZXIoKFtrLCBfXSkgPT4gIWN4YXBpLkZVVFVSRV9GTEFHU19FWFBJUkVELmluY2x1ZGVzKGspKVxuICAuZm9yRWFjaCgoW2ssIHZdKSA9PiBmdXR1cmVGbGFnc1trXSA9IHYpO1xuXG4vLyBEZWZhdWx0IGNvbnRleHQgd2UgcnVuIGFsbCBpbnRlZyB0ZXN0cyB3aXRoLCBzbyB0aGV5IGRvbid0IGRlcGVuZCBvbiB0aGVcbi8vIGFjY291bnQgb2YgdGhlIGV4ZXJjaXNpbmcgdXNlci5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NZTlRIX09QVElPTlMgPSB7XG4gIGNvbnRleHQ6IHtcbiAgICAvLyB1c2Ugb2xkLXN0eWxlIHN5bnRoZXNpcyBpbiBzbmFwc2hvdCB0ZXN0c1xuICAgIFtjeGFwaS5ORVdfU1RZTEVfU1RBQ0tfU1lOVEhFU0lTX0NPTlRFWFRdOiBmYWxzZSxcbiAgICBbY3hhcGkuQVZBSUxBQklMSVRZX1pPTkVfRkFMTEJBQ0tfQ09OVEVYVF9LRVldOiBbJ3Rlc3QtcmVnaW9uLTFhJywgJ3Rlc3QtcmVnaW9uLTFiJywgJ3Rlc3QtcmVnaW9uLTFjJ10sXG4gICAgJ2F2YWlsYWJpbGl0eS16b25lczphY2NvdW50PTEyMzQ1Njc4OnJlZ2lvbj10ZXN0LXJlZ2lvbic6IFsndGVzdC1yZWdpb24tMWEnLCAndGVzdC1yZWdpb24tMWInLCAndGVzdC1yZWdpb24tMWMnXSxcbiAgICAnc3NtOmFjY291bnQ9MTIzNDU2Nzg6cGFyYW1ldGVyTmFtZT0vYXdzL3NlcnZpY2UvYW1pLWFtYXpvbi1saW51eC1sYXRlc3QvYW16bi1hbWktaHZtLXg4Nl82NC1ncDI6cmVnaW9uPXRlc3QtcmVnaW9uJzogJ2FtaS0xMjM0JyxcbiAgICAnc3NtOmFjY291bnQ9MTIzNDU2Nzg6cGFyYW1ldGVyTmFtZT0vYXdzL3NlcnZpY2UvYW1pLWFtYXpvbi1saW51eC1sYXRlc3QvYW16bjItYW1pLWh2bS14ODZfNjQtZ3AyOnJlZ2lvbj10ZXN0LXJlZ2lvbic6ICdhbWktMTIzNCcsXG4gICAgJ3NzbTphY2NvdW50PTEyMzQ1Njc4OnBhcmFtZXRlck5hbWU9L2F3cy9zZXJ2aWNlL2Vjcy9vcHRpbWl6ZWQtYW1pL2FtYXpvbi1saW51eC9yZWNvbW1lbmRlZDpyZWdpb249dGVzdC1yZWdpb24nOiAne1wiaW1hZ2VfaWRcIjogXCJhbWktMTIzNFwifScsXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICAnYW1pOmFjY291bnQ9MTIzNDU2Nzg6ZmlsdGVycy5pbWFnZS10eXBlLjA9bWFjaGluZTpmaWx0ZXJzLm5hbWUuMD1hbXpuLWFtaS12cGMtbmF0LSo6ZmlsdGVycy5zdGF0ZS4wPWF2YWlsYWJsZTpvd25lcnMuMD1hbWF6b246cmVnaW9uPXRlc3QtcmVnaW9uJzogJ2FtaS0xMjM0JyxcbiAgICAndnBjLXByb3ZpZGVyOmFjY291bnQ9MTIzNDU2Nzg6ZmlsdGVyLmlzRGVmYXVsdD10cnVlOnJlZ2lvbj10ZXN0LXJlZ2lvbjpyZXR1cm5Bc3ltbWV0cmljU3VibmV0cz10cnVlJzoge1xuICAgICAgdnBjSWQ6ICd2cGMtNjA5MDA5MDUnLFxuICAgICAgc3VibmV0R3JvdXBzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnUHVibGljJyxcbiAgICAgICAgICBuYW1lOiAnUHVibGljJyxcbiAgICAgICAgICBzdWJuZXRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHN1Ym5ldElkOiAnc3VibmV0LWUxOTQ1NWNhJyxcbiAgICAgICAgICAgICAgYXZhaWxhYmlsaXR5Wm9uZTogJ3VzLWVhc3QtMWEnLFxuICAgICAgICAgICAgICByb3V0ZVRhYmxlSWQ6ICdydGItZTE5NDU1Y2EnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3VibmV0SWQ6ICdzdWJuZXQtZTBjMjQ3OTcnLFxuICAgICAgICAgICAgICBhdmFpbGFiaWxpdHlab25lOiAndXMtZWFzdC0xYicsXG4gICAgICAgICAgICAgIHJvdXRlVGFibGVJZDogJ3J0Yi1lMGMyNDc5NycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdWJuZXRJZDogJ3N1Ym5ldC1jY2Q3NzM5NScsXG4gICAgICAgICAgICAgIGF2YWlsYWJpbGl0eVpvbmU6ICd1cy1lYXN0LTFjJyxcbiAgICAgICAgICAgICAgcm91dGVUYWJsZUlkOiAncnRiLWNjZDc3Mzk1JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgICAvLyBSZXN0cmljdGluZyB0byB0aGVzZSB0YXJnZXQgcGFydGl0aW9ucyBtYWtlcyBtb3N0IHNlcnZpY2UgcHJpbmNpcGFscyBzeW50aGVzaXplIHRvXG4gICAgLy8gYHNlcnZpY2UuJHtVUkxfU1VGRklYfWAsIHdoaWNoIGlzIHRlY2huaWNhbGx5ICppbmNvcnJlY3QqIChpdCdzIG9ubHkgYGFtYXpvbmF3cy5jb21gXG4gICAgLy8gb3IgYGFtYXpvbmF3cy5jb20uY25gLCBuZXZlciBVcmxTdWZmaXggZm9yIGFueSBvZiB0aGUgcmVzdHJpY3RlZCByZWdpb25zKSBidXQgaXQncyB3aGF0XG4gICAgLy8gbW9zdCBleGlzdGluZyBpbnRlZyB0ZXN0cyBjb250YWluLCBhbmQgd2Ugd2FudCB0byBkaXN0dXJiIGFzIGZldyBhcyBwb3NzaWJsZS5cbiAgICBbVEFSR0VUX1BBUlRJVElPTlNdOiBbJ2F3cycsICdhd3MtY24nXSxcbiAgICAuLi5mdXR1cmVGbGFncyxcbiAgfSxcbiAgZW52OiB7XG4gICAgQ0RLX0lOVEVHX0FDQ09VTlQ6ICcxMjM0NTY3OCcsXG4gICAgQ0RLX0lOVEVHX1JFR0lPTjogJ3Rlc3QtcmVnaW9uJyxcbiAgfSxcbn07XG5cbi8qKlxuICogT3VyIG93biBleGVjdXRlIGZ1bmN0aW9uIHdoaWNoIGRvZXNuJ3QgdXNlIHNoZWxscyBhbmQgc3RyaW5ncy5cbiAqL1xuZnVuY3Rpb24gZXhlYyhjb21tYW5kTGluZTogc3RyaW5nW10sIG9wdGlvbnM6IHsgY3dkPzogc3RyaW5nLCBqc29uPzogYm9vbGVhbiwgdmVyYm9zZT86IGJvb2xlYW4sIGVudj86IGFueSB9ID0geyB9KTogYW55IHtcbiAgY29uc3QgcHJvYyA9IHNwYXduU3luYyhjb21tYW5kTGluZVswXSwgY29tbWFuZExpbmUuc2xpY2UoMSksIHtcbiAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsIG9wdGlvbnMudmVyYm9zZSA/ICdpbmhlcml0JyA6ICdwaXBlJ10sIC8vIGluaGVyaXQgU1RERVJSIGluIHZlcmJvc2UgbW9kZVxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICBDREtfSU5URUdfTU9ERTogJzEnLFxuICAgICAgLi4ub3B0aW9ucy5lbnYsXG4gICAgfSxcbiAgICBjd2Q6IG9wdGlvbnMuY3dkLFxuICB9KTtcblxuICBpZiAocHJvYy5lcnJvcikgeyB0aHJvdyBwcm9jLmVycm9yOyB9XG4gIGlmIChwcm9jLnN0YXR1cyAhPT0gMCkge1xuICAgIGlmIChwcm9jZXNzLnN0ZGVycikgeyAvLyB3aWxsIGJlICdudWxsJyBpbiB2ZXJib3NlIG1vZGVcbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKHByb2Muc3RkZXJyKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb21tYW5kIGV4aXRlZCB3aXRoICR7cHJvYy5zdGF0dXMgPyBgc3RhdHVzICR7cHJvYy5zdGF0dXN9YCA6IGBzaWduYWwgJHtwcm9jLnNpZ25hbH1gfWApO1xuICB9XG5cbiAgY29uc3Qgb3V0cHV0ID0gcHJvYy5zdGRvdXQudG9TdHJpbmcoJ3V0Zi04JykudHJpbSgpO1xuXG4gIHRyeSB7XG4gICAgaWYgKG9wdGlvbnMuanNvbikge1xuICAgICAgaWYgKG91dHB1dC5sZW5ndGggPT09IDApIHsgcmV0dXJuIHt9OyB9XG5cbiAgICAgIHJldHVybiBKU09OLnBhcnNlKG91dHB1dCk7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoJ05vdCBKU09OOiAnICsgb3V0cHV0KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbW1hbmQgb3V0cHV0IGlzIG5vdCBKU09OJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZGVlcEVxdWFsKGE6IGFueSwgYjogYW55KSB7XG4gIHRyeSB7XG4gICAgYXNzZXJ0LmRlZXBFcXVhbChhLCBiKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSJdfQ==