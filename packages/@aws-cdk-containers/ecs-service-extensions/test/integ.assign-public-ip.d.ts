export {};
/**
 * Expect this stack to deploy. The stack outputs include a DNS name and a
 * nameserver. A short time after the services have settled, you may query the
 * nameserver for the record. If an IP address is shown, then this test has
 * succeeded.
 *
 * Example:
 *
 * ```
 * $ cdk --app 'node ./integ.assign-public-ip.js' deploy
 * ...
 * Outputs:
 * aws-ecs-integ.DnsName = test-record.myexample.com
 * aws-ecs-integ.DnsServer = ns-1836.awsdns-37.co.uk
 * ...
 *
 * $ host test-record.myexample.com ns-1836.awsdns-37.co.uk
 * Using domain server:
 * Name: ns-1836.awsdns-37.co.uk
 * Address: 2600:9000:5307:2c00::1#53
 * Aliases:
 *
 * test-record.myexample.com has address 52.60.53.62
 * ```
 */
