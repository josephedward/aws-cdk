"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const ecs = require("@aws-cdk/aws-ecs");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
describe('firelens', () => {
    test('should be able to add Firelens to a service', () => {
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
        serviceDescription.add(new lib_1.FireLensExtension());
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        // Ensure that the log group was created
        assertions_1.Template.fromStack(stack).hasResource('AWS::Logs::LogGroup', assertions_1.Match.anyValue());
        // Ensure that task has a Firelens sidecar and a log configuration
        // pointing at the sidecar
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    DependsOn: [
                        {
                            Condition: 'START',
                            ContainerName: 'firelens',
                        },
                    ],
                    Essential: true,
                    Image: 'nathanpeck/name',
                    LogConfiguration: {
                        LogDriver: 'awsfirelens',
                        Options: {
                            Name: 'cloudwatch',
                            region: {
                                Ref: 'AWS::Region',
                            },
                            log_group_name: {
                                Ref: 'myservicelogs176EE19F',
                            },
                            log_stream_prefix: 'my-service/',
                        },
                    },
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
                {
                    Essential: true,
                    FirelensConfiguration: {
                        Type: 'fluentbit',
                    },
                    Image: {
                        Ref: 'SsmParameterValueawsserviceawsforfluentbitlatestC96584B6F00A464EAD1953AFF4B05118Parameter',
                    },
                    LogConfiguration: {
                        LogDriver: 'awslogs',
                        Options: {
                            'awslogs-group': {
                                Ref: 'myservicetaskdefinitionfirelensLogGroup0D59B0EB',
                            },
                            'awslogs-stream-prefix': 'firelens',
                            'awslogs-region': {
                                Ref: 'AWS::Region',
                            },
                        },
                    },
                    MemoryReservation: 50,
                    Name: 'firelens',
                    User: '0:1338',
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlyZWxlbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpcmVsZW5zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxvREFBc0Q7QUFDdEQsd0NBQXdDO0FBQ3hDLHFDQUFxQztBQUNyQyxnQ0FBZ0c7QUFFaEcsUUFBUSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7SUFDeEIsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtRQUN2RCxRQUFRO1FBQ1IsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFOUIsT0FBTztRQUNQLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQVcsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDekQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLHdCQUFrQixFQUFFLENBQUM7UUFFcEQsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksZUFBUyxDQUFDO1lBQ25DLEdBQUcsRUFBRSxHQUFHO1lBQ1IsU0FBUyxFQUFFLEdBQUc7WUFDZCxXQUFXLEVBQUUsRUFBRTtZQUNmLEtBQUssRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztTQUMxRCxDQUFDLENBQUMsQ0FBQztRQUVKLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLHVCQUFpQixFQUFFLENBQUMsQ0FBQztRQUVoRCxJQUFJLGFBQU8sQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFO1lBQy9CLFdBQVc7WUFDWCxrQkFBa0I7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsT0FBTztRQUVQLHdDQUF3QztRQUN4QyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLENBQUMscUJBQXFCLEVBQUUsa0JBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRS9FLGtFQUFrRTtRQUNsRSwwQkFBMEI7UUFDMUIscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMscUJBQXFCLENBQUMsMEJBQTBCLEVBQUU7WUFDMUUsb0JBQW9CLEVBQUU7Z0JBQ3BCO29CQUNFLEdBQUcsRUFBRSxHQUFHO29CQUNSLFNBQVMsRUFBRTt3QkFDVDs0QkFDRSxTQUFTLEVBQUUsT0FBTzs0QkFDbEIsYUFBYSxFQUFFLFVBQVU7eUJBQzFCO3FCQUNGO29CQUNELFNBQVMsRUFBRSxJQUFJO29CQUNmLEtBQUssRUFBRSxpQkFBaUI7b0JBQ3hCLGdCQUFnQixFQUFFO3dCQUNoQixTQUFTLEVBQUUsYUFBYTt3QkFDeEIsT0FBTyxFQUFFOzRCQUNQLElBQUksRUFBRSxZQUFZOzRCQUNsQixNQUFNLEVBQUU7Z0NBQ04sR0FBRyxFQUFFLGFBQWE7NkJBQ25COzRCQUNELGNBQWMsRUFBRTtnQ0FDZCxHQUFHLEVBQUUsdUJBQXVCOzZCQUM3Qjs0QkFDRCxpQkFBaUIsRUFBRSxhQUFhO3lCQUNqQztxQkFDRjtvQkFDRCxNQUFNLEVBQUUsR0FBRztvQkFDWCxJQUFJLEVBQUUsS0FBSztvQkFDWCxZQUFZLEVBQUU7d0JBQ1o7NEJBQ0UsYUFBYSxFQUFFLEVBQUU7NEJBQ2pCLFFBQVEsRUFBRSxLQUFLO3lCQUNoQjtxQkFDRjtvQkFDRCxPQUFPLEVBQUU7d0JBQ1A7NEJBQ0UsU0FBUyxFQUFFLE9BQU87NEJBQ2xCLElBQUksRUFBRSxRQUFROzRCQUNkLFNBQVMsRUFBRSxPQUFPO3lCQUNuQjtxQkFDRjtpQkFDRjtnQkFDRDtvQkFDRSxTQUFTLEVBQUUsSUFBSTtvQkFDZixxQkFBcUIsRUFBRTt3QkFDckIsSUFBSSxFQUFFLFdBQVc7cUJBQ2xCO29CQUNELEtBQUssRUFBRTt3QkFDTCxHQUFHLEVBQUUsMkZBQTJGO3FCQUNqRztvQkFDRCxnQkFBZ0IsRUFBRTt3QkFDaEIsU0FBUyxFQUFFLFNBQVM7d0JBQ3BCLE9BQU8sRUFBRTs0QkFDUCxlQUFlLEVBQUU7Z0NBQ2YsR0FBRyxFQUFFLGlEQUFpRDs2QkFDdkQ7NEJBQ0QsdUJBQXVCLEVBQUUsVUFBVTs0QkFDbkMsZ0JBQWdCLEVBQUU7Z0NBQ2hCLEdBQUcsRUFBRSxhQUFhOzZCQUNuQjt5QkFDRjtxQkFDRjtvQkFDRCxpQkFBaUIsRUFBRSxFQUFFO29CQUNyQixJQUFJLEVBQUUsVUFBVTtvQkFDaEIsSUFBSSxFQUFFLFFBQVE7aUJBQ2Y7YUFDRjtZQUNELEdBQUcsRUFBRSxLQUFLO1lBQ1YsTUFBTSxFQUFFLHlCQUF5QjtZQUNqQyxNQUFNLEVBQUUsS0FBSztZQUNiLFdBQVcsRUFBRSxRQUFRO1lBQ3JCLHVCQUF1QixFQUFFO2dCQUN2QixLQUFLO2dCQUNMLFNBQVM7YUFDVjtZQUNELFdBQVcsRUFBRTtnQkFDWCxZQUFZLEVBQUU7b0JBQ1oseUNBQXlDO29CQUN6QyxLQUFLO2lCQUNOO2FBQ0Y7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTWF0Y2gsIFRlbXBsYXRlIH0gZnJvbSAnQGF3cy1jZGsvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBDb250YWluZXIsIEVudmlyb25tZW50LCBGaXJlTGVuc0V4dGVuc2lvbiwgU2VydmljZSwgU2VydmljZURlc2NyaXB0aW9uIH0gZnJvbSAnLi4vbGliJztcblxuZGVzY3JpYmUoJ2ZpcmVsZW5zJywgKCkgPT4ge1xuICB0ZXN0KCdzaG91bGQgYmUgYWJsZSB0byBhZGQgRmlyZWxlbnMgdG8gYSBzZXJ2aWNlJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgfSkpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgRmlyZUxlbnNFeHRlbnNpb24oKSk7XG5cbiAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cblxuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBsb2cgZ3JvdXAgd2FzIGNyZWF0ZWRcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlKCdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywgTWF0Y2guYW55VmFsdWUoKSk7XG5cbiAgICAvLyBFbnN1cmUgdGhhdCB0YXNrIGhhcyBhIEZpcmVsZW5zIHNpZGVjYXIgYW5kIGEgbG9nIGNvbmZpZ3VyYXRpb25cbiAgICAvLyBwb2ludGluZyBhdCB0aGUgc2lkZWNhclxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICBDb250YWluZXJEZWZpbml0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgQ3B1OiAyNTYsXG4gICAgICAgICAgRGVwZW5kc09uOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIENvbmRpdGlvbjogJ1NUQVJUJyxcbiAgICAgICAgICAgICAgQ29udGFpbmVyTmFtZTogJ2ZpcmVsZW5zJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBFc3NlbnRpYWw6IHRydWUsXG4gICAgICAgICAgSW1hZ2U6ICduYXRoYW5wZWNrL25hbWUnLFxuICAgICAgICAgIExvZ0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIExvZ0RyaXZlcjogJ2F3c2ZpcmVsZW5zJyxcbiAgICAgICAgICAgIE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgTmFtZTogJ2Nsb3Vkd2F0Y2gnLFxuICAgICAgICAgICAgICByZWdpb246IHtcbiAgICAgICAgICAgICAgICBSZWY6ICdBV1M6OlJlZ2lvbicsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGxvZ19ncm91cF9uYW1lOiB7XG4gICAgICAgICAgICAgICAgUmVmOiAnbXlzZXJ2aWNlbG9nczE3NkVFMTlGJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbG9nX3N0cmVhbV9wcmVmaXg6ICdteS1zZXJ2aWNlLycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgTWVtb3J5OiA1MTIsXG4gICAgICAgICAgTmFtZTogJ2FwcCcsXG4gICAgICAgICAgUG9ydE1hcHBpbmdzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIENvbnRhaW5lclBvcnQ6IDgwLFxuICAgICAgICAgICAgICBQcm90b2NvbDogJ3RjcCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgVWxpbWl0czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBIYXJkTGltaXQ6IDEwMjQwMDAsXG4gICAgICAgICAgICAgIE5hbWU6ICdub2ZpbGUnLFxuICAgICAgICAgICAgICBTb2Z0TGltaXQ6IDEwMjQwMDAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBFc3NlbnRpYWw6IHRydWUsXG4gICAgICAgICAgRmlyZWxlbnNDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICBUeXBlOiAnZmx1ZW50Yml0JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIEltYWdlOiB7XG4gICAgICAgICAgICBSZWY6ICdTc21QYXJhbWV0ZXJWYWx1ZWF3c3NlcnZpY2Vhd3Nmb3JmbHVlbnRiaXRsYXRlc3RDOTY1ODRCNkYwMEE0NjRFQUQxOTUzQUZGNEIwNTExOFBhcmFtZXRlcicsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBMb2dDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICBMb2dEcml2ZXI6ICdhd3Nsb2dzJyxcbiAgICAgICAgICAgIE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgJ2F3c2xvZ3MtZ3JvdXAnOiB7XG4gICAgICAgICAgICAgICAgUmVmOiAnbXlzZXJ2aWNldGFza2RlZmluaXRpb25maXJlbGVuc0xvZ0dyb3VwMEQ1OUIwRUInLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAnYXdzbG9ncy1zdHJlYW0tcHJlZml4JzogJ2ZpcmVsZW5zJyxcbiAgICAgICAgICAgICAgJ2F3c2xvZ3MtcmVnaW9uJzoge1xuICAgICAgICAgICAgICAgIFJlZjogJ0FXUzo6UmVnaW9uJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBNZW1vcnlSZXNlcnZhdGlvbjogNTAsXG4gICAgICAgICAgTmFtZTogJ2ZpcmVsZW5zJyxcbiAgICAgICAgICBVc2VyOiAnMDoxMzM4JyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBDcHU6ICcyNTYnLFxuICAgICAgRmFtaWx5OiAnbXlzZXJ2aWNldGFza2RlZmluaXRpb24nLFxuICAgICAgTWVtb3J5OiAnNTEyJyxcbiAgICAgIE5ldHdvcmtNb2RlOiAnYXdzdnBjJyxcbiAgICAgIFJlcXVpcmVzQ29tcGF0aWJpbGl0aWVzOiBbXG4gICAgICAgICdFQzInLFxuICAgICAgICAnRkFSR0FURScsXG4gICAgICBdLFxuICAgICAgVGFza1JvbGVBcm46IHtcbiAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgJ215c2VydmljZXRhc2tkZWZpbml0aW9uVGFza1JvbGU5MkFDRDkwMycsXG4gICAgICAgICAgJ0FybicsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcbn0pOyJdfQ==