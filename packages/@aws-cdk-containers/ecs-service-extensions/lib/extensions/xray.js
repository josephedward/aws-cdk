"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XRayExtension = void 0;
const ecs = require("@aws-cdk/aws-ecs");
const iam = require("@aws-cdk/aws-iam");
const cdk = require("@aws-cdk/core");
const extension_interfaces_1 = require("./extension-interfaces");
const XRAY_DAEMON_IMAGE = 'amazon/aws-xray-daemon:latest';
/**
 * This extension adds an X-Ray daemon inside the task definition for
 * capturing application trace spans and submitting them to the AWS
 * X-Ray service.
 */
class XRayExtension extends extension_interfaces_1.ServiceExtension {
    constructor() {
        super('xray');
    }
    // @ts-ignore - Ignore unused params that are required for abstract class extend
    prehook(service, scope) {
        this.parentService = service;
    }
    useTaskDefinition(taskDefinition) {
        // Add the XRay Daemon to the task
        this.container = taskDefinition.addContainer('xray', {
            image: ecs.ContainerImage.fromRegistry(XRAY_DAEMON_IMAGE),
            essential: true,
            memoryReservationMiB: 256,
            environment: {
                AWS_REGION: cdk.Stack.of(this.parentService).region,
            },
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    'curl -s http://localhost:2000',
                ],
                startPeriod: cdk.Duration.seconds(10),
                interval: cdk.Duration.seconds(5),
                timeout: cdk.Duration.seconds(2),
                retries: 3,
            },
            logging: new ecs.AwsLogDriver({ streamPrefix: 'xray' }),
            user: '1337',
        });
        // Add permissions to this task to allow it to talk to X-Ray
        taskDefinition.taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'));
    }
    resolveContainerDependencies() {
        if (!this.container) {
            throw new Error('The container dependency hook was called before the container was created');
        }
        const appmeshextension = this.parentService.serviceDescription.get('appmesh');
        if (appmeshextension && appmeshextension.container) {
            this.container.addContainerDependencies({
                container: appmeshextension.container,
                condition: ecs.ContainerDependencyCondition.HEALTHY,
            });
        }
    }
}
exports.XRayExtension = XRayExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHJheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInhyYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4QyxxQ0FBcUM7QUFHckMsaUVBQTBEO0FBRTFELE1BQU0saUJBQWlCLEdBQUcsK0JBQStCLENBQUM7QUFFMUQ7Ozs7R0FJRztBQUNILE1BQWEsYUFBYyxTQUFRLHVDQUFnQjtJQUNqRDtRQUNFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoQixDQUFDO0lBRUQsZ0ZBQWdGO0lBQ3pFLE9BQU8sQ0FBQyxPQUFnQixFQUFFLEtBQWdCO1FBQy9DLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDO0lBQy9CLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxjQUFrQztRQUN6RCxrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRTtZQUNuRCxLQUFLLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUM7WUFDekQsU0FBUyxFQUFFLElBQUk7WUFDZixvQkFBb0IsRUFBRSxHQUFHO1lBQ3pCLFdBQVcsRUFBRTtnQkFDWCxVQUFVLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU07YUFDcEQ7WUFDRCxXQUFXLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFO29CQUNQLFdBQVc7b0JBQ1gsK0JBQStCO2lCQUNoQztnQkFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxPQUFPLEVBQUUsQ0FBQzthQUNYO1lBQ0QsT0FBTyxFQUFFLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUN2RCxJQUFJLEVBQUUsTUFBTTtTQUNiLENBQUMsQ0FBQztRQUVILDREQUE0RDtRQUM1RCxjQUFjLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUN0QyxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDBCQUEwQixDQUFDLENBQ3ZFLENBQUM7SUFDSixDQUFDO0lBRU0sNEJBQTRCO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsMkVBQTJFLENBQUMsQ0FBQztTQUM5RjtRQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUUsSUFBSSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUU7WUFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQztnQkFDdEMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLFNBQVM7Z0JBQ3JDLFNBQVMsRUFBRSxHQUFHLENBQUMsNEJBQTRCLENBQUMsT0FBTzthQUNwRCxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FDRjtBQXBERCxzQ0FvREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnQGF3cy1jZGsvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFNlcnZpY2UgfSBmcm9tICcuLi9zZXJ2aWNlJztcbmltcG9ydCB7IFNlcnZpY2VFeHRlbnNpb24gfSBmcm9tICcuL2V4dGVuc2lvbi1pbnRlcmZhY2VzJztcblxuY29uc3QgWFJBWV9EQUVNT05fSU1BR0UgPSAnYW1hem9uL2F3cy14cmF5LWRhZW1vbjpsYXRlc3QnO1xuXG4vKipcbiAqIFRoaXMgZXh0ZW5zaW9uIGFkZHMgYW4gWC1SYXkgZGFlbW9uIGluc2lkZSB0aGUgdGFzayBkZWZpbml0aW9uIGZvclxuICogY2FwdHVyaW5nIGFwcGxpY2F0aW9uIHRyYWNlIHNwYW5zIGFuZCBzdWJtaXR0aW5nIHRoZW0gdG8gdGhlIEFXU1xuICogWC1SYXkgc2VydmljZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFhSYXlFeHRlbnNpb24gZXh0ZW5kcyBTZXJ2aWNlRXh0ZW5zaW9uIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoJ3hyYXknKTtcbiAgfVxuXG4gIC8vIEB0cy1pZ25vcmUgLSBJZ25vcmUgdW51c2VkIHBhcmFtcyB0aGF0IGFyZSByZXF1aXJlZCBmb3IgYWJzdHJhY3QgY2xhc3MgZXh0ZW5kXG4gIHB1YmxpYyBwcmVob29rKHNlcnZpY2U6IFNlcnZpY2UsIHNjb3BlOiBDb25zdHJ1Y3QpIHtcbiAgICB0aGlzLnBhcmVudFNlcnZpY2UgPSBzZXJ2aWNlO1xuICB9XG5cbiAgcHVibGljIHVzZVRhc2tEZWZpbml0aW9uKHRhc2tEZWZpbml0aW9uOiBlY3MuVGFza0RlZmluaXRpb24pIHtcbiAgICAvLyBBZGQgdGhlIFhSYXkgRGFlbW9uIHRvIHRoZSB0YXNrXG4gICAgdGhpcy5jb250YWluZXIgPSB0YXNrRGVmaW5pdGlvbi5hZGRDb250YWluZXIoJ3hyYXknLCB7XG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeShYUkFZX0RBRU1PTl9JTUFHRSksXG4gICAgICBlc3NlbnRpYWw6IHRydWUsXG4gICAgICBtZW1vcnlSZXNlcnZhdGlvbk1pQjogMjU2LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgQVdTX1JFR0lPTjogY2RrLlN0YWNrLm9mKHRoaXMucGFyZW50U2VydmljZSkucmVnaW9uLFxuICAgICAgfSxcbiAgICAgIGhlYWx0aENoZWNrOiB7XG4gICAgICAgIGNvbW1hbmQ6IFtcbiAgICAgICAgICAnQ01ELVNIRUxMJyxcbiAgICAgICAgICAnY3VybCAtcyBodHRwOi8vbG9jYWxob3N0OjIwMDAnLFxuICAgICAgICBdLFxuICAgICAgICBzdGFydFBlcmlvZDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXG4gICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDIpLFxuICAgICAgICByZXRyaWVzOiAzLFxuICAgICAgfSxcbiAgICAgIGxvZ2dpbmc6IG5ldyBlY3MuQXdzTG9nRHJpdmVyKHsgc3RyZWFtUHJlZml4OiAneHJheScgfSksXG4gICAgICB1c2VyOiAnMTMzNycsIC8vIFgtUmF5IHRyYWZmaWMgc2hvdWxkIG5vdCBnbyB0aHJvdWdoIEVudm95IHByb3h5XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgcGVybWlzc2lvbnMgdG8gdGhpcyB0YXNrIHRvIGFsbG93IGl0IHRvIHRhbGsgdG8gWC1SYXlcbiAgICB0YXNrRGVmaW5pdGlvbi50YXNrUm9sZS5hZGRNYW5hZ2VkUG9saWN5KFxuICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBV1NYUmF5RGFlbW9uV3JpdGVBY2Nlc3MnKSxcbiAgICApO1xuICB9XG5cbiAgcHVibGljIHJlc29sdmVDb250YWluZXJEZXBlbmRlbmNpZXMoKSB7XG4gICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgY29udGFpbmVyIGRlcGVuZGVuY3kgaG9vayB3YXMgY2FsbGVkIGJlZm9yZSB0aGUgY29udGFpbmVyIHdhcyBjcmVhdGVkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgYXBwbWVzaGV4dGVuc2lvbiA9IHRoaXMucGFyZW50U2VydmljZS5zZXJ2aWNlRGVzY3JpcHRpb24uZ2V0KCdhcHBtZXNoJyk7XG4gICAgaWYgKGFwcG1lc2hleHRlbnNpb24gJiYgYXBwbWVzaGV4dGVuc2lvbi5jb250YWluZXIpIHtcbiAgICAgIHRoaXMuY29udGFpbmVyLmFkZENvbnRhaW5lckRlcGVuZGVuY2llcyh7XG4gICAgICAgIGNvbnRhaW5lcjogYXBwbWVzaGV4dGVuc2lvbi5jb250YWluZXIsXG4gICAgICAgIGNvbmRpdGlvbjogZWNzLkNvbnRhaW5lckRlcGVuZGVuY3lDb25kaXRpb24uSEVBTFRIWSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19