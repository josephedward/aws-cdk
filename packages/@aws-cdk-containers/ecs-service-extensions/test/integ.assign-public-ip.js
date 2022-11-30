"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// !cdk-integ pragma:ignore-assets
const aws_ec2_1 = require("@aws-cdk/aws-ec2");
const aws_ecs_1 = require("@aws-cdk/aws-ecs");
const aws_route53_1 = require("@aws-cdk/aws-route53");
const core_1 = require("@aws-cdk/core");
const lib_1 = require("../lib");
// Record name. You can change this and redeploy this integration test to see
// what happens when the record name changes.
const RECORD_NAME = 'test-record';
const app = new core_1.App();
const stack = new core_1.Stack(app, 'aws-ecs-integ');
const vpc = new aws_ec2_1.Vpc(stack, 'vpc', {
    subnetConfiguration: [
        {
            cidrMask: 24,
            name: 'public',
            subnetType: aws_ec2_1.SubnetType.PUBLIC,
        },
    ],
});
const dnsZone = new aws_route53_1.PublicHostedZone(stack, 'zone', {
    zoneName: 'myexample.com',
});
// A record in the zone that is lexicographically later than 'test-record'
// to try to trip up the record set locator.
new aws_route53_1.CnameRecord(stack, 'laterRecord', {
    recordName: 'u-record',
    zone: dnsZone,
    domainName: 'console.aws.amazon.com',
});
const environment = new lib_1.Environment(stack, 'production', { vpc });
const nameDescription = new lib_1.ServiceDescription();
nameDescription.add(new lib_1.Container({
    cpu: 256,
    memoryMiB: 512,
    trafficPort: 80,
    image: aws_ecs_1.ContainerImage.fromRegistry('nathanpeck/name'),
    environment: {
        PORT: '80',
    },
}));
nameDescription.add(new lib_1.AssignPublicIpExtension({
    dns: {
        zone: dnsZone,
        recordName: RECORD_NAME,
    },
}));
new lib_1.Service(stack, 'name', {
    environment: environment,
    serviceDescription: nameDescription,
});
new core_1.CfnOutput(stack, 'DnsName', {
    value: core_1.Fn.join('.', [RECORD_NAME, dnsZone.zoneName]),
});
new core_1.CfnOutput(stack, 'DnsServer', {
    value: core_1.Fn.select(0, dnsZone.hostedZoneNameServers),
});
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuYXNzaWduLXB1YmxpYy1pcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludGVnLmFzc2lnbi1wdWJsaWMtaXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtQ0FBbUM7QUFDbkMsOENBQW1EO0FBQ25ELDhDQUFrRDtBQUNsRCxzREFBcUU7QUFDckUsd0NBQTBEO0FBQzFELGdDQUFzRztBQUV0Ryw2RUFBNkU7QUFDN0UsNkNBQTZDO0FBQzdDLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQztBQUVsQyxNQUFNLEdBQUcsR0FBRyxJQUFJLFVBQUcsRUFBRSxDQUFDO0FBQ3RCLE1BQU0sS0FBSyxHQUFHLElBQUksWUFBSyxDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsQ0FBQztBQUU5QyxNQUFNLEdBQUcsR0FBRyxJQUFJLGFBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFO0lBQ2hDLG1CQUFtQixFQUFFO1FBQ25CO1lBQ0UsUUFBUSxFQUFFLEVBQUU7WUFDWixJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRSxvQkFBVSxDQUFDLE1BQU07U0FDOUI7S0FDRjtDQUNGLENBQUMsQ0FBQztBQUVILE1BQU0sT0FBTyxHQUFHLElBQUksOEJBQWdCLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRTtJQUNsRCxRQUFRLEVBQUUsZUFBZTtDQUMxQixDQUFDLENBQUM7QUFFSCwwRUFBMEU7QUFDMUUsNENBQTRDO0FBQzVDLElBQUkseUJBQVcsQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFO0lBQ3BDLFVBQVUsRUFBRSxVQUFVO0lBQ3RCLElBQUksRUFBRSxPQUFPO0lBQ2IsVUFBVSxFQUFFLHdCQUF3QjtDQUNyQyxDQUFDLENBQUM7QUFFSCxNQUFNLFdBQVcsR0FBRyxJQUFJLGlCQUFXLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7QUFFbEUsTUFBTSxlQUFlLEdBQUcsSUFBSSx3QkFBa0IsRUFBRSxDQUFDO0FBRWpELGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFTLENBQUM7SUFDaEMsR0FBRyxFQUFFLEdBQUc7SUFDUixTQUFTLEVBQUUsR0FBRztJQUNkLFdBQVcsRUFBRSxFQUFFO0lBQ2YsS0FBSyxFQUFFLHdCQUFjLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDO0lBQ3JELFdBQVcsRUFBRTtRQUNYLElBQUksRUFBRSxJQUFJO0tBQ1g7Q0FDRixDQUFDLENBQUMsQ0FBQztBQUVKLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSw2QkFBdUIsQ0FBQztJQUM5QyxHQUFHLEVBQUU7UUFDSCxJQUFJLEVBQUUsT0FBTztRQUNiLFVBQVUsRUFBRSxXQUFXO0tBQ3hCO0NBQ0YsQ0FBQyxDQUFDLENBQUM7QUFFSixJQUFJLGFBQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFO0lBQ3pCLFdBQVcsRUFBRSxXQUFXO0lBQ3hCLGtCQUFrQixFQUFFLGVBQWU7Q0FDcEMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxnQkFBUyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUU7SUFDOUIsS0FBSyxFQUFFLFNBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztDQUNyRCxDQUFDLENBQUM7QUFFSCxJQUFJLGdCQUFTLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRTtJQUNoQyxLQUFLLEVBQUUsU0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLHFCQUFzQixDQUFDO0NBQ3BELENBQUMsQ0FBQztBQUVIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F3QkciLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gIWNkay1pbnRlZyBwcmFnbWE6aWdub3JlLWFzc2V0c1xuaW1wb3J0IHsgU3VibmV0VHlwZSwgVnBjIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWVjMic7XG5pbXBvcnQgeyBDb250YWluZXJJbWFnZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1lY3MnO1xuaW1wb3J0IHsgQ25hbWVSZWNvcmQsIFB1YmxpY0hvc3RlZFpvbmUgfSBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgeyBBcHAsIENmbk91dHB1dCwgRm4sIFN0YWNrIH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBBc3NpZ25QdWJsaWNJcEV4dGVuc2lvbiwgQ29udGFpbmVyLCBFbnZpcm9ubWVudCwgU2VydmljZSwgU2VydmljZURlc2NyaXB0aW9uIH0gZnJvbSAnLi4vbGliJztcblxuLy8gUmVjb3JkIG5hbWUuIFlvdSBjYW4gY2hhbmdlIHRoaXMgYW5kIHJlZGVwbG95IHRoaXMgaW50ZWdyYXRpb24gdGVzdCB0byBzZWVcbi8vIHdoYXQgaGFwcGVucyB3aGVuIHRoZSByZWNvcmQgbmFtZSBjaGFuZ2VzLlxuY29uc3QgUkVDT1JEX05BTUUgPSAndGVzdC1yZWNvcmQnO1xuXG5jb25zdCBhcHAgPSBuZXcgQXBwKCk7XG5jb25zdCBzdGFjayA9IG5ldyBTdGFjayhhcHAsICdhd3MtZWNzLWludGVnJyk7XG5cbmNvbnN0IHZwYyA9IG5ldyBWcGMoc3RhY2ssICd2cGMnLCB7XG4gIHN1Ym5ldENvbmZpZ3VyYXRpb246IFtcbiAgICB7XG4gICAgICBjaWRyTWFzazogMjQsXG4gICAgICBuYW1lOiAncHVibGljJyxcbiAgICAgIHN1Ym5ldFR5cGU6IFN1Ym5ldFR5cGUuUFVCTElDLFxuICAgIH0sXG4gIF0sXG59KTtcblxuY29uc3QgZG5zWm9uZSA9IG5ldyBQdWJsaWNIb3N0ZWRab25lKHN0YWNrLCAnem9uZScsIHtcbiAgem9uZU5hbWU6ICdteWV4YW1wbGUuY29tJyxcbn0pO1xuXG4vLyBBIHJlY29yZCBpbiB0aGUgem9uZSB0aGF0IGlzIGxleGljb2dyYXBoaWNhbGx5IGxhdGVyIHRoYW4gJ3Rlc3QtcmVjb3JkJ1xuLy8gdG8gdHJ5IHRvIHRyaXAgdXAgdGhlIHJlY29yZCBzZXQgbG9jYXRvci5cbm5ldyBDbmFtZVJlY29yZChzdGFjaywgJ2xhdGVyUmVjb3JkJywge1xuICByZWNvcmROYW1lOiAndS1yZWNvcmQnLFxuICB6b25lOiBkbnNab25lLFxuICBkb21haW5OYW1lOiAnY29uc29sZS5hd3MuYW1hem9uLmNvbScsXG59KTtcblxuY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJywgeyB2cGMgfSk7XG5cbmNvbnN0IG5hbWVEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxubmFtZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgY3B1OiAyNTYsXG4gIG1lbW9yeU1pQjogNTEyLFxuICB0cmFmZmljUG9ydDogODAsXG4gIGltYWdlOiBDb250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICBlbnZpcm9ubWVudDoge1xuICAgIFBPUlQ6ICc4MCcsXG4gIH0sXG59KSk7XG5cbm5hbWVEZXNjcmlwdGlvbi5hZGQobmV3IEFzc2lnblB1YmxpY0lwRXh0ZW5zaW9uKHtcbiAgZG5zOiB7XG4gICAgem9uZTogZG5zWm9uZSxcbiAgICByZWNvcmROYW1lOiBSRUNPUkRfTkFNRSxcbiAgfSxcbn0pKTtcblxubmV3IFNlcnZpY2Uoc3RhY2ssICduYW1lJywge1xuICBlbnZpcm9ubWVudDogZW52aXJvbm1lbnQsXG4gIHNlcnZpY2VEZXNjcmlwdGlvbjogbmFtZURlc2NyaXB0aW9uLFxufSk7XG5cbm5ldyBDZm5PdXRwdXQoc3RhY2ssICdEbnNOYW1lJywge1xuICB2YWx1ZTogRm4uam9pbignLicsIFtSRUNPUkRfTkFNRSwgZG5zWm9uZS56b25lTmFtZV0pLFxufSk7XG5cbm5ldyBDZm5PdXRwdXQoc3RhY2ssICdEbnNTZXJ2ZXInLCB7XG4gIHZhbHVlOiBGbi5zZWxlY3QoMCwgZG5zWm9uZS5ob3N0ZWRab25lTmFtZVNlcnZlcnMhKSxcbn0pO1xuXG4vKipcbiAqIEV4cGVjdCB0aGlzIHN0YWNrIHRvIGRlcGxveS4gVGhlIHN0YWNrIG91dHB1dHMgaW5jbHVkZSBhIEROUyBuYW1lIGFuZCBhXG4gKiBuYW1lc2VydmVyLiBBIHNob3J0IHRpbWUgYWZ0ZXIgdGhlIHNlcnZpY2VzIGhhdmUgc2V0dGxlZCwgeW91IG1heSBxdWVyeSB0aGVcbiAqIG5hbWVzZXJ2ZXIgZm9yIHRoZSByZWNvcmQuIElmIGFuIElQIGFkZHJlc3MgaXMgc2hvd24sIHRoZW4gdGhpcyB0ZXN0IGhhc1xuICogc3VjY2VlZGVkLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiAkIGNkayAtLWFwcCAnbm9kZSAuL2ludGVnLmFzc2lnbi1wdWJsaWMtaXAuanMnIGRlcGxveVxuICogLi4uXG4gKiBPdXRwdXRzOlxuICogYXdzLWVjcy1pbnRlZy5EbnNOYW1lID0gdGVzdC1yZWNvcmQubXlleGFtcGxlLmNvbVxuICogYXdzLWVjcy1pbnRlZy5EbnNTZXJ2ZXIgPSBucy0xODM2LmF3c2Rucy0zNy5jby51a1xuICogLi4uXG4gKlxuICogJCBob3N0IHRlc3QtcmVjb3JkLm15ZXhhbXBsZS5jb20gbnMtMTgzNi5hd3NkbnMtMzcuY28udWtcbiAqIFVzaW5nIGRvbWFpbiBzZXJ2ZXI6XG4gKiBOYW1lOiBucy0xODM2LmF3c2Rucy0zNy5jby51a1xuICogQWRkcmVzczogMjYwMDo5MDAwOjUzMDc6MmMwMDo6MSM1M1xuICogQWxpYXNlczpcbiAqXG4gKiB0ZXN0LXJlY29yZC5teWV4YW1wbGUuY29tIGhhcyBhZGRyZXNzIDUyLjYwLjUzLjYyXG4gKiBgYGBcbiAqL1xuIl19