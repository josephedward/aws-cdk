"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// !cdk-integ pragma:ignore-assets
const aws_ec2_1 = require("@aws-cdk/aws-ec2");
const aws_ecs_1 = require("@aws-cdk/aws-ecs");
const core_1 = require("@aws-cdk/core");
const lib_1 = require("../lib");
class ResourceStack extends core_1.NestedStack {
    constructor(scope, id) {
        super(scope, id);
        const environment = new lib_1.Environment(this, 'Environment');
        this.clusterName = environment.cluster.clusterName;
        this.vpcId = environment.vpc.vpcId;
        this.privateSubnetIds = environment.vpc.privateSubnets.map(m => m.subnetId);
        this.publicSubnetIds = environment.vpc.publicSubnets.map(m => m.subnetId);
    }
}
class TestStack extends core_1.Stack {
    constructor(scope, id) {
        super(scope, id);
        // Create a nested stack with the shared resources
        const resourceStack = new ResourceStack(this, 'Resources');
        // Import the vpc from the nested stack
        const vpc = aws_ec2_1.Vpc.fromVpcAttributes(this, 'Vpc', {
            availabilityZones: resourceStack.availabilityZones,
            vpcId: resourceStack.vpcId,
            privateSubnetIds: resourceStack.privateSubnetIds,
            publicSubnetIds: resourceStack.publicSubnetIds,
        });
        // Import the cluster from the nested stack
        const cluster = aws_ecs_1.Cluster.fromClusterAttributes(this, 'Cluster', {
            clusterName: resourceStack.clusterName,
            securityGroups: [],
            vpc: vpc,
        });
        // Create the environment from attributes.
        const environment = lib_1.Environment.fromEnvironmentAttributes(this, 'Environment', {
            cluster,
            capacityType: lib_1.EnvironmentCapacityType.FARGATE,
        });
        // Add a workload.
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: aws_ecs_1.ContainerImage.fromRegistry('nathanpeck/name'),
            environment: {
                PORT: '80',
            },
        }));
        serviceDescription.add(new lib_1.HttpLoadBalancerExtension());
        new lib_1.Service(this, 'Service', {
            environment,
            serviceDescription,
        });
    }
}
const app = new core_1.App();
new TestStack(app, 'imported-environment-integ');
/**
 * Expect this stack to deploy and show a load balancer DNS address. When you
 * request the address with curl, you should see the name container's output.
 * The load balancer may response 503 Service Temporarily Unavailable for a
 * short while, before you can see the container output.
 *
 * Example:
 * ```
 * $ cdk --app 'node integ.imported-environment.js' deploy
 * ...
 * Outputs:
 * shared-cluster-integ.Serviceloadbalancerdnsoutput = share-Servi-6JALU1FDE36L-2093347098.us-east-1.elb.amazonaws.com
 * ...
 *
 * $ curl share-Servi-6JALU1FDE36L-2093347098.us-east-1.elb.amazonaws.com
 * Keira (ip-10-0-153-44.ec2.internal)
 * ```
 */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuaW1wb3J0ZWQtZW52aXJvbm1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnRlZy5pbXBvcnRlZC1lbnZpcm9ubWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUFtQztBQUNuQyw4Q0FBdUM7QUFDdkMsOENBQTJEO0FBQzNELHdDQUF3RDtBQUV4RCxnQ0FPZ0I7QUFFaEIsTUFBTSxhQUFjLFNBQVEsa0JBQVc7SUFNckMsWUFBWSxLQUFnQixFQUFFLEVBQVU7UUFDdEMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLFdBQVcsR0FBRyxJQUFJLGlCQUFXLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRXpELElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7UUFDbkQsSUFBSSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUNuQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVFLElBQUksQ0FBQyxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVFLENBQUM7Q0FDRjtBQUVELE1BQU0sU0FBVSxTQUFRLFlBQUs7SUFDM0IsWUFBWSxLQUFnQixFQUFFLEVBQVU7UUFDdEMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqQixrREFBa0Q7UUFDbEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRTNELHVDQUF1QztRQUN2QyxNQUFNLEdBQUcsR0FBRyxhQUFHLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUM3QyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsaUJBQWlCO1lBQ2xELEtBQUssRUFBRSxhQUFhLENBQUMsS0FBSztZQUMxQixnQkFBZ0IsRUFBRSxhQUFhLENBQUMsZ0JBQWdCO1lBQ2hELGVBQWUsRUFBRSxhQUFhLENBQUMsZUFBZTtTQUMvQyxDQUFDLENBQUM7UUFFSCwyQ0FBMkM7UUFDM0MsTUFBTSxPQUFPLEdBQUcsaUJBQU8sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQzdELFdBQVcsRUFBRSxhQUFhLENBQUMsV0FBVztZQUN0QyxjQUFjLEVBQUUsRUFBRTtZQUNsQixHQUFHLEVBQUUsR0FBRztTQUNULENBQUMsQ0FBQztRQUVILDBDQUEwQztRQUMxQyxNQUFNLFdBQVcsR0FBRyxpQkFBVyxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDN0UsT0FBTztZQUNQLFlBQVksRUFBRSw2QkFBdUIsQ0FBQyxPQUFPO1NBQzlDLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLGtCQUFrQixHQUFHLElBQUksd0JBQWtCLEVBQUUsQ0FBQztRQUNwRCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFTLENBQUM7WUFDbkMsR0FBRyxFQUFFLEdBQUc7WUFDUixTQUFTLEVBQUUsR0FBRztZQUNkLFdBQVcsRUFBRSxFQUFFO1lBQ2YsS0FBSyxFQUFFLHdCQUFjLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDO1lBQ3JELFdBQVcsRUFBRTtnQkFDWCxJQUFJLEVBQUUsSUFBSTthQUNYO1NBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSwrQkFBeUIsRUFBRSxDQUFDLENBQUM7UUFFeEQsSUFBSSxhQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUMzQixXQUFXO1lBQ1gsa0JBQWtCO1NBQ25CLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQUVELE1BQU0sR0FBRyxHQUFHLElBQUksVUFBRyxFQUFFLENBQUM7QUFDdEIsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFLDRCQUE0QixDQUFDLENBQUM7QUFFakQ7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBaUJHIiwic291cmNlc0NvbnRlbnQiOlsiLy8vICFjZGstaW50ZWcgcHJhZ21hOmlnbm9yZS1hc3NldHNcbmltcG9ydCB7IFZwYyB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1lYzInO1xuaW1wb3J0IHsgQ2x1c3RlciwgQ29udGFpbmVySW1hZ2UgfSBmcm9tICdAYXdzLWNkay9hd3MtZWNzJztcbmltcG9ydCB7IEFwcCwgTmVzdGVkU3RhY2ssIFN0YWNrIH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7XG4gIENvbnRhaW5lcixcbiAgRW52aXJvbm1lbnQsXG4gIEVudmlyb25tZW50Q2FwYWNpdHlUeXBlLFxuICBIdHRwTG9hZEJhbGFuY2VyRXh0ZW5zaW9uLFxuICBTZXJ2aWNlLFxuICBTZXJ2aWNlRGVzY3JpcHRpb24sXG59IGZyb20gJy4uL2xpYic7XG5cbmNsYXNzIFJlc291cmNlU3RhY2sgZXh0ZW5kcyBOZXN0ZWRTdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBjbHVzdGVyTmFtZTogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgdnBjSWQ6IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IHB1YmxpY1N1Ym5ldElkczogc3RyaW5nW107XG4gIHB1YmxpYyByZWFkb25seSBwcml2YXRlU3VibmV0SWRzOiBzdHJpbmdbXTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHRoaXMsICdFbnZpcm9ubWVudCcpO1xuXG4gICAgdGhpcy5jbHVzdGVyTmFtZSA9IGVudmlyb25tZW50LmNsdXN0ZXIuY2x1c3Rlck5hbWU7XG4gICAgdGhpcy52cGNJZCA9IGVudmlyb25tZW50LnZwYy52cGNJZDtcbiAgICB0aGlzLnByaXZhdGVTdWJuZXRJZHMgPSBlbnZpcm9ubWVudC52cGMucHJpdmF0ZVN1Ym5ldHMubWFwKG0gPT4gbS5zdWJuZXRJZCk7XG4gICAgdGhpcy5wdWJsaWNTdWJuZXRJZHMgPSBlbnZpcm9ubWVudC52cGMucHVibGljU3VibmV0cy5tYXAobSA9PiBtLnN1Ym5ldElkKTtcbiAgfVxufVxuXG5jbGFzcyBUZXN0U3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIC8vIENyZWF0ZSBhIG5lc3RlZCBzdGFjayB3aXRoIHRoZSBzaGFyZWQgcmVzb3VyY2VzXG4gICAgY29uc3QgcmVzb3VyY2VTdGFjayA9IG5ldyBSZXNvdXJjZVN0YWNrKHRoaXMsICdSZXNvdXJjZXMnKTtcblxuICAgIC8vIEltcG9ydCB0aGUgdnBjIGZyb20gdGhlIG5lc3RlZCBzdGFja1xuICAgIGNvbnN0IHZwYyA9IFZwYy5mcm9tVnBjQXR0cmlidXRlcyh0aGlzLCAnVnBjJywge1xuICAgICAgYXZhaWxhYmlsaXR5Wm9uZXM6IHJlc291cmNlU3RhY2suYXZhaWxhYmlsaXR5Wm9uZXMsXG4gICAgICB2cGNJZDogcmVzb3VyY2VTdGFjay52cGNJZCxcbiAgICAgIHByaXZhdGVTdWJuZXRJZHM6IHJlc291cmNlU3RhY2sucHJpdmF0ZVN1Ym5ldElkcyxcbiAgICAgIHB1YmxpY1N1Ym5ldElkczogcmVzb3VyY2VTdGFjay5wdWJsaWNTdWJuZXRJZHMsXG4gICAgfSk7XG5cbiAgICAvLyBJbXBvcnQgdGhlIGNsdXN0ZXIgZnJvbSB0aGUgbmVzdGVkIHN0YWNrXG4gICAgY29uc3QgY2x1c3RlciA9IENsdXN0ZXIuZnJvbUNsdXN0ZXJBdHRyaWJ1dGVzKHRoaXMsICdDbHVzdGVyJywge1xuICAgICAgY2x1c3Rlck5hbWU6IHJlc291cmNlU3RhY2suY2x1c3Rlck5hbWUsXG4gICAgICBzZWN1cml0eUdyb3VwczogW10sXG4gICAgICB2cGM6IHZwYyxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSB0aGUgZW52aXJvbm1lbnQgZnJvbSBhdHRyaWJ1dGVzLlxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gRW52aXJvbm1lbnQuZnJvbUVudmlyb25tZW50QXR0cmlidXRlcyh0aGlzLCAnRW52aXJvbm1lbnQnLCB7XG4gICAgICBjbHVzdGVyLFxuICAgICAgY2FwYWNpdHlUeXBlOiBFbnZpcm9ubWVudENhcGFjaXR5VHlwZS5GQVJHQVRFLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIGEgd29ya2xvYWQuXG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IENvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQT1JUOiAnODAnLFxuICAgICAgfSxcbiAgICB9KSk7XG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgSHR0cExvYWRCYWxhbmNlckV4dGVuc2lvbigpKTtcblxuICAgIG5ldyBTZXJ2aWNlKHRoaXMsICdTZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgfSk7XG4gIH1cbn1cblxuY29uc3QgYXBwID0gbmV3IEFwcCgpO1xubmV3IFRlc3RTdGFjayhhcHAsICdpbXBvcnRlZC1lbnZpcm9ubWVudC1pbnRlZycpO1xuXG4vKipcbiAqIEV4cGVjdCB0aGlzIHN0YWNrIHRvIGRlcGxveSBhbmQgc2hvdyBhIGxvYWQgYmFsYW5jZXIgRE5TIGFkZHJlc3MuIFdoZW4geW91XG4gKiByZXF1ZXN0IHRoZSBhZGRyZXNzIHdpdGggY3VybCwgeW91IHNob3VsZCBzZWUgdGhlIG5hbWUgY29udGFpbmVyJ3Mgb3V0cHV0LlxuICogVGhlIGxvYWQgYmFsYW5jZXIgbWF5IHJlc3BvbnNlIDUwMyBTZXJ2aWNlIFRlbXBvcmFyaWx5IFVuYXZhaWxhYmxlIGZvciBhXG4gKiBzaG9ydCB3aGlsZSwgYmVmb3JlIHlvdSBjYW4gc2VlIHRoZSBjb250YWluZXIgb3V0cHV0LlxuICpcbiAqIEV4YW1wbGU6XG4gKiBgYGBcbiAqICQgY2RrIC0tYXBwICdub2RlIGludGVnLmltcG9ydGVkLWVudmlyb25tZW50LmpzJyBkZXBsb3lcbiAqIC4uLlxuICogT3V0cHV0czpcbiAqIHNoYXJlZC1jbHVzdGVyLWludGVnLlNlcnZpY2Vsb2FkYmFsYW5jZXJkbnNvdXRwdXQgPSBzaGFyZS1TZXJ2aS02SkFMVTFGREUzNkwtMjA5MzM0NzA5OC51cy1lYXN0LTEuZWxiLmFtYXpvbmF3cy5jb21cbiAqIC4uLlxuICpcbiAqICQgY3VybCBzaGFyZS1TZXJ2aS02SkFMVTFGREUzNkwtMjA5MzM0NzA5OC51cy1lYXN0LTEuZWxiLmFtYXpvbmF3cy5jb21cbiAqIEtlaXJhIChpcC0xMC0wLTE1My00NC5lYzIuaW50ZXJuYWwpXG4gKiBgYGBcbiAqL1xuIl19