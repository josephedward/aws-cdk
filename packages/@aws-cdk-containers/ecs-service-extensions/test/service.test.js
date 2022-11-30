"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const ecs = require("@aws-cdk/aws-ecs");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
describe('service', () => {
    test('should error if a service is prepared with no addons', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        // THEN
        expect(() => {
            new lib_1.Service(stack, 'my-service', {
                environment,
                serviceDescription,
            });
        }).toThrow(/Service 'my-service' must have a Container extension/);
    });
    test('allows scaling on a target CPU utilization', () => {
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
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            desiredCount: 3,
            autoScaleTaskCount: {
                maxTaskCount: 5,
                targetCpuUtilization: 70,
            },
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            DesiredCount: assertions_1.Match.absent(),
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MaxCapacity: 5,
            MinCapacity: 1,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            PolicyType: 'TargetTrackingScaling',
            TargetTrackingScalingPolicyConfiguration: {
                PredefinedMetricSpecification: { PredefinedMetricType: 'ECSServiceAverageCPUUtilization' },
                TargetValue: 70,
            },
        });
    });
    test('allows scaling on a target memory utilization', () => {
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
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            desiredCount: 3,
            autoScaleTaskCount: {
                maxTaskCount: 5,
                targetMemoryUtilization: 70,
            },
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            DesiredCount: assertions_1.Match.absent(),
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MaxCapacity: 5,
            MinCapacity: 1,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            PolicyType: 'TargetTrackingScaling',
            TargetTrackingScalingPolicyConfiguration: {
                PredefinedMetricSpecification: { PredefinedMetricType: 'ECSServiceAverageMemoryUtilization' },
                TargetValue: 70,
            },
        });
    });
    test('should error when no auto scaling policies have been configured after creating the auto scaling target', () => {
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
        // THEN
        expect(() => {
            new lib_1.Service(stack, 'my-service', {
                environment,
                serviceDescription,
                autoScaleTaskCount: {
                    maxTaskCount: 5,
                },
            });
        }).toThrow(/The auto scaling target for the service 'my-service' has been created but no auto scaling policies have been configured./);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsb0RBQXNEO0FBQ3RELHdDQUF3QztBQUN4QyxxQ0FBcUM7QUFDckMsZ0NBQTZFO0FBRTdFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLElBQUksQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUU7UUFDaEUsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTlCLE9BQU87UUFDUCxNQUFNLFdBQVcsR0FBRyxJQUFJLGlCQUFXLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx3QkFBa0IsRUFBRSxDQUFDO1FBRXBELE9BQU87UUFDUCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1YsSUFBSSxhQUFPLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRTtnQkFDL0IsV0FBVztnQkFDWCxrQkFBa0I7YUFDbkIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLHNEQUFzRCxDQUFDLENBQUM7SUFDckUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3RELFFBQVE7UUFDUixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU5QixPQUFPO1FBQ1AsTUFBTSxXQUFXLEdBQUcsSUFBSSxpQkFBVyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN6RCxNQUFNLGtCQUFrQixHQUFHLElBQUksd0JBQWtCLEVBQUUsQ0FBQztRQUNwRCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFTLENBQUM7WUFDbkMsR0FBRyxFQUFFLEdBQUc7WUFDUixTQUFTLEVBQUUsR0FBRztZQUNk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UUFBUTtRQUNSLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTlCLE9BQU87UUFDUCxNQUFNLFdBQVcsR0FBRyxJQUFJLGlCQUFXLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx3QkFBa0IsRUFBRSxDQUFDO1FBRXBELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQVMsQ0FBQztZQUNuQyxHQUFHLEVBQUUsR0FBRztZQUNSLFNBQVMsRUFBRSxHQUFHO1lBQ2QsV0FBVyxFQUFFLEVBQUU7WUFDZixLQUFLLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUM7U0FDMUQsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPO1FBQ1AsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNWLElBQUksYUFBTyxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUU7Z0JBQy9CLFdBQVc7Z0JBQ1gsa0JBQWtCO2dCQUNsQixrQkFBa0IsRUFBRTtvQkFDbEIsWUFBWSxFQUFFLENBQUM7aUJBQ2hCO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLDBIQUEwSCxDQUFDLENBQUM7SUFDekksQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1hdGNoLCBUZW1wbGF0ZSB9IGZyb20gJ0Bhd3MtY2RrL2Fzc2VydGlvbnMnO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ0Bhd3MtY2RrL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgQ29udGFpbmVyLCBFbnZpcm9ubWVudCwgU2VydmljZSwgU2VydmljZURlc2NyaXB0aW9uIH0gZnJvbSAnLi4vbGliJztcblxuZGVzY3JpYmUoJ3NlcnZpY2UnLCAoKSA9PiB7XG4gIHRlc3QoJ3Nob3VsZCBlcnJvciBpZiBhIHNlcnZpY2UgaXMgcHJlcGFyZWQgd2l0aCBubyBhZGRvbnMnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KCgpID0+IHtcbiAgICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgICAgZW52aXJvbm1lbnQsXG4gICAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICAgIH0pO1xuICAgIH0pLnRvVGhyb3coL1NlcnZpY2UgJ215LXNlcnZpY2UnIG11c3QgaGF2ZSBhIENvbnRhaW5lciBleHRlbnNpb24vKTtcbiAgfSk7XG5cbiAgdGVzdCgnYWxsb3dzIHNjYWxpbmcgb24gYSB0YXJnZXQgQ1BVIHV0aWxpemF0aW9uJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgZGVzaXJlZENvdW50OiAzLFxuICAgICAgYXV0b1NjYWxlVGFza0NvdW50OiB7XG4gICAgICAgIG1heFRhc2tDb3VudDogNSxcbiAgICAgICAgdGFyZ2V0Q3B1VXRpbGl6YXRpb246IDcwLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlNlcnZpY2UnLCB7XG4gICAgICBEZXNpcmVkQ291bnQ6IE1hdGNoLmFic2VudCgpLFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnLCB7XG4gICAgICBNYXhDYXBhY2l0eTogNSxcbiAgICAgIE1pbkNhcGFjaXR5OiAxLFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGluZ1BvbGljeScsIHtcbiAgICAgIFBvbGljeVR5cGU6ICdUYXJnZXRUcmFja2luZ1NjYWxpbmcnLFxuICAgICAgVGFyZ2V0VHJhY2tpbmdTY2FsaW5nUG9saWN5Q29uZmlndXJhdGlvbjoge1xuICAgICAgICBQcmVkZWZpbmVkTWV0cmljU3BlY2lmaWNhdGlvbjogeyBQcmVkZWZpbmVkTWV0cmljVHlwZTogJ0VDU1NlcnZpY2VBdmVyYWdlQ1BVVXRpbGl6YXRpb24nIH0sXG4gICAgICAgIFRhcmdldFZhbHVlOiA3MCxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2FsbG93cyBzY2FsaW5nIG9uIGEgdGFyZ2V0IG1lbW9yeSB1dGlsaXphdGlvbicsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICAgIGRlc2lyZWRDb3VudDogMyxcbiAgICAgIGF1dG9TY2FsZVRhc2tDb3VudDoge1xuICAgICAgICBtYXhUYXNrQ291bnQ6IDUsXG4gICAgICAgIHRhcmdldE1lbW9yeVV0aWxpemF0aW9uOiA3MCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgRGVzaXJlZENvdW50OiBNYXRjaC5hYnNlbnQoKSxcbiAgICB9KTtcblxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxhYmxlVGFyZ2V0Jywge1xuICAgICAgTWF4Q2FwYWNpdHk6IDUsXG4gICAgICBNaW5DYXBhY2l0eTogMSxcbiAgICB9KTtcblxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxpbmdQb2xpY3knLCB7XG4gICAgICBQb2xpY3lUeXBlOiAnVGFyZ2V0VHJhY2tpbmdTY2FsaW5nJyxcbiAgICAgIFRhcmdldFRyYWNraW5nU2NhbGluZ1BvbGljeUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgUHJlZGVmaW5lZE1ldHJpY1NwZWNpZmljYXRpb246IHsgUHJlZGVmaW5lZE1ldHJpY1R5cGU6ICdFQ1NTZXJ2aWNlQXZlcmFnZU1lbW9yeVV0aWxpemF0aW9uJyB9LFxuICAgICAgICBUYXJnZXRWYWx1ZTogNzAsXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgZXJyb3Igd2hlbiBubyBhdXRvIHNjYWxpbmcgcG9saWNpZXMgaGF2ZSBiZWVuIGNvbmZpZ3VyZWQgYWZ0ZXIgY3JlYXRpbmcgdGhlIGF1dG8gc2NhbGluZyB0YXJnZXQnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KCgpID0+IHtcbiAgICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgICAgZW52aXJvbm1lbnQsXG4gICAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICAgICAgYXV0b1NjYWxlVGFza0NvdW50OiB7XG4gICAgICAgICAgbWF4VGFza0NvdW50OiA1LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSkudG9UaHJvdygvVGhlIGF1dG8gc2NhbGluZyB0YXJnZXQgZm9yIHRoZSBzZXJ2aWNlICdteS1zZXJ2aWNlJyBoYXMgYmVlbiBjcmVhdGVkIGJ1dCBubyBhdXRvIHNjYWxpbmcgcG9saWNpZXMgaGF2ZSBiZWVuIGNvbmZpZ3VyZWQuLyk7XG4gIH0pO1xufSk7Il19