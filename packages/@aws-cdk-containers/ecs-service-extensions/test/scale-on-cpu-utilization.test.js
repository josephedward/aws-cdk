"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const ecs = require("@aws-cdk/aws-ecs");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
describe('scale on cpu utilization', () => {
    test('scale on cpu utilization extension with no parameters should create a default autoscaling setup', () => {
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
        serviceDescription.add(new lib_1.ScaleOnCpuUtilization());
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            DeploymentConfiguration: {
                MaximumPercent: 200,
                MinimumHealthyPercent: 100,
            },
            DesiredCount: 2,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MaxCapacity: 8,
            MinCapacity: 2,
            ResourceId: {
                'Fn::Join': [
                    '',
                    [
                        'service/',
                        {
                            Ref: 'productionenvironmentclusterC6599D2D',
                        },
                        '/',
                        {
                            'Fn::GetAtt': [
                                'myserviceserviceServiceE9A5732D',
                                'Name',
                            ],
                        },
                    ],
                ],
            },
            RoleARN: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            Ref: 'AWS::Partition',
                        },
                        ':iam::',
                        {
                            Ref: 'AWS::AccountId',
                        },
                        ':role/aws-service-role/ecs.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_ECSService',
                    ],
                ],
            },
            ScalableDimension: 'ecs:service:DesiredCount',
            ServiceNamespace: 'ecs',
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            PolicyName: 'myserviceserviceTaskCountTargetmyservicetargetcpuutilization50E6628660',
            PolicyType: 'TargetTrackingScaling',
            ScalingTargetId: {
                Ref: 'myserviceserviceTaskCountTarget4268918D',
            },
            TargetTrackingScalingPolicyConfiguration: {
                PredefinedMetricSpecification: {
                    PredefinedMetricType: 'ECSServiceAverageCPUUtilization',
                },
                ScaleInCooldown: 60,
                ScaleOutCooldown: 60,
                TargetValue: 50,
            },
        });
    });
    test('should be able to set a custom scaling policy as well', () => {
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
        serviceDescription.add(new lib_1.ScaleOnCpuUtilization({
            initialTaskCount: 25,
            minTaskCount: 15,
            maxTaskCount: 30,
            targetCpuUtilization: 75,
            scaleInCooldown: cdk.Duration.minutes(3),
            scaleOutCooldown: cdk.Duration.minutes(3),
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            DeploymentConfiguration: {
                MaximumPercent: 200,
                MinimumHealthyPercent: 100,
            },
            DesiredCount: 25,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MaxCapacity: 30,
            MinCapacity: 15,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            TargetTrackingScalingPolicyConfiguration: {
                ScaleInCooldown: 180,
                ScaleOutCooldown: 180,
                TargetValue: 75,
            },
        });
    });
    test('should error if configuring autoscaling target both in the extension and the Service', () => {
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
        serviceDescription.add(new lib_1.ScaleOnCpuUtilization());
        // THEN
        expect(() => {
            new lib_1.Service(stack, 'my-service', {
                environment,
                serviceDescription,
                autoScaleTaskCount: {
                    maxTaskCount: 5,
                },
            });
        }).toThrow('Cannot specify \'autoScaleTaskCount\' in the Service construct and also provide a  \'ScaleOnCpuUtilization\' extension. \'ScaleOnCpuUtilization\' is deprecated. Please only provide \'autoScaleTaskCount\'.');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NhbGUtb24tY3B1LXV0aWxpemF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzY2FsZS1vbi1jcHUtdXRpbGl6YXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG9EQUErQztBQUMvQyx3Q0FBd0M7QUFDeEMscUNBQXFDO0FBQ3JDLGdDQUFvRztBQUVwRyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3hDLElBQUksQ0FBQyxpR0FBaUcsRUFBRSxHQUFHLEVBQUU7UUFDM0csUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTlCLE9BQU87UUFDUCxNQUFNLFdBQVcsR0FBRyxJQUFJLGlCQUFXLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx3QkFBa0IsRUFBRSxDQUFDO1FBRXBELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQVMsQ0FBQztZQUNuQyxHQUFHLEVBQUUsR0FBRztZQUNSLFNBQVMsRUFBRSxHQUFHO1lBQ2QsV0FBVyxFQUFFLEVBQUU7WUFDZixLQUFLLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUM7U0FDMUQsQ0FBQyxDQUFDLENBQUM7UUFFSixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSwyQkFBcUIsRUFBRSxDQUFDLENBQUM7UUFFcEQsSUFBSSxhQUFPLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRTtZQUMvQixXQUFXO1lBQ1gsa0JBQWtCO1NBQ25CLENBQUMsQ0FBQztRQUVILE9BQU87UUFDUCxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRTtZQUNuRSx1QkFBdUIsRUFBRTtnQkFDdkIsY0FBYyxFQUFFLEdBQUc7Z0JBQ25CLHFCQUFxQixFQUFFLEdB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QkFBa0IsRUFBRTtvQkFDbEIsWUFBWSxFQUFFLENBQUM7aUJBQ2hCO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLDhNQUE4TSxDQUFDLENBQUM7SUFDN04sQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRlbXBsYXRlIH0gZnJvbSAnQGF3cy1jZGsvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBDb250YWluZXIsIEVudmlyb25tZW50LCBTY2FsZU9uQ3B1VXRpbGl6YXRpb24sIFNlcnZpY2UsIFNlcnZpY2VEZXNjcmlwdGlvbiB9IGZyb20gJy4uL2xpYic7XG5cbmRlc2NyaWJlKCdzY2FsZSBvbiBjcHUgdXRpbGl6YXRpb24nLCAoKSA9PiB7XG4gIHRlc3QoJ3NjYWxlIG9uIGNwdSB1dGlsaXphdGlvbiBleHRlbnNpb24gd2l0aCBubyBwYXJhbWV0ZXJzIHNob3VsZCBjcmVhdGUgYSBkZWZhdWx0IGF1dG9zY2FsaW5nIHNldHVwJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgfSkpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgU2NhbGVPbkNwdVV0aWxpemF0aW9uKCkpO1xuXG4gICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgRGVwbG95bWVudENvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgTWF4aW11bVBlcmNlbnQ6IDIwMCxcbiAgICAgICAgTWluaW11bUhlYWx0aHlQZXJjZW50OiAxMDAsXG4gICAgICB9LFxuICAgICAgRGVzaXJlZENvdW50OiAyLFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnLCB7XG4gICAgICBNYXhDYXBhY2l0eTogOCxcbiAgICAgIE1pbkNhcGFjaXR5OiAyLFxuICAgICAgUmVzb3VyY2VJZDoge1xuICAgICAgICAnRm46OkpvaW4nOiBbXG4gICAgICAgICAgJycsXG4gICAgICAgICAgW1xuICAgICAgICAgICAgJ3NlcnZpY2UvJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgUmVmOiAncHJvZHVjdGlvbmVudmlyb25tZW50Y2x1c3RlckM2NTk5RDJEJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnLycsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgICAgICdteXNlcnZpY2VzZXJ2aWNlU2VydmljZUU5QTU3MzJEJyxcbiAgICAgICAgICAgICAgICAnTmFtZScsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgUm9sZUFSTjoge1xuICAgICAgICAnRm46OkpvaW4nOiBbXG4gICAgICAgICAgJycsXG4gICAgICAgICAgW1xuICAgICAgICAgICAgJ2FybjonLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBSZWY6ICdBV1M6OlBhcnRpdGlvbicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJzppYW06OicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFJlZjogJ0FXUzo6QWNjb3VudElkJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnOnJvbGUvYXdzLXNlcnZpY2Utcm9sZS9lY3MuYXBwbGljYXRpb24tYXV0b3NjYWxpbmcuYW1hem9uYXdzLmNvbS9BV1NTZXJ2aWNlUm9sZUZvckFwcGxpY2F0aW9uQXV0b1NjYWxpbmdfRUNTU2VydmljZScsXG4gICAgICAgICAgXSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBTY2FsYWJsZURpbWVuc2lvbjogJ2VjczpzZXJ2aWNlOkRlc2lyZWRDb3VudCcsXG4gICAgICBTZXJ2aWNlTmFtZXNwYWNlOiAnZWNzJyxcbiAgICB9KTtcblxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxpbmdQb2xpY3knLCB7XG4gICAgICBQb2xpY3lOYW1lOiAnbXlzZXJ2aWNlc2VydmljZVRhc2tDb3VudFRhcmdldG15c2VydmljZXRhcmdldGNwdXV0aWxpemF0aW9uNTBFNjYyODY2MCcsXG4gICAgICBQb2xpY3lUeXBlOiAnVGFyZ2V0VHJhY2tpbmdTY2FsaW5nJyxcbiAgICAgIFNjYWxpbmdUYXJnZXRJZDoge1xuICAgICAgICBSZWY6ICdteXNlcnZpY2VzZXJ2aWNlVGFza0NvdW50VGFyZ2V0NDI2ODkxOEQnLFxuICAgICAgfSxcbiAgICAgIFRhcmdldFRyYWNraW5nU2NhbGluZ1BvbGljeUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgUHJlZGVmaW5lZE1ldHJpY1NwZWNpZmljYXRpb246IHtcbiAgICAgICAgICBQcmVkZWZpbmVkTWV0cmljVHlwZTogJ0VDU1NlcnZpY2VBdmVyYWdlQ1BVVXRpbGl6YXRpb24nLFxuICAgICAgICB9LFxuICAgICAgICBTY2FsZUluQ29vbGRvd246IDYwLFxuICAgICAgICBTY2FsZU91dENvb2xkb3duOiA2MCxcbiAgICAgICAgVGFyZ2V0VmFsdWU6IDUwLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnc2hvdWxkIGJlIGFibGUgdG8gc2V0IGEgY3VzdG9tIHNjYWxpbmcgcG9saWN5IGFzIHdlbGwnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBTY2FsZU9uQ3B1VXRpbGl6YXRpb24oe1xuICAgICAgaW5pdGlhbFRhc2tDb3VudDogMjUsXG4gICAgICBtaW5UYXNrQ291bnQ6IDE1LFxuICAgICAgbWF4VGFza0NvdW50OiAzMCxcbiAgICAgIHRhcmdldENwdVV0aWxpemF0aW9uOiA3NSxcbiAgICAgIHNjYWxlSW5Db29sZG93bjogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMyksXG4gICAgICBzY2FsZU91dENvb2xkb3duOiBjZGsuRHVyYXRpb24ubWludXRlcygzKSxcbiAgICB9KSk7XG5cbiAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlNlcnZpY2UnLCB7XG4gICAgICBEZXBsb3ltZW50Q29uZmlndXJhdGlvbjoge1xuICAgICAgICBNYXhpbXVtUGVyY2VudDogMjAwLFxuICAgICAgICBNaW5pbXVtSGVhbHRoeVBlcmNlbnQ6IDEwMCxcbiAgICAgIH0sXG4gICAgICBEZXNpcmVkQ291bnQ6IDI1LFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnLCB7XG4gICAgICBNYXhDYXBhY2l0eTogMzAsXG4gICAgICBNaW5DYXBhY2l0eTogMTUsXG4gICAgfSk7XG5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsaW5nUG9saWN5Jywge1xuICAgICAgVGFyZ2V0VHJhY2tpbmdTY2FsaW5nUG9saWN5Q29uZmlndXJhdGlvbjoge1xuICAgICAgICBTY2FsZUluQ29vbGRvd246IDE4MCxcbiAgICAgICAgU2NhbGVPdXRDb29sZG93bjogMTgwLFxuICAgICAgICBUYXJnZXRWYWx1ZTogNzUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgZXJyb3IgaWYgY29uZmlndXJpbmcgYXV0b3NjYWxpbmcgdGFyZ2V0IGJvdGggaW4gdGhlIGV4dGVuc2lvbiBhbmQgdGhlIFNlcnZpY2UnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBTY2FsZU9uQ3B1VXRpbGl6YXRpb24oKSk7XG4gICAgLy8gVEhFTlxuICAgIGV4cGVjdCgoKSA9PiB7XG4gICAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICAgIGVudmlyb25tZW50LFxuICAgICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgICAgIGF1dG9TY2FsZVRhc2tDb3VudDoge1xuICAgICAgICAgIG1heFRhc2tDb3VudDogNSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pLnRvVGhyb3coJ0Nhbm5vdCBzcGVjaWZ5IFxcJ2F1dG9TY2FsZVRhc2tDb3VudFxcJyBpbiB0aGUgU2VydmljZSBjb25zdHJ1Y3QgYW5kIGFsc28gcHJvdmlkZSBhICBcXCdTY2FsZU9uQ3B1VXRpbGl6YXRpb25cXCcgZXh0ZW5zaW9uLiBcXCdTY2FsZU9uQ3B1VXRpbGl6YXRpb25cXCcgaXMgZGVwcmVjYXRlZC4gUGxlYXNlIG9ubHkgcHJvdmlkZSBcXCdhdXRvU2NhbGVUYXNrQ291bnRcXCcuJyk7XG4gIH0pO1xufSk7Il19