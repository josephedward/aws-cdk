"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const autoscaling = require("@aws-cdk/aws-autoscaling");
const ec2 = require("@aws-cdk/aws-ec2");
const ecs = require("@aws-cdk/aws-ecs");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
describe('environment', () => {
    test('should be able to add a service to an environment', () => {
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
        });
        // THEN
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::ECS::Service', 1);
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
    });
    test('should be able to create a Fargate environment with a given VPC and cluster', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const vpc = new ec2.Vpc(stack, 'VPC');
        const cluster = new ecs.Cluster(stack, 'Cluster', { vpc });
        const environment = new lib_1.Environment(stack, 'production', {
            vpc,
            cluster,
        });
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
        });
        // THEN
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::ECS::Service', 1);
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
    });
    test('should be able to create an environment for EC2', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
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
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::ECS::Service', 1);
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
    });
    test('should be able to create an environment from attributes', () => {
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
        // WHEN
        const environment = lib_1.Environment.fromEnvironmentAttributes(stack, 'Environment', {
            capacityType: lib_1.EnvironmentCapacityType.EC2,
            cluster: cluster,
        });
        // THEN
        expect(environment.capacityType).toEqual(lib_1.EnvironmentCapacityType.EC2);
        expect(environment.cluster).toEqual(cluster);
        expect(environment.vpc).toEqual(vpc);
        expect(environment.id).toEqual('Environment');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVudmlyb25tZW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxvREFBK0M7QUFDL0Msd0RBQXdEO0FBQ3hELHdDQUF3QztBQUN4Qyx3Q0FBd0M7QUFDeEMscUNBQXFDO0FBQ3JDLGdDQUFzRztBQUV0RyxRQUFRLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUMzQixJQUFJLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO1FBQzdELFFBQVE7UUFDUixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU5QixPQUFPO1FBQ1AsTUFBTSxXQUFXLEdBQUcsSUFBSSxpQkFBVyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN6RCxNQUFNLGtCQUFrQixHQUFHLElBQUksd0JBQWtCLEVBQUUsQ0FBQztRQUVwRCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFTLENBQUM7WUFDbkMsR0FBRyxFQUFFLEdBQUc7WUFDUixTQUFTLEVBQUUsR0FBRztZQUNkLFdBQVcsRUFBRSxFQUFFO1lBQ2YsS0FBSyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDO1NBQzFELENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxhQUFPLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRTtZQUMvQixXQUFXO1lBQ1gsa0JBQWtCO1NBQ25CLENBQUMsQ0FBQztRQUVILE9BQU87UUFDUCxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbEUscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMscUJBQXFCLENBQUMsMEJBQTBCLEVBQUU7WUFDMUUsb0JBQW9CLEVBQUU7Z0JBQ3BCO29CQUNFLEdBQUcsRUFB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LFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDaEQsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRlbXBsYXRlIH0gZnJvbSAnQGF3cy1jZGsvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgKiBhcyBhdXRvc2NhbGluZyBmcm9tICdAYXdzLWNkay9hd3MtYXV0b3NjYWxpbmcnO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ0Bhd3MtY2RrL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ0Bhd3MtY2RrL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgQ29udGFpbmVyLCBFbnZpcm9ubWVudCwgRW52aXJvbm1lbnRDYXBhY2l0eVR5cGUsIFNlcnZpY2UsIFNlcnZpY2VEZXNjcmlwdGlvbiB9IGZyb20gJy4uL2xpYic7XG5cbmRlc2NyaWJlKCdlbnZpcm9ubWVudCcsICgpID0+IHtcbiAgdGVzdCgnc2hvdWxkIGJlIGFibGUgdG8gYWRkIGEgc2VydmljZSB0byBhbiBlbnZpcm9ubWVudCcsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gVEhFTlxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykucmVzb3VyY2VDb3VudElzKCdBV1M6OkVDUzo6U2VydmljZScsIDEpO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgIENvbnRhaW5lckRlZmluaXRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBDcHU6IDI1NixcbiAgICAgICAgICBFc3NlbnRpYWw6IHRydWUsXG4gICAgICAgICAgSW1hZ2U6ICduYXRoYW5wZWNrL25hbWUnLFxuICAgICAgICAgIE1lbW9yeTogNTEyLFxuICAgICAgICAgIE5hbWU6ICdhcHAnLFxuICAgICAgICAgIFBvcnRNYXBwaW5nczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBDb250YWluZXJQb3J0OiA4MCxcbiAgICAgICAgICAgICAgUHJvdG9jb2w6ICd0Y3AnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIFVsaW1pdHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgSGFyZExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgICBOYW1lOiAnbm9maWxlJyxcbiAgICAgICAgICAgICAgU29mdExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIENwdTogJzI1NicsXG4gICAgICBGYW1pbHk6ICdteXNlcnZpY2V0YXNrZGVmaW5pdGlvbicsXG4gICAgICBNZW1vcnk6ICc1MTInLFxuICAgICAgTmV0d29ya01vZGU6ICdhd3N2cGMnLFxuICAgICAgUmVxdWlyZXNDb21wYXRpYmlsaXRpZXM6IFtcbiAgICAgICAgJ0VDMicsXG4gICAgICAgICdGQVJHQVRFJyxcbiAgICAgIF0sXG4gICAgICBUYXNrUm9sZUFybjoge1xuICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAnbXlzZXJ2aWNldGFza2RlZmluaXRpb25UYXNrUm9sZTkyQUNEOTAzJyxcbiAgICAgICAgICAnQXJuJyxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3Nob3VsZCBiZSBhYmxlIHRvIGNyZWF0ZSBhIEZhcmdhdGUgZW52aXJvbm1lbnQgd2l0aCBhIGdpdmVuIFZQQyBhbmQgY2x1c3RlcicsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHN0YWNrLCAnVlBDJyk7XG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBlY3MuQ2x1c3RlcihzdGFjaywgJ0NsdXN0ZXInLCB7IHZwYyB9KTtcblxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicsIHtcbiAgICAgIHZwYyxcbiAgICAgIGNsdXN0ZXIsXG4gICAgfSk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgfSkpO1xuXG4gICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywgMSk7XG5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJywge1xuICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIENwdTogMjU2LFxuICAgICAgICAgIEVzc2VudGlhbDogdHJ1ZSxcbiAgICAgICAgICBJbWFnZTogJ25hdGhhbnBlY2svbmFtZScsXG4gICAgICAgICAgTWVtb3J5OiA1MTIsXG4gICAgICAgICAgTmFtZTogJ2FwcCcsXG4gICAgICAgICAgUG9ydE1hcHBpbmdzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIENvbnRhaW5lclBvcnQ6IDgwLFxuICAgICAgICAgICAgICBQcm90b2NvbDogJ3RjcCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgVWxpbWl0czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBIYXJkTGltaXQ6IDEwMjQwMDAsXG4gICAgICAgICAgICAgIE5hbWU6ICdub2ZpbGUnLFxuICAgICAgICAgICAgICBTb2Z0TGltaXQ6IDEwMjQwMDAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgQ3B1OiAnMjU2JyxcbiAgICAgIEZhbWlseTogJ215c2VydmljZXRhc2tkZWZpbml0aW9uJyxcbiAgICAgIE1lbW9yeTogJzUxMicsXG4gICAgICBOZXR3b3JrTW9kZTogJ2F3c3ZwYycsXG4gICAgICBSZXF1aXJlc0NvbXBhdGliaWxpdGllczogW1xuICAgICAgICAnRUMyJyxcbiAgICAgICAgJ0ZBUkdBVEUnLFxuICAgICAgXSxcbiAgICAgIFRhc2tSb2xlQXJuOiB7XG4gICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICdteXNlcnZpY2V0YXNrZGVmaW5pdGlvblRhc2tSb2xlOTJBQ0Q5MDMnLFxuICAgICAgICAgICdBcm4nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnc2hvdWxkIGJlIGFibGUgdG8gY3JlYXRlIGFuIGVudmlyb25tZW50IGZvciBFQzInLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCB2cGMgPSBuZXcgZWMyLlZwYyhzdGFjaywgJ1ZQQycpO1xuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIoc3RhY2ssICdDbHVzdGVyJywgeyB2cGMgfSk7XG4gICAgY2x1c3Rlci5hZGRBc2dDYXBhY2l0eVByb3ZpZGVyKG5ldyBlY3MuQXNnQ2FwYWNpdHlQcm92aWRlcihzdGFjaywgJ1Byb3ZpZGVyJywge1xuICAgICAgYXV0b1NjYWxpbmdHcm91cDogbmV3IGF1dG9zY2FsaW5nLkF1dG9TY2FsaW5nR3JvdXAoc3RhY2ssICdEZWZhdWx0QXV0b1NjYWxpbmdHcm91cCcsIHtcbiAgICAgICAgdnBjLFxuICAgICAgICBtYWNoaW5lSW1hZ2U6IGVjMi5NYWNoaW5lSW1hZ2UubGF0ZXN0QW1hem9uTGludXgoKSxcbiAgICAgICAgaW5zdGFuY2VUeXBlOiBuZXcgZWMyLkluc3RhbmNlVHlwZSgndDIubWljcm8nKSxcbiAgICAgIH0pLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicsIHtcbiAgICAgIHZwYyxcbiAgICAgIGNsdXN0ZXIsXG4gICAgICBjYXBhY2l0eVR5cGU6IEVudmlyb25tZW50Q2FwYWNpdHlUeXBlLkVDMixcbiAgICB9KTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLnJlc291cmNlQ291bnRJcygnQVdTOjpFQ1M6OlNlcnZpY2UnLCAxKTtcblxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICBDb250YWluZXJEZWZpbml0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgQ3B1OiAyNTYsXG4gICAgICAgICAgRXNzZW50aWFsOiB0cnVlLFxuICAgICAgICAgIEltYWdlOiAnbmF0aGFucGVjay9uYW1lJyxcbiAgICAgICAgICBNZW1vcnk6IDUxMixcbiAgICAgICAgICBOYW1lOiAnYXBwJyxcbiAgICAgICAgICBQb3J0TWFwcGluZ3M6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgQ29udGFpbmVyUG9ydDogODAsXG4gICAgICAgICAgICAgIFByb3RvY29sOiAndGNwJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBVbGltaXRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIEhhcmRMaW1pdDogMTAyNDAwMCxcbiAgICAgICAgICAgICAgTmFtZTogJ25vZmlsZScsXG4gICAgICAgICAgICAgIFNvZnRMaW1pdDogMTAyNDAwMCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBDcHU6ICcyNTYnLFxuICAgICAgRmFtaWx5OiAnbXlzZXJ2aWNldGFza2RlZmluaXRpb24nLFxuICAgICAgTWVtb3J5OiAnNTEyJyxcbiAgICAgIE5ldHdvcmtNb2RlOiAnYXdzdnBjJyxcbiAgICAgIFJlcXVpcmVzQ29tcGF0aWJpbGl0aWVzOiBbXG4gICAgICAgICdFQzInLFxuICAgICAgICAnRkFSR0FURScsXG4gICAgICBdLFxuICAgICAgVGFza1JvbGVBcm46IHtcbiAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgJ215c2VydmljZXRhc2tkZWZpbml0aW9uVGFza1JvbGU5MkFDRDkwMycsXG4gICAgICAgICAgJ0FybicsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgYmUgYWJsZSB0byBjcmVhdGUgYW4gZW52aXJvbm1lbnQgZnJvbSBhdHRyaWJ1dGVzJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG5cbiAgICBjb25zdCB2cGMgPSBuZXcgZWMyLlZwYyhzdGFjaywgJ1ZQQycpO1xuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIoc3RhY2ssICdDbHVzdGVyJywgeyB2cGMgfSk7XG4gICAgY2x1c3Rlci5hZGRBc2dDYXBhY2l0eVByb3ZpZGVyKG5ldyBlY3MuQXNnQ2FwYWNpdHlQcm92aWRlcihzdGFjaywgJ1Byb3ZpZGVyJywge1xuICAgICAgYXV0b1NjYWxpbmdHcm91cDogbmV3IGF1dG9zY2FsaW5nLkF1dG9TY2FsaW5nR3JvdXAoc3RhY2ssICdEZWZhdWx0QXV0b1NjYWxpbmdHcm91cCcsIHtcbiAgICAgICAgdnBjLFxuICAgICAgICBtYWNoaW5lSW1hZ2U6IGVjMi5NYWNoaW5lSW1hZ2UubGF0ZXN0QW1hem9uTGludXgoKSxcbiAgICAgICAgaW5zdGFuY2VUeXBlOiBuZXcgZWMyLkluc3RhbmNlVHlwZSgndDIubWljcm8nKSxcbiAgICAgIH0pLFxuICAgIH0pKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IEVudmlyb25tZW50LmZyb21FbnZpcm9ubWVudEF0dHJpYnV0ZXMoc3RhY2ssICdFbnZpcm9ubWVudCcsIHtcbiAgICAgIGNhcGFjaXR5VHlwZTogRW52aXJvbm1lbnRDYXBhY2l0eVR5cGUuRUMyLFxuICAgICAgY2x1c3RlcjogY2x1c3RlcixcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoZW52aXJvbm1lbnQuY2FwYWNpdHlUeXBlKS50b0VxdWFsKEVudmlyb25tZW50Q2FwYWNpdHlUeXBlLkVDMik7XG4gICAgZXhwZWN0KGVudmlyb25tZW50LmNsdXN0ZXIpLnRvRXF1YWwoY2x1c3Rlcik7XG4gICAgZXhwZWN0KGVudmlyb25tZW50LnZwYykudG9FcXVhbCh2cGMpO1xuICAgIGV4cGVjdChlbnZpcm9ubWVudC5pZCkudG9FcXVhbCgnRW52aXJvbm1lbnQnKTtcbiAgfSk7XG59KTtcbiJdfQ==