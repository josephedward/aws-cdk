#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Verify that all integration tests still match their expected output
const cloudformation_diff_1 = require("@aws-cdk/cloudformation-diff");
const canonicalize_assets_1 = require("../lib/canonicalize-assets");
const integ_helpers_1 = require("../lib/integ-helpers");
/* eslint-disable no-console */
const VERIFY_ASSET_HASHES = 'pragma:include-assets-hashes';
async function main() {
    const tests = await new integ_helpers_1.IntegrationTests('test').fromCliArgs(); // always assert all tests
    const failures = [];
    for (const test of tests) {
        process.stdout.write(`Verifying ${test.name} against ${test.expectedFileName} ... `);
        if (!test.hasExpected()) {
            throw new Error(`No such file: ${test.expectedFileName}. Run 'yarn integ'.`);
        }
        let expected = await test.readExpected();
        let actual = await test.cdkSynthFast(integ_helpers_1.DEFAULT_SYNTH_OPTIONS);
        // We will always ignore asset hashes, unless specifically requested not to
        if (!(await test.pragmas()).includes(VERIFY_ASSET_HASHES)) {
            expected = canonicalize_assets_1.canonicalizeTemplate(expected);
            actual = canonicalize_assets_1.canonicalizeTemplate(actual);
        }
        const diff = cloudformation_diff_1.diffTemplate(expected, actual);
        if (!diff.isEmpty) {
            failures.push(test.name);
            process.stdout.write('CHANGED.\n');
            cloudformation_diff_1.formatDifferences(process.stdout, diff);
        }
        else {
            process.stdout.write('OK.\n');
        }
    }
    if (failures.length > 0) {
        // eslint-disable-next-line max-len
        throw new Error(`Some stacks have changed. To verify that they still deploy successfully, run: 'yarn integ ${failures.join(' ')}'`);
    }
}
main().catch(e => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLWludGVnLWFzc2VydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkay1pbnRlZy1hc3NlcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0Esc0VBQXNFO0FBQ3RFLHNFQUErRTtBQUMvRSxvRUFBa0U7QUFDbEUsd0RBQStFO0FBRS9FLCtCQUErQjtBQUUvQixNQUFNLG1CQUFtQixHQUFHLDhCQUE4QixDQUFDO0FBRTNELEtBQUssVUFBVSxJQUFJO0lBQ2pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxnQ0FBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLDBCQUEwQjtJQUMxRixNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUM7SUFFOUIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7UUFDeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxJQUFJLENBQUMsSUFBSSxZQUFZLElBQUksQ0FBQyxnQkFBZ0IsT0FBTyxDQUFDLENBQUM7UUFFckYsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixJQUFJLENBQUMsZ0JBQWdCLHFCQUFxQixDQUFDLENBQUM7U0FDOUU7UUFFRCxJQUFJLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN6QyxJQUFJLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMscUNBQXFCLENBQUMsQ0FBQztRQUU1RCwyRUFBMkU7UUFDM0UsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFBRTtZQUN6RCxRQUFRLEdBQUcsMENBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUMsTUFBTSxHQUFHLDBDQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3ZDO1FBRUQsTUFBTSxJQUFJLEdBQUcsa0NBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDakIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbkMsdUNBQWlCLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztTQUN6QzthQUFNO1lBQ0wsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDL0I7S0FDRjtJQUVELElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDdkIsbUNBQW1DO1FBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMsNkZBQTZGLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JJO0FBQ0gsQ0FBQztBQUVELElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8vIFZlcmlmeSB0aGF0IGFsbCBpbnRlZ3JhdGlvbiB0ZXN0cyBzdGlsbCBtYXRjaCB0aGVpciBleHBlY3RlZCBvdXRwdXRcbmltcG9ydCB7IGRpZmZUZW1wbGF0ZSwgZm9ybWF0RGlmZmVyZW5jZXMgfSBmcm9tICdAYXdzLWNkay9jbG91ZGZvcm1hdGlvbi1kaWZmJztcbmltcG9ydCB7IGNhbm9uaWNhbGl6ZVRlbXBsYXRlIH0gZnJvbSAnLi4vbGliL2Nhbm9uaWNhbGl6ZS1hc3NldHMnO1xuaW1wb3J0IHsgREVGQVVMVF9TWU5USF9PUFRJT05TLCBJbnRlZ3JhdGlvblRlc3RzIH0gZnJvbSAnLi4vbGliL2ludGVnLWhlbHBlcnMnO1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5cbmNvbnN0IFZFUklGWV9BU1NFVF9IQVNIRVMgPSAncHJhZ21hOmluY2x1ZGUtYXNzZXRzLWhhc2hlcyc7XG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gIGNvbnN0IHRlc3RzID0gYXdhaXQgbmV3IEludGVncmF0aW9uVGVzdHMoJ3Rlc3QnKS5mcm9tQ2xpQXJncygpOyAvLyBhbHdheXMgYXNzZXJ0IGFsbCB0ZXN0c1xuICBjb25zdCBmYWlsdXJlczogc3RyaW5nW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHRlc3Qgb2YgdGVzdHMpIHtcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShgVmVyaWZ5aW5nICR7dGVzdC5uYW1lfSBhZ2FpbnN0ICR7dGVzdC5leHBlY3RlZEZpbGVOYW1lfSAuLi4gYCk7XG5cbiAgICBpZiAoIXRlc3QuaGFzRXhwZWN0ZWQoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIGZpbGU6ICR7dGVzdC5leHBlY3RlZEZpbGVOYW1lfS4gUnVuICd5YXJuIGludGVnJy5gKTtcbiAgICB9XG5cbiAgICBsZXQgZXhwZWN0ZWQgPSBhd2FpdCB0ZXN0LnJlYWRFeHBlY3RlZCgpO1xuICAgIGxldCBhY3R1YWwgPSBhd2FpdCB0ZXN0LmNka1N5bnRoRmFzdChERUZBVUxUX1NZTlRIX09QVElPTlMpO1xuXG4gICAgLy8gV2Ugd2lsbCBhbHdheXMgaWdub3JlIGFzc2V0IGhhc2hlcywgdW5sZXNzIHNwZWNpZmljYWxseSByZXF1ZXN0ZWQgbm90IHRvXG4gICAgaWYgKCEoYXdhaXQgdGVzdC5wcmFnbWFzKCkpLmluY2x1ZGVzKFZFUklGWV9BU1NFVF9IQVNIRVMpKSB7XG4gICAgICBleHBlY3RlZCA9IGNhbm9uaWNhbGl6ZVRlbXBsYXRlKGV4cGVjdGVkKTtcbiAgICAgIGFjdHVhbCA9IGNhbm9uaWNhbGl6ZVRlbXBsYXRlKGFjdHVhbCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlmZiA9IGRpZmZUZW1wbGF0ZShleHBlY3RlZCwgYWN0dWFsKTtcblxuICAgIGlmICghZGlmZi5pc0VtcHR5KSB7XG4gICAgICBmYWlsdXJlcy5wdXNoKHRlc3QubmFtZSk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSgnQ0hBTkdFRC5cXG4nKTtcbiAgICAgIGZvcm1hdERpZmZlcmVuY2VzKHByb2Nlc3Muc3Rkb3V0LCBkaWZmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoJ09LLlxcbicpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChmYWlsdXJlcy5sZW5ndGggPiAwKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFNvbWUgc3RhY2tzIGhhdmUgY2hhbmdlZC4gVG8gdmVyaWZ5IHRoYXQgdGhleSBzdGlsbCBkZXBsb3kgc3VjY2Vzc2Z1bGx5LCBydW46ICd5YXJuIGludGVnICR7ZmFpbHVyZXMuam9pbignICcpfSdgKTtcbiAgfVxufVxuXG5tYWluKCkuY2F0Y2goZSA9PiB7XG4gIGNvbnNvbGUuZXJyb3IoZSk7XG4gIHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuIl19