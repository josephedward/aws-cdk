"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const ecs = require("@aws-cdk/aws-ecs");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
describe('http load balancer', () => {
    test('should be able to add an HTTP load balancer to a service', () => {
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
        serviceDescription.add(new lib_1.HttpLoadBalancerExtension());
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    Essential: true,
                    Image: 'nathanpeck/name',
                    Memory: 512,
                    Name: 'app',
                    PortMappings: [
                        {
                            ContainerPort: 80,
                            Protocol: 'tcp',
                        },
                    ],
                    Ulimits: [
                        {
                            HardLimit: 1024000,
                            Name: 'nofile',
                            SoftLimit: 1024000,
                        },
                    ],
                },
            ],
            Cpu: '256',
            Family: 'myservicetaskdefinition',
            Memory: '512',
            NetworkMode: 'awsvpc',
            RequiresCompatibilities: [
                'EC2',
                'FARGATE',
            ],
            TaskRoleArn: {
                'Fn::GetAtt': [
                    'myservicetaskdefinitionTaskRole92ACD903',
                    'Arn',
                ],
            },
        });
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 1);
    });
    test('allows scaling on request count for the HTTP load balancer', () => {
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
        serviceDescription.add(new lib_1.HttpLoadBalancerExtension({ requestsPerTarget: 100 }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            autoScaleTaskCount: {
                maxTaskCount: 5,
            },
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MaxCapacity: 5,
            MinCapacity: 1,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            PolicyType: 'TargetTrackingScaling',
            TargetTrackingScalingPolicyConfiguration: {
                PredefinedMetricSpecification: {
                    PredefinedMetricType: 'ALBRequestCountPerTarget',
                },
                TargetValue: 100,
            },
        });
    });
    test('should error when adding scaling policy if scaling target has not been configured', () => {
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
        serviceDescription.add(new lib_1.HttpLoadBalancerExtension({ requestsPerTarget: 100 }));
        // THEN
        expect(() => {
            new lib_1.Service(stack, 'my-service', {
                environment,
                serviceDescription,
            });
        }).toThrow(/Auto scaling target for the service 'my-service' hasn't been configured. Please use Service construct to configure 'minTaskCount' and 'maxTaskCount'./);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1sb2FkLWJhbGFuY2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJodHRwLWxvYWQtYmFsYW5jZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG9EQUErQztBQUMvQyx3Q0FBd0M7QUFDeEMscUNBQXFDO0FBQ3JDLGdDQUF3RztBQUV4RyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLElBQUksQ0FBQywwREFBMEQsRUFBRSxHQUFHLEVBQUU7UUFDcEUsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTlCLE9BQU87UUFDUCxNQUFNLFdBQVcsR0FBRyxJQUFJLGlCQUFXLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx3QkFBa0IsRUFBRSxDQUFDO1FBRXBELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQVMsQ0FBQztZQUNuQyxHQUFHLEVBQUUsR0FBRztZQUNSLFNBQVMsRUFBRSxHQUFHO1lBQ2QsV0FBVyxFQUFFLEVBQUU7WUFDZixLQUFLLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUM7U0FDMUQsQ0FBQyxDQUFDLENBQUM7UUFFSixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSwrQkFBeUIsRUFBRSxDQUFDLENBQUM7UUFFeEQsSUFBSSxhQUFPLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRTtZQUMvQixXQUFXO1lBQ1gsa0JBQWtCO1NBQ25CLENBQUMsQ0FBQztRQUVILE9BQU87UUFDUCxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQywwQkFBMEIsRUFBRTtZQUMxRSxvQkFBb0IsRUFBRTtnQkFDcEI7b0JBQ0UsR0FBRyxFQUFFLEdBQUc7b0JBQ1IsU0FBUyxFQUFFLElBQUk7b0JBQ2Ys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LEVBQUUsQ0FBQztRQUVwRCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFTLENBQUM7WUFDbkMsR0FBRyxFQUFFLEdBQUc7WUFDUixTQUFTLEVBQUUsR0FBRztZQUNkLFdBQVcsRUFBRSxFQUFFO1lBQ2YsS0FBSyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDO1NBQzFELENBQUMsQ0FBQyxDQUFDO1FBRUosa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksK0JBQXlCLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbEYsT0FBTztRQUNQLE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDVixJQUFJLGFBQU8sQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFO2dCQUMvQixXQUFXO2dCQUNYLGtCQUFrQjthQUNuQixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsdUpBQXVKLENBQUMsQ0FBQztJQUN0SyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGVtcGxhdGUgfSBmcm9tICdAYXdzLWNkay9hc3NlcnRpb25zJztcbmltcG9ydCAqIGFzIGVjcyBmcm9tICdAYXdzLWNkay9hd3MtZWNzJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IENvbnRhaW5lciwgRW52aXJvbm1lbnQsIEh0dHBMb2FkQmFsYW5jZXJFeHRlbnNpb24sIFNlcnZpY2UsIFNlcnZpY2VEZXNjcmlwdGlvbiB9IGZyb20gJy4uL2xpYic7XG5cbmRlc2NyaWJlKCdodHRwIGxvYWQgYmFsYW5jZXInLCAoKSA9PiB7XG4gIHRlc3QoJ3Nob3VsZCBiZSBhYmxlIHRvIGFkZCBhbiBIVFRQIGxvYWQgYmFsYW5jZXIgdG8gYSBzZXJ2aWNlJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgfSkpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgSHR0cExvYWRCYWxhbmNlckV4dGVuc2lvbigpKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gVEhFTlxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICBDb250YWluZXJEZWZpbml0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgQ3B1OiAyNTYsXG4gICAgICAgICAgRXNzZW50aWFsOiB0cnVlLFxuICAgICAgICAgIEltYWdlOiAnbmF0aGFucGVjay9uYW1lJyxcbiAgICAgICAgICBNZW1vcnk6IDUxMixcbiAgICAgICAgICBOYW1lOiAnYXBwJyxcbiAgICAgICAgICBQb3J0TWFwcGluZ3M6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgQ29udGFpbmVyUG9ydDogODAsXG4gICAgICAgICAgICAgIFByb3RvY29sOiAndGNwJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBVbGltaXRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIEhhcmRMaW1pdDogMTAyNDAwMCxcbiAgICAgICAgICAgICAgTmFtZTogJ25vZmlsZScsXG4gICAgICAgICAgICAgIFNvZnRMaW1pdDogMTAyNDAwMCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBDcHU6ICcyNTYnLFxuICAgICAgRmFtaWx5OiAnbXlzZXJ2aWNldGFza2RlZmluaXRpb24nLFxuICAgICAgTWVtb3J5OiAnNTEyJyxcbiAgICAgIE5ldHdvcmtNb2RlOiAnYXdzdnBjJyxcbiAgICAgIFJlcXVpcmVzQ29tcGF0aWJpbGl0aWVzOiBbXG4gICAgICAgICdFQzInLFxuICAgICAgICAnRkFSR0FURScsXG4gICAgICBdLFxuICAgICAgVGFza1JvbGVBcm46IHtcbiAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgJ215c2VydmljZXRhc2tkZWZpbml0aW9uVGFza1JvbGU5MkFDRDkwMycsXG4gICAgICAgICAgJ0FybicsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TG9hZEJhbGFuY2VyJywgMSk7XG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXInLCAxKTtcbiAgfSk7XG5cbiAgdGVzdCgnYWxsb3dzIHNjYWxpbmcgb24gcmVxdWVzdCBjb3VudCBmb3IgdGhlIEhUVFAgbG9hZCBiYWxhbmNlcicsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IEh0dHBMb2FkQmFsYW5jZXJFeHRlbnNpb24oeyByZXF1ZXN0c1BlclRhcmdldDogMTAwIH0pKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgYXV0b1NjYWxlVGFza0NvdW50OiB7XG4gICAgICAgIG1heFRhc2tDb3VudDogNSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnLCB7XG4gICAgICBNYXhDYXBhY2l0eTogNSxcbiAgICAgIE1pbkNhcGFjaXR5OiAxLFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGluZ1BvbGljeScsIHtcbiAgICAgIFBvbGljeVR5cGU6ICdUYXJnZXRUcmFja2luZ1NjYWxpbmcnLFxuICAgICAgVGFyZ2V0VHJhY2tpbmdTY2FsaW5nUG9saWN5Q29uZmlndXJhdGlvbjoge1xuICAgICAgICBQcmVkZWZpbmVkTWV0cmljU3BlY2lmaWNhdGlvbjoge1xuICAgICAgICAgIFByZWRlZmluZWRNZXRyaWNUeXBlOiAnQUxCUmVxdWVzdENvdW50UGVyVGFyZ2V0JyxcbiAgICAgICAgfSxcbiAgICAgICAgVGFyZ2V0VmFsdWU6IDEwMCxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3Nob3VsZCBlcnJvciB3aGVuIGFkZGluZyBzY2FsaW5nIHBvbGljeSBpZiBzY2FsaW5nIHRhcmdldCBoYXMgbm90IGJlZW4gY29uZmlndXJlZCcsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IEh0dHBMb2FkQmFsYW5jZXJFeHRlbnNpb24oeyByZXF1ZXN0c1BlclRhcmdldDogMTAwIH0pKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgICBlbnZpcm9ubWVudCxcbiAgICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgfSk7XG4gICAgfSkudG9UaHJvdygvQXV0byBzY2FsaW5nIHRhcmdldCBmb3IgdGhlIHNlcnZpY2UgJ215LXNlcnZpY2UnIGhhc24ndCBiZWVuIGNvbmZpZ3VyZWQuIFBsZWFzZSB1c2UgU2VydmljZSBjb25zdHJ1Y3QgdG8gY29uZmlndXJlICdtaW5UYXNrQ291bnQnIGFuZCAnbWF4VGFza0NvdW50Jy4vKTtcbiAgfSk7XG59KTsiXX0=