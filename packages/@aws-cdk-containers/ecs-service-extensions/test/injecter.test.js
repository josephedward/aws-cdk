"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const ecs = require("@aws-cdk/aws-ecs");
const sns = require("@aws-cdk/aws-sns");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
describe('injecter', () => {
    test('correctly sets publish permissions for given topics', () => {
        // GIVEN
        const stack = new cdk.Stack();
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
            environment: {
                PORT: '80',
            },
        }));
        // WHEN
        const topic1 = new lib_1.InjectableTopic({
            topic: new sns.Topic(stack, 'topic1'),
        });
        const topic2 = new lib_1.InjectableTopic({
            topic: new sns.Topic(stack, 'topic2'),
        });
        serviceDescription.add(new lib_1.InjecterExtension({
            injectables: [topic1, topic2],
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        // Ensure creation of provided topics
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::SNS::Topic', 2);
        // Ensure the task role is given permissions to publish events to topics
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 'sns:Publish',
                        Effect: 'Allow',
                        Resource: {
                            Ref: 'topic152D84A37',
                        },
                    },
                    {
                        Action: 'sns:Publish',
                        Effect: 'Allow',
                        Resource: {
                            Ref: 'topic2A4FB547F',
                        },
                    },
                ],
                Version: '2012-10-17',
            },
        });
        // Ensure that the topic ARNs have been correctly appended to the environment variables
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    Environment: [
                        {
                            Name: 'PORT',
                            Value: '80',
                        },
                        {
                            Name: 'TOPIC1_TOPIC_ARN',
                            Value: {
                                Ref: 'topic152D84A37',
                            },
                        },
                        {
                            Name: 'TOPIC2_TOPIC_ARN',
                            Value: {
                                Ref: 'topic2A4FB547F',
                            },
                        },
                    ],
                    Image: 'nathanpeck/name',
                    Essential: true,
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
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluamVjdGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxvREFBK0M7QUFDL0Msd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4QyxxQ0FBcUM7QUFDckMsZ0NBQWlIO0FBRWpILFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0lBQ3hCLElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDL0QsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTlCLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQVcsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDekQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLHdCQUFrQixFQUFFLENBQUM7UUFFcEQsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksZUFBUyxDQUFDO1lBQ25DLEdBQUcsRUFBRSxHQUFHO1lBQ1IsU0FBUyxFQUFFLEdBQUc7WUFDZCxXQUFXLEVBQUUsRUFBRTtZQUNmLEtBQUssRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztZQUN6RCxXQUFXLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLElBQUk7YUFDWDtTQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTztRQUNQLE1BQU0sTUFBTSxHQUFHLElBQUkscUJBQWUsQ0FBQztZQUNqQyxLQUFLLEVBQUUsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUM7U0FDdEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUcsSUFBSSxxQkFBZSxDQUFDO1lBQ2pDLEtBQUssRUFBRSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQztTQUN0QyxDQUFDLENBQUM7UUFFSCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBaUIsQ0FBQztZQUMzQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO1NBQzlCLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxhQUFPLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRTtZQUMvQixXQUFXO1lBQ1gsa0JBQWtCO1NBQ25CLENBQUMsQ0FBQztRQUVILE9BQU87UUFDUCxxQ0FBcUM7UUFDckMscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsZUFBZSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWhFLHdFQUF3RTtRQUN4RSxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxrQkFBa0IsRUFBRTtZQUNsRSxjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFO29CQUNUO3dCQUNFLE1BQU0sRUFBRSxhQUFhO3dCQUNyQixNQUFNLEVBQUUsT0FBTzt3QkFDZixRQUFRLEVBQUU7NEJBQ1IsR0FBRyxFQUFFLGdCQUFnQjt5QkFDdEI7cUJBQ0Y7b0JBQ0Q7d0JBQ0UsTUFBTSxFQUFFLGFBQWE7d0JBQ3JCLE1BQU0sRUFBRSxPQUFPO3dCQUNmLFFBQVEsRUFBRTs0QkFDUixHQUFHLEVBQUUsZ0JBQWdCO3lCQUN0QjtxQkFDRjtpQkFDRjtnQkFDRCxPQUFPLEVBQUUsWUFBWTthQUN0QjtTQUNGLENBQUMsQ0FBQztRQUVILHVGQUF1RjtRQUN2RixxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQywwQkFBMEIsRUFBRTtZQUMxRSxvQkFBb0IsRUFBRTtnQkFDcEI7b0JBQ0UsR0FBRyxFQUFFLEdBQUc7b0JBQ1IsV0FBVyxFQUFFO3dCQUNYOzRCQUNFLElBQUksRUFBRSxNQUFNOzRCQUNaLEtBQUssRUFBRSxJQUFJO3lCQUNaO3dCQUNEOzRCQUNFLElBQUksRUFBRSxrQkFBa0I7NEJBQ3hCLEtBQUssRUFBRTtnQ0FDTCxHQUFHLEVBQUUsZ0JBQWdCOzZCQUN0Qjt5QkFDRjt3QkFDRDs0QkFDRSxJQUFJLEVBQUUsa0JBQWtCOzRCQUN4QixLQUFLLEVBQUU7Z0NBQ0wsR0FBRyxFQUFFLGdCQUFnQjs2QkFDdEI7eUJBQ0Y7cUJBQ0Y7b0JBQ0QsS0FBSyxFQUFFLGlCQUFpQjtvQkFDeEIsU0FBUyxFQUFFLElBQUk7b0JBQ2YsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsSUFBSSxFQUFFLEtBQUs7b0JBQ1gsWUFBWSxFQUFFO3dCQUNaOzRCQUNFLGFBQWEsRUFBRSxFQUFFOzRCQUNqQixRQUFRLEVBQUUsS0FBSzt5QkFDaEI7cUJBQ0Y7b0JBQ0QsT0FBTyxFQUFFO3dCQUNQOzRCQUNFLFNBQVMsRUFBRSxPQUFPOzRCQUNsQixJQUFJLEVBQUUsUUFBUTs0QkFDZCxTQUFTLEVBQUUsT0FBTzt5QkFDbkI7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUZW1wbGF0ZSB9IGZyb20gJ0Bhd3MtY2RrL2Fzc2VydGlvbnMnO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ0Bhd3MtY2RrL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgc25zIGZyb20gJ0Bhd3MtY2RrL2F3cy1zbnMnO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgQ29udGFpbmVyLCBFbnZpcm9ubWVudCwgSW5qZWN0ZXJFeHRlbnNpb24sIEluamVjdGFibGVUb3BpYywgU2VydmljZSwgU2VydmljZURlc2NyaXB0aW9uIH0gZnJvbSAnLi4vbGliJztcblxuZGVzY3JpYmUoJ2luamVjdGVyJywgKCkgPT4ge1xuICB0ZXN0KCdjb3JyZWN0bHkgc2V0cyBwdWJsaXNoIHBlcm1pc3Npb25zIGZvciBnaXZlbiB0b3BpY3MnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUE9SVDogJzgwJyxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHRvcGljMSA9IG5ldyBJbmplY3RhYmxlVG9waWMoe1xuICAgICAgdG9waWM6IG5ldyBzbnMuVG9waWMoc3RhY2ssICd0b3BpYzEnKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHRvcGljMiA9IG5ldyBJbmplY3RhYmxlVG9waWMoe1xuICAgICAgdG9waWM6IG5ldyBzbnMuVG9waWMoc3RhY2ssICd0b3BpYzInKSxcbiAgICB9KTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IEluamVjdGVyRXh0ZW5zaW9uKHtcbiAgICAgIGluamVjdGFibGVzOiBbdG9waWMxLCB0b3BpYzJdLFxuICAgIH0pKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gVEhFTlxuICAgIC8vIEVuc3VyZSBjcmVhdGlvbiBvZiBwcm92aWRlZCB0b3BpY3NcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLnJlc291cmNlQ291bnRJcygnQVdTOjpTTlM6OlRvcGljJywgMik7XG5cbiAgICAvLyBFbnN1cmUgdGhlIHRhc2sgcm9sZSBpcyBnaXZlbiBwZXJtaXNzaW9ucyB0byBwdWJsaXNoIGV2ZW50cyB0byB0b3BpY3NcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlBvbGljeScsIHtcbiAgICAgIFBvbGljeURvY3VtZW50OiB7XG4gICAgICAgIFN0YXRlbWVudDogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEFjdGlvbjogJ3NuczpQdWJsaXNoJyxcbiAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgIFJlc291cmNlOiB7XG4gICAgICAgICAgICAgIFJlZjogJ3RvcGljMTUyRDg0QTM3JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBBY3Rpb246ICdzbnM6UHVibGlzaCcsXG4gICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICBSZXNvdXJjZToge1xuICAgICAgICAgICAgICBSZWY6ICd0b3BpYzJBNEZCNTQ3RicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIFZlcnNpb246ICcyMDEyLTEwLTE3JyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBFbnN1cmUgdGhhdCB0aGUgdG9waWMgQVJOcyBoYXZlIGJlZW4gY29ycmVjdGx5IGFwcGVuZGVkIHRvIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJywge1xuICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIENwdTogMjU2LFxuICAgICAgICAgIEVudmlyb25tZW50OiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIE5hbWU6ICdQT1JUJyxcbiAgICAgICAgICAgICAgVmFsdWU6ICc4MCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBOYW1lOiAnVE9QSUMxX1RPUElDX0FSTicsXG4gICAgICAgICAgICAgIFZhbHVlOiB7XG4gICAgICAgICAgICAgICAgUmVmOiAndG9waWMxNTJEODRBMzcnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogJ1RPUElDMl9UT1BJQ19BUk4nLFxuICAgICAgICAgICAgICBWYWx1ZToge1xuICAgICAgICAgICAgICAgIFJlZjogJ3RvcGljMkE0RkI1NDdGJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBJbWFnZTogJ25hdGhhbnBlY2svbmFtZScsXG4gICAgICAgICAgRXNzZW50aWFsOiB0cnVlLFxuICAgICAgICAgIE1lbW9yeTogNTEyLFxuICAgICAgICAgIE5hbWU6ICdhcHAnLFxuICAgICAgICAgIFBvcnRNYXBwaW5nczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBDb250YWluZXJQb3J0OiA4MCxcbiAgICAgICAgICAgICAgUHJvdG9jb2w6ICd0Y3AnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIFVsaW1pdHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgSGFyZExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgICBOYW1lOiAnbm9maWxlJyxcbiAgICAgICAgICAgICAgU29mdExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcbiAgfSk7XG59KTsiXX0=