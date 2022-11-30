"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const autoscaling = require("@aws-cdk/aws-autoscaling");
const ec2 = require("@aws-cdk/aws-ec2");
const ecs = require("@aws-cdk/aws-ecs");
const route53 = require("@aws-cdk/aws-route53");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
const task_record_manager_1 = require("../lib/extensions/assign-public-ip/task-record-manager");
describe('assign public ip', () => {
    test('should assign a public ip to fargate tasks', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        serviceDescription.add(new lib_1.AssignPublicIpExtension());
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            NetworkConfiguration: {
                AwsvpcConfiguration: {
                    AssignPublicIp: 'ENABLED',
                },
            },
        });
    });
    test('errors when adding a public ip to ec2-backed service', () => {
        // GIVEN
        const stack = new cdk.Stack();
        const vpc = new ec2.Vpc(stack, 'VPC');
        const cluster = new ecs.Cluster(stack, 'Cluster', { vpc });
        cluster.addAsgCapacityProvider(new ecs.AsgCapacityProvider(stack, 'Provider', {
            autoScalingGroup: new autoscaling.AutoScalingGroup(stack, 'DefaultAutoScalingGroup', {
                vpc,
                machineImage: ec2.MachineImage.latestAmazonLinux(),
                instanceType: new ec2.InstanceType('t2.micro'),
            }),
        }));
        const environment = new lib_1.Environment(stack, 'production', {
            vpc,
            cluster,
            capacityType: lib_1.EnvironmentCapacityType.EC2,
        });
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        serviceDescription.add(new lib_1.AssignPublicIpExtension());
        // WHEN / THEN
        expect(() => {
            new lib_1.Service(stack, 'my-service', {
                environment,
                serviceDescription,
            });
        }).toThrow(/Fargate/i);
    });
    test('should not add a task record manager by default', () => {
        // GIVEN
        const stack = new cdk.Stack();
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        // WHEN
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        serviceDescription.add(new lib_1.AssignPublicIpExtension());
        const service = new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        expect(service.ecsService.node.tryFindChild('TaskRecordManager')).toBeUndefined();
    });
    test('should add a task record manager when dns is requested', () => {
        // GIVEN
        const stack = new cdk.Stack();
        const dnsZone = new route53.PublicHostedZone(stack, 'zone', {
            zoneName: 'myexample.com',
        });
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        // WHEN
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        serviceDescription.add(new lib_1.AssignPublicIpExtension({
            dns: {
                zone: dnsZone,
                recordName: 'test-record',
            },
        }));
        const service = new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        expect(service.ecsService.node.tryFindChild('TaskRecordManager')).toBeDefined();
    });
    test('task record manager listens for ecs events', () => {
        // GIVEN
        const stack = new cdk.Stack();
        const dnsZone = new route53.PublicHostedZone(stack, 'zone', {
            zoneName: 'myexample.com',
        });
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        serviceDescription.add(new lib_1.AssignPublicIpExtension());
        const service = new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // WHEN
        new task_record_manager_1.TaskRecordManager(stack, 'manager', {
            dnsRecordName: 'test-record',
            dnsZone: dnsZone,
            service: service.ecsService,
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::Events::Rule', {
            EventPattern: {
                'source': ['aws.ecs'],
                'detail-type': [
                    'ECS Task State Change',
                ],
                'detail': {
                    lastStatus: ['RUNNING'],
                    desiredStatus: ['RUNNING'],
                },
            },
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::Events::Rule', {
            EventPattern: {
                'source': ['aws.ecs'],
                'detail-type': [
                    'ECS Task State Change',
                ],
                'detail': {
                    lastStatus: ['STOPPED'],
                    desiredStatus: ['STOPPED'],
                },
            },
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWduLXB1YmxpYy1pcC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXNzaWduLXB1YmxpYy1pcC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsb0RBQStDO0FBQy9DLHdEQUF3RDtBQUN4RCx3Q0FBd0M7QUFDeEMsd0NBQXdDO0FBQ3hDLGdEQUFnRDtBQUNoRCxxQ0FBcUM7QUFDckMsZ0NBQStIO0FBQy9ILGdHQUEyRjtBQUUzRixRQUFRLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTlCLE9BQU87UUFDUCxNQUFNLFdBQVcsR0FBRyxJQUFJLGlCQUFXLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx3QkFBa0IsRUFBRSxDQUFDO1FBQ3BELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQVMsQ0FBQztZQUNuQyxHQUFHLEVBQUUsR0FBRztZQUNSLFNBQVMsRUFBRSxHQUFHO1lBQ2QsV0FBVyxFQUFFLEVBQUU7WUFDZixLQUFLLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUM7U0FDMUQsQ0FBQyxDQUFDLENBQUM7UUFDSixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSw2QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFFdEQsSUFBSSxhQUFPLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRTtZQUMvQixXQUFXO1lBQ1gsa0JBQWtCO1NBQ25CLENBQUMsQ0FBQztRQUVILE9BQU87UUFDUCxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRTtZQUNuRSxvQkFBb0IsRUFBRTtnQkFDcEIs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O2dCQUNaLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQztnQkFDckIsYUFBYSxFQUFFO29CQUNiLHVCQUF1QjtpQkFDeEI7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLFVBQVUsRUFBRSxDQUFDLFNBQVMsQ0FBQztvQkFDdkIsYUFBYSxFQUFFLENBQUMsU0FBUyxDQUFDO2lCQUMzQjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLEVBQUU7WUFDbkUsWUFBWSxFQUFFO2dCQUNaLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQztnQkFDckIsYUFBYSxFQUFFO29CQUNiLHVCQUF1QjtpQkFDeEI7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLFVBQVUsRUFBRSxDQUFDLFNBQVMsQ0FBQztvQkFDdkIsYUFBYSxFQUFFLENBQUMsU0FBUyxDQUFDO2lCQUMzQjthQUNGO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRlbXBsYXRlIH0gZnJvbSAnQGF3cy1jZGsvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgKiBhcyBhdXRvc2NhbGluZyBmcm9tICdAYXdzLWNkay9hd3MtYXV0b3NjYWxpbmcnO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ0Bhd3MtY2RrL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ0Bhd3MtY2RrL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBBc3NpZ25QdWJsaWNJcEV4dGVuc2lvbiwgQ29udGFpbmVyLCBFbnZpcm9ubWVudCwgRW52aXJvbm1lbnRDYXBhY2l0eVR5cGUsIFNlcnZpY2UsIFNlcnZpY2VEZXNjcmlwdGlvbiB9IGZyb20gJy4uL2xpYic7XG5pbXBvcnQgeyBUYXNrUmVjb3JkTWFuYWdlciB9IGZyb20gJy4uL2xpYi9leHRlbnNpb25zL2Fzc2lnbi1wdWJsaWMtaXAvdGFzay1yZWNvcmQtbWFuYWdlcic7XG5cbmRlc2NyaWJlKCdhc3NpZ24gcHVibGljIGlwJywgKCkgPT4ge1xuICB0ZXN0KCdzaG91bGQgYXNzaWduIGEgcHVibGljIGlwIHRvIGZhcmdhdGUgdGFza3MnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgfSkpO1xuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IEFzc2lnblB1YmxpY0lwRXh0ZW5zaW9uKCkpO1xuXG4gICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgTmV0d29ya0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgQXdzdnBjQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIEFzc2lnblB1YmxpY0lwOiAnRU5BQkxFRCcsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdlcnJvcnMgd2hlbiBhZGRpbmcgYSBwdWJsaWMgaXAgdG8gZWMyLWJhY2tlZCBzZXJ2aWNlJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG5cbiAgICBjb25zdCB2cGMgPSBuZXcgZWMyLlZwYyhzdGFjaywgJ1ZQQycpO1xuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIoc3RhY2ssICdDbHVzdGVyJywgeyB2cGMgfSk7XG4gICAgY2x1c3Rlci5hZGRBc2dDYXBhY2l0eVByb3ZpZGVyKG5ldyBlY3MuQXNnQ2FwYWNpdHlQcm92aWRlcihzdGFjaywgJ1Byb3ZpZGVyJywge1xuICAgICAgYXV0b1NjYWxpbmdHcm91cDogbmV3IGF1dG9zY2FsaW5nLkF1dG9TY2FsaW5nR3JvdXAoc3RhY2ssICdEZWZhdWx0QXV0b1NjYWxpbmdHcm91cCcsIHtcbiAgICAgICAgdnBjLFxuICAgICAgICBtYWNoaW5lSW1hZ2U6IGVjMi5NYWNoaW5lSW1hZ2UubGF0ZXN0QW1hem9uTGludXgoKSxcbiAgICAgICAgaW5zdGFuY2VUeXBlOiBuZXcgZWMyLkluc3RhbmNlVHlwZSgndDIubWljcm8nKSxcbiAgICAgIH0pLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicsIHtcbiAgICAgIHZwYyxcbiAgICAgIGNsdXN0ZXIsXG4gICAgICBjYXBhY2l0eVR5cGU6IEVudmlyb25tZW50Q2FwYWNpdHlUeXBlLkVDMixcbiAgICB9KTtcblxuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQXNzaWduUHVibGljSXBFeHRlbnNpb24oKSk7XG5cbiAgICAvLyBXSEVOIC8gVEhFTlxuICAgIGV4cGVjdCgoKSA9PiB7XG4gICAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICAgIGVudmlyb25tZW50LFxuICAgICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgICB9KTtcbiAgICB9KS50b1Rocm93KC9GYXJnYXRlL2kpO1xuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgbm90IGFkZCBhIHRhc2sgcmVjb3JkIG1hbmFnZXIgYnkgZGVmYXVsdCcsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuXG4gICAgLy8gV0hFTlxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBBc3NpZ25QdWJsaWNJcEV4dGVuc2lvbigpKTtcblxuICAgIGNvbnN0IHNlcnZpY2UgPSBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3Qoc2VydmljZS5lY3NTZXJ2aWNlLm5vZGUudHJ5RmluZENoaWxkKCdUYXNrUmVjb3JkTWFuYWdlcicpKS50b0JlVW5kZWZpbmVkKCk7XG4gIH0pO1xuXG4gIHRlc3QoJ3Nob3VsZCBhZGQgYSB0YXNrIHJlY29yZCBtYW5hZ2VyIHdoZW4gZG5zIGlzIHJlcXVlc3RlZCcsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuICAgIGNvbnN0IGRuc1pvbmUgPSBuZXcgcm91dGU1My5QdWJsaWNIb3N0ZWRab25lKHN0YWNrLCAnem9uZScsIHtcbiAgICAgIHpvbmVOYW1lOiAnbXlleGFtcGxlLmNvbScsXG4gICAgfSk7XG5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICAvLyBXSEVOXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgfSkpO1xuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IEFzc2lnblB1YmxpY0lwRXh0ZW5zaW9uKHtcbiAgICAgIGRuczoge1xuICAgICAgICB6b25lOiBkbnNab25lLFxuICAgICAgICByZWNvcmROYW1lOiAndGVzdC1yZWNvcmQnLFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICBjb25zdCBzZXJ2aWNlID0gbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KHNlcnZpY2UuZWNzU2VydmljZS5ub2RlLnRyeUZpbmRDaGlsZCgnVGFza1JlY29yZE1hbmFnZXInKSkudG9CZURlZmluZWQoKTtcbiAgfSk7XG5cbiAgdGVzdCgndGFzayByZWNvcmQgbWFuYWdlciBsaXN0ZW5zIGZvciBlY3MgZXZlbnRzJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG4gICAgY29uc3QgZG5zWm9uZSA9IG5ldyByb3V0ZTUzLlB1YmxpY0hvc3RlZFpvbmUoc3RhY2ssICd6b25lJywge1xuICAgICAgem9uZU5hbWU6ICdteWV4YW1wbGUuY29tJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQXNzaWduUHVibGljSXBFeHRlbnNpb24oKSk7XG5cbiAgICBjb25zdCBzZXJ2aWNlID0gbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBXSEVOXG4gICAgbmV3IFRhc2tSZWNvcmRNYW5hZ2VyKHN0YWNrLCAnbWFuYWdlcicsIHtcbiAgICAgIGRuc1JlY29yZE5hbWU6ICd0ZXN0LXJlY29yZCcsXG4gICAgICBkbnNab25lOiBkbnNab25lLFxuICAgICAgc2VydmljZTogc2VydmljZS5lY3NTZXJ2aWNlLFxuICAgIH0pO1xuXG4gICAgLy8gVEhFTlxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkV2ZW50czo6UnVsZScsIHtcbiAgICAgIEV2ZW50UGF0dGVybjoge1xuICAgICAgICAnc291cmNlJzogWydhd3MuZWNzJ10sXG4gICAgICAgICdkZXRhaWwtdHlwZSc6IFtcbiAgICAgICAgICAnRUNTIFRhc2sgU3RhdGUgQ2hhbmdlJyxcbiAgICAgICAgXSxcbiAgICAgICAgJ2RldGFpbCc6IHtcbiAgICAgICAgICBsYXN0U3RhdHVzOiBbJ1JVTk5JTkcnXSxcbiAgICAgICAgICBkZXNpcmVkU3RhdHVzOiBbJ1JVTk5JTkcnXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFdmVudHM6OlJ1bGUnLCB7XG4gICAgICBFdmVudFBhdHRlcm46IHtcbiAgICAgICAgJ3NvdXJjZSc6IFsnYXdzLmVjcyddLFxuICAgICAgICAnZGV0YWlsLXR5cGUnOiBbXG4gICAgICAgICAgJ0VDUyBUYXNrIFN0YXRlIENoYW5nZScsXG4gICAgICAgIF0sXG4gICAgICAgICdkZXRhaWwnOiB7XG4gICAgICAgICAgbGFzdFN0YXR1czogWydTVE9QUEVEJ10sXG4gICAgICAgICAgZGVzaXJlZFN0YXR1czogWydTVE9QUEVEJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19