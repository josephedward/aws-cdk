"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppMeshExtension = void 0;
const appmesh = require("@aws-cdk/aws-appmesh");
const ec2 = require("@aws-cdk/aws-ec2");
const ecr = require("@aws-cdk/aws-ecr");
const ecs = require("@aws-cdk/aws-ecs");
const iam = require("@aws-cdk/aws-iam");
const cdk = require("@aws-cdk/core");
const regionInfo = require("@aws-cdk/region-info");
const extension_interfaces_1 = require("./extension-interfaces");
// The version of the App Mesh envoy sidecar to add to the task.
const APP_MESH_ENVOY_SIDECAR_VERSION = 'v1.15.1.0-prod';
/**
 * This extension adds an Envoy sidecar to the task definition and
 * creates the App Mesh resources required to route network traffic
 * to the container in a service mesh.
 *
 * The service will then be available to other App Mesh services at the
 * address `<service name>.<environment name>`. For example, a service called
 * `orders` deploying in an environment called `production` would be accessible
 * to other App Mesh enabled services at the address `http://orders.production`.
 */
class AppMeshExtension extends extension_interfaces_1.ServiceExtension {
    constructor(props) {
        super('appmesh');
        this.mesh = props.mesh;
        if (props.protocol) {
            this.protocol = props.protocol;
        }
        else {
            this.protocol = appmesh.Protocol.HTTP;
        }
    }
    prehook(service, scope) {
        this.parentService = service;
        this.scope = scope;
        // Make sure that the parent cluster for this service has
        // a namespace attached.
        if (!this.parentService.cluster.defaultCloudMapNamespace) {
            this.parentService.environment.addDefaultCloudMapNamespace({
                // Name the namespace after the environment name.
                // Service DNS will be like <service id>.<environment id>
                name: this.parentService.environment.id,
            });
        }
    }
    modifyTaskDefinitionProps(props) {
        // Find the app extension, to get its port
        const containerextension = this.parentService.serviceDescription.get('service-container');
        if (!containerextension) {
            throw new Error('Appmesh extension requires an application extension');
        }
        return {
            ...props,
            // App Mesh requires AWS VPC networking mode so that each
            // task can have its own IP address
            networkMode: ecs.NetworkMode.AWS_VPC,
            // This configures the envoy container as a proxy for all
            // traffic going into and out of the task, with a few exceptions
            // for metadata endpoints or other ports that need direct
            // communication
            proxyConfiguration: new ecs.AppMeshProxyConfiguration({
                containerName: 'envoy',
                properties: {
                    appPorts: [containerextension.trafficPort],
                    proxyEgressPort: 15001,
                    proxyIngressPort: 15000,
                    // The App Mesh proxy runs with this user ID, and this keeps its
                    // own outbound connections from recursively attempting to infinitely proxy.
                    ignoredUID: 1337,
                    // This GID is ignored and any outbound traffic originating from containers that
                    // use this group ID will be ignored by the proxy. This is primarily utilized by
                    // the FireLens extension, so that outbound application logs don't have to go through Envoy
                    // and therefore add extra burden to the proxy sidecar. Instead the logs can go directly
                    // to CloudWatch
                    ignoredGID: 1338,
                    egressIgnoredIPs: [
                        '169.254.170.2',
                        '169.254.169.254',
                    ],
                    // If there is outbound traffic to specific ports that you want to
                    // ignore the proxy those ports can be added here.
                    egressIgnoredPorts: [],
                },
            }),
        };
    }
    accountIdForRegion(region) {
        return { ecrRepo: regionInfo.RegionInfo.get(region).appMeshRepositoryAccount };
    }
    useTaskDefinition(taskDefinition) {
        var region = cdk.Stack.of(this.scope).region;
        var partition = cdk.Stack.of(this.scope).partition;
        var appMeshRepo;
        // This is currently necessary because App Mesh has different images in each region,
        // and some regions have their images in a different account. See:
        // https://docs.aws.amazon.com/app-mesh/latest/userguide/envoy.html
        const mapping = new cdk.CfnMapping(this.scope, `${this.parentService.id}-envoy-image-account-mapping`, {
            mapping: {
                'ap-northeast-1': this.accountIdForRegion('ap-northeast-1'),
                'ap-northeast-2': this.accountIdForRegion('ap-northeast-2'),
                'ap-south-1': this.accountIdForRegion('ap-south-1'),
                'ap-southeast-1': this.accountIdForRegion('ap-southeast-1'),
                'ap-southeast-2': this.accountIdForRegion('ap-southeast-1'),
                'ca-central-1': this.accountIdForRegion('ca-central-1'),
                'cn-north-1': this.accountIdForRegion('cn-north-1'),
                'cn-northwest-1': this.accountIdForRegion('cn-northwest-1'),
                'eu-central-1': this.accountIdForRegion('eu-central-1'),
                'eu-north-1': this.accountIdForRegion('eu-north-1'),
                'eu-south-1': this.accountIdForRegion('eu-south-1'),
                'eu-west-1': this.accountIdForRegion('eu-west-1'),
                'eu-west-2': this.accountIdForRegion('eu-west-2'),
                'eu-west-3': this.accountIdForRegion('eu-west-3'),
                'sa-east-1': this.accountIdForRegion('sa-east-1'),
                'us-east-1': this.accountIdForRegion('us-east-1'),
                'us-east-2': this.accountIdForRegion('us-east-2'),
                'us-west-1': this.accountIdForRegion('us-west-1'),
                'us-west-2': this.accountIdForRegion('us-west-2'),
                'me-south-1': this.accountIdForRegion('me-south-1'),
                'ap-east-1': this.accountIdForRegion('ap-east-1'),
                'af-south-1': this.accountIdForRegion('af-south-1'),
            },
        });
        // WHEN
        const ownerAccount = mapping.findInMap(region, 'ecrRepo');
        appMeshRepo = ecr.Repository.fromRepositoryAttributes(this.scope, `${this.parentService.id}-envoy-repo`, {
            repositoryName: 'aws-appmesh-envoy',
            repositoryArn: `arn:${partition}:ecr:${region}:${ownerAccount}:repository/aws-appmesh-envoy`,
        });
        this.container = taskDefinition.addContainer('envoy', {
            image: ecs.ContainerImage.fromEcrRepository(appMeshRepo, APP_MESH_ENVOY_SIDECAR_VERSION),
            essential: true,
            environment: {
                APPMESH_VIRTUAL_NODE_NAME: `mesh/${this.mesh.meshName}/virtualNode/${this.parentService.id}`,
                AWS_REGION: cdk.Stack.of(this.parentService).region,
                ENABLE_ENVOY_STATS_TAGS: '1',
                ENABLE_ENVOY_DOG_STATSD: '1',
            },
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    'curl -s http://localhost:9901/server_info | grep state | grep -q LIVE',
                ],
                startPeriod: cdk.Duration.seconds(10),
                interval: cdk.Duration.seconds(5),
                timeout: cdk.Duration.seconds(2),
            },
            memoryReservationMiB: 128,
            user: '1337',
            logging: new ecs.AwsLogDriver({ streamPrefix: 'envoy' }),
        });
        // Modify the task definition role to allow the Envoy sidecar to get
        // configuration from the Envoy control plane, for this particular
        // mesh only.
        new iam.Policy(this.scope, `${this.parentService.id}-envoy-to-appmesh`, {
            roles: [taskDefinition.taskRole],
            statements: [
                new iam.PolicyStatement({
                    resources: [this.mesh.meshArn],
                    actions: ['appmesh:StreamAggregatedResources'],
                }),
            ],
        });
        // Raise the number of open file descriptors allowed. This is
        // necessary when the Envoy proxy is handling large amounts of
        // traffic.
        this.container.addUlimits({
            softLimit: 1024000,
            hardLimit: 1024000,
            name: ecs.UlimitName.NOFILE,
        });
    }
    // Enable CloudMap for the service.
    modifyServiceProps(props) {
        return {
            ...props,
            // Ensure that service tasks are registered into
            // CloudMap so that the App Mesh proxy can find them.
            cloudMapOptions: {
                dnsRecordType: 'A',
                dnsTtl: cdk.Duration.seconds(10),
                failureThreshold: 2,
                name: this.parentService.id,
            },
            // These specific deployment settings are currently required in order to
            // maintain availability during a rolling deploy of the service with App Mesh
            // https://docs.aws.amazon.com/app-mesh/latest/userguide/best-practices.html#reduce-deployment-velocity
            minHealthyPercent: 100,
            maxHealthyPercent: 125,
        };
    }
    // Now that the service is defined, we can create the AppMesh virtual service
    // and virtual node for the real service
    useService(service) {
        const containerextension = this.parentService.serviceDescription.get('service-container');
        if (!containerextension) {
            throw new Error('Firelens extension requires an application extension');
        }
        const cloudmapNamespace = this.parentService.cluster.defaultCloudMapNamespace;
        if (!cloudmapNamespace) {
            throw new Error('You must add a CloudMap namespace to the ECS cluster in order to use the AppMesh extension');
        }
        function addListener(protocol, port) {
            switch (protocol) {
                case appmesh.Protocol.HTTP:
                    return appmesh.VirtualNodeListener.http({ port });
                case appmesh.Protocol.HTTP2:
                    return appmesh.VirtualNodeListener.http2({ port });
                case appmesh.Protocol.GRPC:
                    return appmesh.VirtualNodeListener.grpc({ port });
                case appmesh.Protocol.TCP:
                    return appmesh.VirtualNodeListener.tcp({ port });
            }
        }
        // Create a virtual node for the name service
        this.virtualNode = new appmesh.VirtualNode(this.scope, `${this.parentService.id}-virtual-node`, {
            mesh: this.mesh,
            virtualNodeName: this.parentService.id,
            serviceDiscovery: service.cloudMapService
                ? appmesh.ServiceDiscovery.cloudMap(service.cloudMapService)
                : undefined,
            listeners: [addListener(this.protocol, containerextension.trafficPort)],
        });
        // Create a virtual router for this service. This allows for retries
        // and other similar behaviors.
        this.virtualRouter = new appmesh.VirtualRouter(this.scope, `${this.parentService.id}-virtual-router`, {
            mesh: this.mesh,
            listeners: [
                this.virtualRouterListener(containerextension.trafficPort),
            ],
            virtualRouterName: `${this.parentService.id}`,
        });
        // Form the service name that requests will be made to
        const serviceName = `${this.parentService.id}.${cloudmapNamespace.namespaceName}`;
        const weightedTargets = [{
                virtualNode: this.virtualNode,
                weight: 1,
            }];
        // Now add the virtual node as a route in the virtual router
        // Ensure that the route type matches the protocol type.
        this.route = this.virtualRouter.addRoute(`${this.parentService.id}-route`, {
            routeSpec: this.routeSpec(weightedTargets, serviceName),
        });
        // Now create a virtual service. Relationship goes like this:
        // virtual service -> virtual router -> virtual node
        this.virtualService = new appmesh.VirtualService(this.scope, `${this.parentService.id}-virtual-service`, {
            virtualServiceProvider: appmesh.VirtualServiceProvider.virtualRouter(this.virtualRouter),
            virtualServiceName: serviceName,
        });
    }
    // Connect the app mesh extension for this service to an app mesh
    // extension on another service.
    connectToService(otherService) {
        const otherAppMesh = otherService.serviceDescription.get('appmesh');
        const otherContainer = otherService.serviceDescription.get('service-container');
        // Do a check to ensure that these services are in the same environment.
        // Currently this extension only supports connecting services within
        // the same VPC, same App Mesh service mesh, and same Cloud Map namespace
        if (otherAppMesh.parentService.environment.id !== this.parentService.environment.id) {
            throw new Error(`Unable to connect service '${this.parentService.id}' in environment '${this.parentService.environment.id}' to service '${otherService.id}' in environment '${otherAppMesh.parentService.environment.id}' because services can not be connected across environment boundaries`);
        }
        // First allow this service to talk to the other service
        // at a network level. This opens the security groups so that
        // the security groups of these two services to each other
        this.parentService.ecsService.connections.allowTo(otherService.ecsService, ec2.Port.tcp(otherContainer.trafficPort), `Accept inbound traffic from ${this.parentService.id}`);
        // Next update the app mesh config so that the local Envoy
        // proxy on this service knows how to route traffic to
        // nodes from the other service.
        this.virtualNode.addBackend(appmesh.Backend.virtualService(otherAppMesh.virtualService));
    }
    routeSpec(weightedTargets, serviceName) {
        switch (this.protocol) {
            case appmesh.Protocol.HTTP: return appmesh.RouteSpec.http({
                weightedTargets: weightedTargets,
            });
            case appmesh.Protocol.HTTP2: return appmesh.RouteSpec.http2({
                weightedTargets: weightedTargets,
            });
            case appmesh.Protocol.GRPC: return appmesh.RouteSpec.grpc({
                weightedTargets: weightedTargets,
                match: {
                    serviceName: serviceName,
                },
            });
            case appmesh.Protocol.TCP: return appmesh.RouteSpec.tcp({
                weightedTargets: weightedTargets,
            });
        }
    }
    virtualRouterListener(port) {
        switch (this.protocol) {
            case appmesh.Protocol.HTTP: return appmesh.VirtualRouterListener.http(port);
            case appmesh.Protocol.HTTP2: return appmesh.VirtualRouterListener.http2(port);
            case appmesh.Protocol.GRPC: return appmesh.VirtualRouterListener.grpc(port);
            case appmesh.Protocol.TCP: return appmesh.VirtualRouterListener.tcp(port);
        }
    }
}
exports.AppMeshExtension = AppMeshExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbWVzaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwcG1lc2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0RBQWdEO0FBQ2hELHdDQUF3QztBQUN4Qyx3Q0FBd0M7QUFDeEMsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4QyxxQ0FBcUM7QUFDckMsbURBQW1EO0FBSW5ELGlFQUF3RTtBQUV4RSxnRUFBZ0U7QUFDaEUsTUFBTSw4QkFBOEIsR0FBRyxnQkFBZ0IsQ0FBQztBQW1CeEQ7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBYSxnQkFBaUIsU0FBUSx1Q0FBZ0I7SUFhcEQsWUFBWSxLQUFnQjtRQUMxQixLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBRXZCLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtZQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUM7U0FDaEM7YUFBTTtZQUNMLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7U0FDdkM7SUFDSCxDQUFDO0lBRU0sT0FBTyxDQUFDLE9BQWdCLEVBQUUsS0FBZ0I7UUFDL0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUM7UUFDN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFFbkIseURBQXlEO1FBQ3pELHdCQUF3QjtRQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUU7WUFDeEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUM7Z0JBQ3pELGlEQUFpRDtnQkFDakQseURBQXlEO2dCQUN6RCxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsRUFBRTthQUN4QyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7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QUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUUsS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5RSxLQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxPQUFPLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzVFLEtBQUssT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0U7SUFDSCxDQUFDO0NBQ0Y7QUFoVkQsNENBZ1ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXBwbWVzaCBmcm9tICdAYXdzLWNkay9hd3MtYXBwbWVzaCc7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnQGF3cy1jZGsvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBlY3IgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcic7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnQGF3cy1jZGsvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgKiBhcyByZWdpb25JbmZvIGZyb20gJ0Bhd3MtY2RrL3JlZ2lvbi1pbmZvJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgU2VydmljZSB9IGZyb20gJy4uL3NlcnZpY2UnO1xuaW1wb3J0IHsgQ29udGFpbmVyIH0gZnJvbSAnLi9jb250YWluZXInO1xuaW1wb3J0IHsgU2VydmljZUV4dGVuc2lvbiwgU2VydmljZUJ1aWxkIH0gZnJvbSAnLi9leHRlbnNpb24taW50ZXJmYWNlcyc7XG5cbi8vIFRoZSB2ZXJzaW9uIG9mIHRoZSBBcHAgTWVzaCBlbnZveSBzaWRlY2FyIHRvIGFkZCB0byB0aGUgdGFzay5cbmNvbnN0IEFQUF9NRVNIX0VOVk9ZX1NJREVDQVJfVkVSU0lPTiA9ICd2MS4xNS4xLjAtcHJvZCc7XG5cbi8qKlxuICogVGhlIHNldHRpbmdzIGZvciB0aGUgQXBwIE1lc2ggZXh0ZW5zaW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1lc2hQcm9wcyB7XG4gIC8qKlxuICAgKiBUaGUgc2VydmljZSBtZXNoIGludG8gd2hpY2ggdG8gcmVnaXN0ZXIgdGhlIHNlcnZpY2UuXG4gICAqL1xuICByZWFkb25seSBtZXNoOiBhcHBtZXNoLk1lc2g7XG5cbiAgLyoqXG4gICAqIFRoZSBwcm90b2NvbCBvZiB0aGUgc2VydmljZS5cbiAgICogVmFsaWQgdmFsdWVzIGFyZSBQcm90b2NvbC5IVFRQLCBQcm90b2NvbC5IVFRQMiwgUHJvdG9jb2wuVENQLCBQcm90b2NvbC5HUlBDXG4gICAqIEBkZWZhdWx0IC0gUHJvdG9jb2wuSFRUUFxuICAgKi9cbiAgcmVhZG9ubHkgcHJvdG9jb2w/OiBhcHBtZXNoLlByb3RvY29sO1xufVxuXG4vKipcbiAqIFRoaXMgZXh0ZW5zaW9uIGFkZHMgYW4gRW52b3kgc2lkZWNhciB0byB0aGUgdGFzayBkZWZpbml0aW9uIGFuZFxuICogY3JlYXRlcyB0aGUgQXBwIE1lc2ggcmVzb3VyY2VzIHJlcXVpcmVkIHRvIHJvdXRlIG5ldHdvcmsgdHJhZmZpY1xuICogdG8gdGhlIGNvbnRhaW5lciBpbiBhIHNlcnZpY2UgbWVzaC5cbiAqXG4gKiBUaGUgc2VydmljZSB3aWxsIHRoZW4gYmUgYXZhaWxhYmxlIHRvIG90aGVyIEFwcCBNZXNoIHNlcnZpY2VzIGF0IHRoZVxuICogYWRkcmVzcyBgPHNlcnZpY2UgbmFtZT4uPGVudmlyb25tZW50IG5hbWU+YC4gRm9yIGV4YW1wbGUsIGEgc2VydmljZSBjYWxsZWRcbiAqIGBvcmRlcnNgIGRlcGxveWluZyBpbiBhbiBlbnZpcm9ubWVudCBjYWxsZWQgYHByb2R1Y3Rpb25gIHdvdWxkIGJlIGFjY2Vzc2libGVcbiAqIHRvIG90aGVyIEFwcCBNZXNoIGVuYWJsZWQgc2VydmljZXMgYXQgdGhlIGFkZHJlc3MgYGh0dHA6Ly9vcmRlcnMucHJvZHVjdGlvbmAuXG4gKi9cbmV4cG9ydCBjbGFzcyBBcHBNZXNoRXh0ZW5zaW9uIGV4dGVuZHMgU2VydmljZUV4dGVuc2lvbiB7XG4gIHByb3RlY3RlZCB2aXJ0dWFsTm9kZSE6IGFwcG1lc2guVmlydHVhbE5vZGU7XG4gIHByb3RlY3RlZCB2aXJ0dWFsU2VydmljZSE6IGFwcG1lc2guVmlydHVhbFNlcnZpY2U7XG4gIHByb3RlY3RlZCB2aXJ0dWFsUm91dGVyITogYXBwbWVzaC5WaXJ0dWFsUm91dGVyO1xuICBwcm90ZWN0ZWQgcm91dGUhOiBhcHBtZXNoLlJvdXRlO1xuICBwcml2YXRlIG1lc2g6IGFwcG1lc2guTWVzaDtcblxuICAvKipcbiAgICogVGhlIHByb3RvY29sIHVzZWQgZm9yIEFwcE1lc2ggcm91dGluZy5cbiAgICogZGVmYXVsdCAtIFByb3RvY29sLkhUVFBcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBwcm90b2NvbDogYXBwbWVzaC5Qcm90b2NvbDtcblxuICBjb25zdHJ1Y3Rvcihwcm9wczogTWVzaFByb3BzKSB7XG4gICAgc3VwZXIoJ2FwcG1lc2gnKTtcbiAgICB0aGlzLm1lc2ggPSBwcm9wcy5tZXNoO1xuXG4gICAgaWYgKHByb3BzLnByb3RvY29sKSB7XG4gICAgICB0aGlzLnByb3RvY29sID0gcHJvcHMucHJvdG9jb2w7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHJvdG9jb2wgPSBhcHBtZXNoLlByb3RvY29sLkhUVFA7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHByZWhvb2soc2VydmljZTogU2VydmljZSwgc2NvcGU6IENvbnN0cnVjdCkge1xuICAgIHRoaXMucGFyZW50U2VydmljZSA9IHNlcnZpY2U7XG4gICAgdGhpcy5zY29wZSA9IHNjb3BlO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIHBhcmVudCBjbHVzdGVyIGZvciB0aGlzIHNlcnZpY2UgaGFzXG4gICAgLy8gYSBuYW1lc3BhY2UgYXR0YWNoZWQuXG4gICAgaWYgKCF0aGlzLnBhcmVudFNlcnZpY2UuY2x1c3Rlci5kZWZhdWx0Q2xvdWRNYXBOYW1lc3BhY2UpIHtcbiAgICAgIHRoaXMucGFyZW50U2VydmljZS5lbnZpcm9ubWVudC5hZGREZWZhdWx0Q2xvdWRNYXBOYW1lc3BhY2Uoe1xuICAgICAgICAvLyBOYW1lIHRoZSBuYW1lc3BhY2UgYWZ0ZXIgdGhlIGVudmlyb25tZW50IG5hbWUuXG4gICAgICAgIC8vIFNlcnZpY2UgRE5TIHdpbGwgYmUgbGlrZSA8c2VydmljZSBpZD4uPGVudmlyb25tZW50IGlkPlxuICAgICAgICBuYW1lOiB0aGlzLnBhcmVudFNlcnZpY2UuZW52aXJvbm1lbnQuaWQsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgbW9kaWZ5VGFza0RlZmluaXRpb25Qcm9wcyhwcm9wczogZWNzLlRhc2tEZWZpbml0aW9uUHJvcHMpOiBlY3MuVGFza0RlZmluaXRpb25Qcm9wcyB7XG4gICAgLy8gRmluZCB0aGUgYXBwIGV4dGVuc2lvbiwgdG8gZ2V0IGl0cyBwb3J0XG4gICAgY29uc3QgY29udGFpbmVyZXh0ZW5zaW9uID0gdGhpcy5wYXJlbnRTZXJ2aWNlLnNlcnZpY2VEZXNjcmlwdGlvbi5nZXQoJ3NlcnZpY2UtY29udGFpbmVyJykgYXMgQ29udGFpbmVyO1xuXG4gICAgaWYgKCFjb250YWluZXJleHRlbnNpb24pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQXBwbWVzaCBleHRlbnNpb24gcmVxdWlyZXMgYW4gYXBwbGljYXRpb24gZXh0ZW5zaW9uJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnByb3BzLFxuXG4gICAgICAvLyBBcHAgTWVzaCByZXF1aXJlcyBBV1MgVlBDIG5ldHdvcmtpbmcgbW9kZSBzbyB0aGF0IGVhY2hcbiAgICAgIC8vIHRhc2sgY2FuIGhhdmUgaXRzIG93biBJUCBhZGRyZXNzXG4gICAgICBuZXR3b3JrTW9kZTogZWNzLk5ldHdvcmtNb2RlLkFXU19WUEMsXG5cbiAgICAgIC8vIFRoaXMgY29uZmlndXJlcyB0aGUgZW52b3kgY29udGFpbmVyIGFzIGEgcHJveHkgZm9yIGFsbFxuICAgICAgLy8gdHJhZmZpYyBnb2luZyBpbnRvIGFuZCBvdXQgb2YgdGhlIHRhc2ssIHdpdGggYSBmZXcgZXhjZXB0aW9uc1xuICAgICAgLy8gZm9yIG1ldGFkYXRhIGVuZHBvaW50cyBvciBvdGhlciBwb3J0cyB0aGF0IG5lZWQgZGlyZWN0XG4gICAgICAvLyBjb21tdW5pY2F0aW9uXG4gICAgICBwcm94eUNvbmZpZ3VyYXRpb246IG5ldyBlY3MuQXBwTWVzaFByb3h5Q29uZmlndXJhdGlvbih7XG4gICAgICAgIGNvbnRhaW5lck5hbWU6ICdlbnZveScsXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICBhcHBQb3J0czogW2NvbnRhaW5lcmV4dGVuc2lvbi50cmFmZmljUG9ydF0sXG4gICAgICAgICAgcHJveHlFZ3Jlc3NQb3J0OiAxNTAwMSxcbiAgICAgICAgICBwcm94eUluZ3Jlc3NQb3J0OiAxNTAwMCxcblxuICAgICAgICAgIC8vIFRoZSBBcHAgTWVzaCBwcm94eSBydW5zIHdpdGggdGhpcyB1c2VyIElELCBhbmQgdGhpcyBrZWVwcyBpdHNcbiAgICAgICAgICAvLyBvd24gb3V0Ym91bmQgY29ubmVjdGlvbnMgZnJvbSByZWN1cnNpdmVseSBhdHRlbXB0aW5nIHRvIGluZmluaXRlbHkgcHJveHkuXG4gICAgICAgICAgaWdub3JlZFVJRDogMTMzNyxcblxuICAgICAgICAgIC8vIFRoaXMgR0lEIGlzIGlnbm9yZWQgYW5kIGFueSBvdXRib3VuZCB0cmFmZmljIG9yaWdpbmF0aW5nIGZyb20gY29udGFpbmVycyB0aGF0XG4gICAgICAgICAgLy8gdXNlIHRoaXMgZ3JvdXAgSUQgd2lsbCBiZSBpZ25vcmVkIGJ5IHRoZSBwcm94eS4gVGhpcyBpcyBwcmltYXJpbHkgdXRpbGl6ZWQgYnlcbiAgICAgICAgICAvLyB0aGUgRmlyZUxlbnMgZXh0ZW5zaW9uLCBzbyB0aGF0IG91dGJvdW5kIGFwcGxpY2F0aW9uIGxvZ3MgZG9uJ3QgaGF2ZSB0byBnbyB0aHJvdWdoIEVudm95XG4gICAgICAgICAgLy8gYW5kIHRoZXJlZm9yZSBhZGQgZXh0cmEgYnVyZGVuIHRvIHRoZSBwcm94eSBzaWRlY2FyLiBJbnN0ZWFkIHRoZSBsb2dzIGNhbiBnbyBkaXJlY3RseVxuICAgICAgICAgIC8vIHRvIENsb3VkV2F0Y2hcbiAgICAgICAgICBpZ25vcmVkR0lEOiAxMzM4LFxuXG4gICAgICAgICAgZWdyZXNzSWdub3JlZElQczogW1xuICAgICAgICAgICAgJzE2OS4yNTQuMTcwLjInLCAvLyBBbGxvdyBzZXJ2aWNlcyB0byB0YWxrIGRpcmVjdGx5IHRvIEVDUyBtZXRhZGF0YSBlbmRwb2ludHNcbiAgICAgICAgICAgICcxNjkuMjU0LjE2OS4yNTQnLCAvLyBhbmQgRUMyIGluc3RhbmNlIGVuZHBvaW50XG4gICAgICAgICAgXSxcblxuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG91dGJvdW5kIHRyYWZmaWMgdG8gc3BlY2lmaWMgcG9ydHMgdGhhdCB5b3Ugd2FudCB0b1xuICAgICAgICAgIC8vIGlnbm9yZSB0aGUgcHJveHkgdGhvc2UgcG9ydHMgY2FuIGJlIGFkZGVkIGhlcmUuXG4gICAgICAgICAgZWdyZXNzSWdub3JlZFBvcnRzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgIH0gYXMgZWNzLlRhc2tEZWZpbml0aW9uUHJvcHM7XG4gIH1cblxuICBwcml2YXRlIGFjY291bnRJZEZvclJlZ2lvbihyZWdpb246IHN0cmluZykge1xuICAgIHJldHVybiB7IGVjclJlcG86IHJlZ2lvbkluZm8uUmVnaW9uSW5mby5nZXQocmVnaW9uKS5hcHBNZXNoUmVwb3NpdG9yeUFjY291bnQgfTtcbiAgfVxuXG4gIHB1YmxpYyB1c2VUYXNrRGVmaW5pdGlvbih0YXNrRGVmaW5pdGlvbjogZWNzLlRhc2tEZWZpbml0aW9uKSB7XG4gICAgdmFyIHJlZ2lvbiA9IGNkay5TdGFjay5vZih0aGlzLnNjb3BlKS5yZWdpb247XG4gICAgdmFyIHBhcnRpdGlvbiA9IGNkay5TdGFjay5vZih0aGlzLnNjb3BlKS5wYXJ0aXRpb247XG4gICAgdmFyIGFwcE1lc2hSZXBvO1xuXG4gICAgLy8gVGhpcyBpcyBjdXJyZW50bHkgbmVjZXNzYXJ5IGJlY2F1c2UgQXBwIE1lc2ggaGFzIGRpZmZlcmVudCBpbWFnZXMgaW4gZWFjaCByZWdpb24sXG4gICAgLy8gYW5kIHNvbWUgcmVnaW9ucyBoYXZlIHRoZWlyIGltYWdlcyBpbiBhIGRpZmZlcmVudCBhY2NvdW50LiBTZWU6XG4gICAgLy8gaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2FwcC1tZXNoL2xhdGVzdC91c2VyZ3VpZGUvZW52b3kuaHRtbFxuICAgIGNvbnN0IG1hcHBpbmcgPSBuZXcgY2RrLkNmbk1hcHBpbmcodGhpcy5zY29wZSwgYCR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfS1lbnZveS1pbWFnZS1hY2NvdW50LW1hcHBpbmdgLCB7XG4gICAgICBtYXBwaW5nOiB7XG4gICAgICAgICdhcC1ub3J0aGVhc3QtMSc6IHRoaXMuYWNjb3VudElkRm9yUmVnaW9uKCdhcC1ub3J0aGVhc3QtMScpLFxuICAgICAgICAnYXAtbm9ydGhlYXN0LTInOiB0aGlzLmFjY291bnRJZEZvclJlZ2lvbignYXAtbm9ydGhlYXN0LTInKSxcbiAgICAgICAgJ2FwLXNvdXRoLTEnOiB0aGlzLmFjY291bnRJZEZvclJlZ2lvbignYXAtc291dGgtMScpLFxuICAgICAgICAnYXAtc291dGhlYXN0LTEnOiB0aGlzLmFjY291bnRJZEZvclJlZ2lvbignYXAtc291dGhlYXN0LTEnKSxcbiAgICAgICAgJ2FwLXNvdXRoZWFzdC0yJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ2FwLXNvdXRoZWFzdC0xJyksXG4gICAgICAgICdjYS1jZW50cmFsLTEnOiB0aGlzLmFjY291bnRJZEZvclJlZ2lvbignY2EtY2VudHJhbC0xJyksXG4gICAgICAgICdjbi1ub3J0aC0xJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ2NuLW5vcnRoLTEnKSxcbiAgICAgICAgJ2NuLW5vcnRod2VzdC0xJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ2NuLW5vcnRod2VzdC0xJyksXG4gICAgICAgICdldS1jZW50cmFsLTEnOiB0aGlzLmFjY291bnRJZEZvclJlZ2lvbignZXUtY2VudHJhbC0xJyksXG4gICAgICAgICdldS1ub3J0aC0xJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ2V1LW5vcnRoLTEnKSxcbiAgICAgICAgJ2V1LXNvdXRoLTEnOiB0aGlzLmFjY291bnRJZEZvclJlZ2lvbignZXUtc291dGgtMScpLFxuICAgICAgICAnZXUtd2VzdC0xJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ2V1LXdlc3QtMScpLFxuICAgICAgICAnZXUtd2VzdC0yJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ2V1LXdlc3QtMicpLFxuICAgICAgICAnZXUtd2VzdC0zJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ2V1LXdlc3QtMycpLFxuICAgICAgICAnc2EtZWFzdC0xJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ3NhLWVhc3QtMScpLFxuICAgICAgICAndXMtZWFzdC0xJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ3VzLWVhc3QtMScpLFxuICAgICAgICAndXMtZWFzdC0yJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ3VzLWVhc3QtMicpLFxuICAgICAgICAndXMtd2VzdC0xJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ3VzLXdlc3QtMScpLFxuICAgICAgICAndXMtd2VzdC0yJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ3VzLXdlc3QtMicpLFxuXG4gICAgICAgICdtZS1zb3V0aC0xJzogdGhpcy5hY2NvdW50SWRGb3JSZWdpb24oJ21lLXNvdXRoLTEnKSxcbiAgICAgICAgJ2FwLWVhc3QtMSc6IHRoaXMuYWNjb3VudElkRm9yUmVnaW9uKCdhcC1lYXN0LTEnKSxcbiAgICAgICAgJ2FmLXNvdXRoLTEnOiB0aGlzLmFjY291bnRJZEZvclJlZ2lvbignYWYtc291dGgtMScpLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBvd25lckFjY291bnQgPSBtYXBwaW5nLmZpbmRJbk1hcChyZWdpb24sICdlY3JSZXBvJyk7XG5cbiAgICBhcHBNZXNoUmVwbyA9IGVjci5SZXBvc2l0b3J5LmZyb21SZXBvc2l0b3J5QXR0cmlidXRlcyhcbiAgICAgIHRoaXMuc2NvcGUsXG4gICAgICBgJHt0aGlzLnBhcmVudFNlcnZpY2UuaWR9LWVudm95LXJlcG9gLFxuICAgICAge1xuICAgICAgICByZXBvc2l0b3J5TmFtZTogJ2F3cy1hcHBtZXNoLWVudm95JyxcbiAgICAgICAgcmVwb3NpdG9yeUFybjogYGFybjoke3BhcnRpdGlvbn06ZWNyOiR7cmVnaW9ufToke293bmVyQWNjb3VudH06cmVwb3NpdG9yeS9hd3MtYXBwbWVzaC1lbnZveWAsXG4gICAgICB9LFxuICAgICk7XG5cbiAgICB0aGlzLmNvbnRhaW5lciA9IHRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcignZW52b3knLCB7XG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21FY3JSZXBvc2l0b3J5KGFwcE1lc2hSZXBvLCBBUFBfTUVTSF9FTlZPWV9TSURFQ0FSX1ZFUlNJT04pLFxuICAgICAgZXNzZW50aWFsOiB0cnVlLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgQVBQTUVTSF9WSVJUVUFMX05PREVfTkFNRTogYG1lc2gvJHt0aGlzLm1lc2gubWVzaE5hbWV9L3ZpcnR1YWxOb2RlLyR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfWAsXG4gICAgICAgIEFXU19SRUdJT046IGNkay5TdGFjay5vZih0aGlzLnBhcmVudFNlcnZpY2UpLnJlZ2lvbixcbiAgICAgICAgRU5BQkxFX0VOVk9ZX1NUQVRTX1RBR1M6ICcxJyxcbiAgICAgICAgRU5BQkxFX0VOVk9ZX0RPR19TVEFUU0Q6ICcxJyxcbiAgICAgIH0sXG4gICAgICBoZWFsdGhDaGVjazoge1xuICAgICAgICBjb21tYW5kOiBbXG4gICAgICAgICAgJ0NNRC1TSEVMTCcsXG4gICAgICAgICAgJ2N1cmwgLXMgaHR0cDovL2xvY2FsaG9zdDo5OTAxL3NlcnZlcl9pbmZvIHwgZ3JlcCBzdGF0ZSB8IGdyZXAgLXEgTElWRScsXG4gICAgICAgIF0sXG4gICAgICAgIHN0YXJ0UGVyaW9kOiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMiksXG4gICAgICB9LFxuICAgICAgbWVtb3J5UmVzZXJ2YXRpb25NaUI6IDEyOCxcbiAgICAgIHVzZXI6ICcxMzM3JyxcbiAgICAgIGxvZ2dpbmc6IG5ldyBlY3MuQXdzTG9nRHJpdmVyKHsgc3RyZWFtUHJlZml4OiAnZW52b3knIH0pLFxuICAgIH0pO1xuXG4gICAgLy8gTW9kaWZ5IHRoZSB0YXNrIGRlZmluaXRpb24gcm9sZSB0byBhbGxvdyB0aGUgRW52b3kgc2lkZWNhciB0byBnZXRcbiAgICAvLyBjb25maWd1cmF0aW9uIGZyb20gdGhlIEVudm95IGNvbnRyb2wgcGxhbmUsIGZvciB0aGlzIHBhcnRpY3VsYXJcbiAgICAvLyBtZXNoIG9ubHkuXG4gICAgbmV3IGlhbS5Qb2xpY3kodGhpcy5zY29wZSwgYCR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfS1lbnZveS10by1hcHBtZXNoYCwge1xuICAgICAgcm9sZXM6IFt0YXNrRGVmaW5pdGlvbi50YXNrUm9sZV0sXG4gICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICByZXNvdXJjZXM6IFt0aGlzLm1lc2gubWVzaEFybl0sXG4gICAgICAgICAgYWN0aW9uczogWydhcHBtZXNoOlN0cmVhbUFnZ3JlZ2F0ZWRSZXNvdXJjZXMnXSxcbiAgICAgICAgfSksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gUmFpc2UgdGhlIG51bWJlciBvZiBvcGVuIGZpbGUgZGVzY3JpcHRvcnMgYWxsb3dlZC4gVGhpcyBpc1xuICAgIC8vIG5lY2Vzc2FyeSB3aGVuIHRoZSBFbnZveSBwcm94eSBpcyBoYW5kbGluZyBsYXJnZSBhbW91bnRzIG9mXG4gICAgLy8gdHJhZmZpYy5cbiAgICB0aGlzLmNvbnRhaW5lci5hZGRVbGltaXRzKHtcbiAgICAgIHNvZnRMaW1pdDogMTAyNDAwMCxcbiAgICAgIGhhcmRMaW1pdDogMTAyNDAwMCxcbiAgICAgIG5hbWU6IGVjcy5VbGltaXROYW1lLk5PRklMRSxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEVuYWJsZSBDbG91ZE1hcCBmb3IgdGhlIHNlcnZpY2UuXG4gIHB1YmxpYyBtb2RpZnlTZXJ2aWNlUHJvcHMocHJvcHM6IFNlcnZpY2VCdWlsZCk6IFNlcnZpY2VCdWlsZCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnByb3BzLFxuXG4gICAgICAvLyBFbnN1cmUgdGhhdCBzZXJ2aWNlIHRhc2tzIGFyZSByZWdpc3RlcmVkIGludG9cbiAgICAgIC8vIENsb3VkTWFwIHNvIHRoYXQgdGhlIEFwcCBNZXNoIHByb3h5IGNhbiBmaW5kIHRoZW0uXG4gICAgICBjbG91ZE1hcE9wdGlvbnM6IHtcbiAgICAgICAgZG5zUmVjb3JkVHlwZTogJ0EnLFxuICAgICAgICBkbnNUdGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgICAgZmFpbHVyZVRocmVzaG9sZDogMixcbiAgICAgICAgbmFtZTogdGhpcy5wYXJlbnRTZXJ2aWNlLmlkLFxuICAgICAgfSxcblxuICAgICAgLy8gVGhlc2Ugc3BlY2lmaWMgZGVwbG95bWVudCBzZXR0aW5ncyBhcmUgY3VycmVudGx5IHJlcXVpcmVkIGluIG9yZGVyIHRvXG4gICAgICAvLyBtYWludGFpbiBhdmFpbGFiaWxpdHkgZHVyaW5nIGEgcm9sbGluZyBkZXBsb3kgb2YgdGhlIHNlcnZpY2Ugd2l0aCBBcHAgTWVzaFxuICAgICAgLy8gaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2FwcC1tZXNoL2xhdGVzdC91c2VyZ3VpZGUvYmVzdC1wcmFjdGljZXMuaHRtbCNyZWR1Y2UtZGVwbG95bWVudC12ZWxvY2l0eVxuICAgICAgbWluSGVhbHRoeVBlcmNlbnQ6IDEwMCxcbiAgICAgIG1heEhlYWx0aHlQZXJjZW50OiAxMjUsIC8vIE5vdGUgdGhhdCBhdCBsb3cgdGFzayBjb3VudCB0aGUgU2VydmljZSB3aWxsIGJvb3N0IHRoaXMgc2V0dGluZyBoaWdoZXJcbiAgICB9IGFzIFNlcnZpY2VCdWlsZDtcbiAgfVxuXG4gIC8vIE5vdyB0aGF0IHRoZSBzZXJ2aWNlIGlzIGRlZmluZWQsIHdlIGNhbiBjcmVhdGUgdGhlIEFwcE1lc2ggdmlydHVhbCBzZXJ2aWNlXG4gIC8vIGFuZCB2aXJ0dWFsIG5vZGUgZm9yIHRoZSByZWFsIHNlcnZpY2VcbiAgcHVibGljIHVzZVNlcnZpY2Uoc2VydmljZTogZWNzLkVjMlNlcnZpY2UgfCBlY3MuRmFyZ2F0ZVNlcnZpY2UpIHtcbiAgICBjb25zdCBjb250YWluZXJleHRlbnNpb24gPSB0aGlzLnBhcmVudFNlcnZpY2Uuc2VydmljZURlc2NyaXB0aW9uLmdldCgnc2VydmljZS1jb250YWluZXInKSBhcyBDb250YWluZXI7XG5cbiAgICBpZiAoIWNvbnRhaW5lcmV4dGVuc2lvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXJlbGVucyBleHRlbnNpb24gcmVxdWlyZXMgYW4gYXBwbGljYXRpb24gZXh0ZW5zaW9uJyk7XG4gICAgfVxuXG4gICAgY29uc3QgY2xvdWRtYXBOYW1lc3BhY2UgPSB0aGlzLnBhcmVudFNlcnZpY2UuY2x1c3Rlci5kZWZhdWx0Q2xvdWRNYXBOYW1lc3BhY2U7XG5cbiAgICBpZiAoIWNsb3VkbWFwTmFtZXNwYWNlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IGFkZCBhIENsb3VkTWFwIG5hbWVzcGFjZSB0byB0aGUgRUNTIGNsdXN0ZXIgaW4gb3JkZXIgdG8gdXNlIHRoZSBBcHBNZXNoIGV4dGVuc2lvbicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZExpc3RlbmVyKHByb3RvY29sOiBhcHBtZXNoLlByb3RvY29sLCBwb3J0OiBudW1iZXIpOiBhcHBtZXNoLlZpcnR1YWxOb2RlTGlzdGVuZXIge1xuICAgICAgc3dpdGNoIChwcm90b2NvbCkge1xuICAgICAgICBjYXNlIGFwcG1lc2guUHJvdG9jb2wuSFRUUCA6XG4gICAgICAgICAgcmV0dXJuIGFwcG1lc2guVmlydHVhbE5vZGVMaXN0ZW5lci5odHRwKHsgcG9ydCB9KTtcblxuICAgICAgICBjYXNlIGFwcG1lc2guUHJvdG9jb2wuSFRUUDIgOlxuICAgICAgICAgIHJldHVybiBhcHBtZXNoLlZpcnR1YWxOb2RlTGlzdGVuZXIuaHR0cDIoeyBwb3J0IH0pO1xuXG4gICAgICAgIGNhc2UgYXBwbWVzaC5Qcm90b2NvbC5HUlBDIDpcbiAgICAgICAgICByZXR1cm4gYXBwbWVzaC5WaXJ0dWFsTm9kZUxpc3RlbmVyLmdycGMoeyBwb3J0IH0pO1xuXG4gICAgICAgIGNhc2UgYXBwbWVzaC5Qcm90b2NvbC5UQ1AgOlxuICAgICAgICAgIHJldHVybiBhcHBtZXNoLlZpcnR1YWxOb2RlTGlzdGVuZXIudGNwKHsgcG9ydCB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSB2aXJ0dWFsIG5vZGUgZm9yIHRoZSBuYW1lIHNlcnZpY2VcbiAgICB0aGlzLnZpcnR1YWxOb2RlID0gbmV3IGFwcG1lc2guVmlydHVhbE5vZGUodGhpcy5zY29wZSwgYCR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfS12aXJ0dWFsLW5vZGVgLCB7XG4gICAgICBtZXNoOiB0aGlzLm1lc2gsXG4gICAgICB2aXJ0dWFsTm9kZU5hbWU6IHRoaXMucGFyZW50U2VydmljZS5pZCxcbiAgICAgIHNlcnZpY2VEaXNjb3Zlcnk6IHNlcnZpY2UuY2xvdWRNYXBTZXJ2aWNlXG4gICAgICAgID8gYXBwbWVzaC5TZXJ2aWNlRGlzY292ZXJ5LmNsb3VkTWFwKHNlcnZpY2UuY2xvdWRNYXBTZXJ2aWNlKVxuICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgIGxpc3RlbmVyczogW2FkZExpc3RlbmVyKHRoaXMucHJvdG9jb2wsIGNvbnRhaW5lcmV4dGVuc2lvbi50cmFmZmljUG9ydCldLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIGEgdmlydHVhbCByb3V0ZXIgZm9yIHRoaXMgc2VydmljZS4gVGhpcyBhbGxvd3MgZm9yIHJldHJpZXNcbiAgICAvLyBhbmQgb3RoZXIgc2ltaWxhciBiZWhhdmlvcnMuXG4gICAgdGhpcy52aXJ0dWFsUm91dGVyID0gbmV3IGFwcG1lc2guVmlydHVhbFJvdXRlcih0aGlzLnNjb3BlLCBgJHt0aGlzLnBhcmVudFNlcnZpY2UuaWR9LXZpcnR1YWwtcm91dGVyYCwge1xuICAgICAgbWVzaDogdGhpcy5tZXNoLFxuICAgICAgbGlzdGVuZXJzOiBbXG4gICAgICAgIHRoaXMudmlydHVhbFJvdXRlckxpc3RlbmVyKGNvbnRhaW5lcmV4dGVuc2lvbi50cmFmZmljUG9ydCksXG4gICAgICBdLFxuICAgICAgdmlydHVhbFJvdXRlck5hbWU6IGAke3RoaXMucGFyZW50U2VydmljZS5pZH1gLFxuICAgIH0pO1xuXG4gICAgLy8gRm9ybSB0aGUgc2VydmljZSBuYW1lIHRoYXQgcmVxdWVzdHMgd2lsbCBiZSBtYWRlIHRvXG4gICAgY29uc3Qgc2VydmljZU5hbWUgPSBgJHt0aGlzLnBhcmVudFNlcnZpY2UuaWR9LiR7Y2xvdWRtYXBOYW1lc3BhY2UubmFtZXNwYWNlTmFtZX1gO1xuICAgIGNvbnN0IHdlaWdodGVkVGFyZ2V0czogYXBwbWVzaC5XZWlnaHRlZFRhcmdldFtdID0gW3tcbiAgICAgIHZpcnR1YWxOb2RlOiB0aGlzLnZpcnR1YWxOb2RlLFxuICAgICAgd2VpZ2h0OiAxLFxuICAgIH1dO1xuICAgIC8vIE5vdyBhZGQgdGhlIHZpcnR1YWwgbm9kZSBhcyBhIHJvdXRlIGluIHRoZSB2aXJ0dWFsIHJvdXRlclxuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSByb3V0ZSB0eXBlIG1hdGNoZXMgdGhlIHByb3RvY29sIHR5cGUuXG4gICAgdGhpcy5yb3V0ZSA9IHRoaXMudmlydHVhbFJvdXRlci5hZGRSb3V0ZShgJHt0aGlzLnBhcmVudFNlcnZpY2UuaWR9LXJvdXRlYCwge1xuICAgICAgcm91dGVTcGVjOiB0aGlzLnJvdXRlU3BlYyh3ZWlnaHRlZFRhcmdldHMsIHNlcnZpY2VOYW1lKSxcbiAgICB9KTtcblxuICAgIC8vIE5vdyBjcmVhdGUgYSB2aXJ0dWFsIHNlcnZpY2UuIFJlbGF0aW9uc2hpcCBnb2VzIGxpa2UgdGhpczpcbiAgICAvLyB2aXJ0dWFsIHNlcnZpY2UgLT4gdmlydHVhbCByb3V0ZXIgLT4gdmlydHVhbCBub2RlXG4gICAgdGhpcy52aXJ0dWFsU2VydmljZSA9IG5ldyBhcHBtZXNoLlZpcnR1YWxTZXJ2aWNlKHRoaXMuc2NvcGUsIGAke3RoaXMucGFyZW50U2VydmljZS5pZH0tdmlydHVhbC1zZXJ2aWNlYCwge1xuICAgICAgdmlydHVhbFNlcnZpY2VQcm92aWRlcjogYXBwbWVzaC5WaXJ0dWFsU2VydmljZVByb3ZpZGVyLnZpcnR1YWxSb3V0ZXIodGhpcy52aXJ0dWFsUm91dGVyKSxcbiAgICAgIHZpcnR1YWxTZXJ2aWNlTmFtZTogc2VydmljZU5hbWUsXG4gICAgfSk7XG4gIH1cblxuICAvLyBDb25uZWN0IHRoZSBhcHAgbWVzaCBleHRlbnNpb24gZm9yIHRoaXMgc2VydmljZSB0byBhbiBhcHAgbWVzaFxuICAvLyBleHRlbnNpb24gb24gYW5vdGhlciBzZXJ2aWNlLlxuICBwdWJsaWMgY29ubmVjdFRvU2VydmljZShvdGhlclNlcnZpY2U6IFNlcnZpY2UpIHtcbiAgICBjb25zdCBvdGhlckFwcE1lc2ggPSBvdGhlclNlcnZpY2Uuc2VydmljZURlc2NyaXB0aW9uLmdldCgnYXBwbWVzaCcpIGFzIEFwcE1lc2hFeHRlbnNpb247XG4gICAgY29uc3Qgb3RoZXJDb250YWluZXIgPSBvdGhlclNlcnZpY2Uuc2VydmljZURlc2NyaXB0aW9uLmdldCgnc2VydmljZS1jb250YWluZXInKSBhcyBDb250YWluZXI7XG5cbiAgICAvLyBEbyBhIGNoZWNrIHRvIGVuc3VyZSB0aGF0IHRoZXNlIHNlcnZpY2VzIGFyZSBpbiB0aGUgc2FtZSBlbnZpcm9ubWVudC5cbiAgICAvLyBDdXJyZW50bHkgdGhpcyBleHRlbnNpb24gb25seSBzdXBwb3J0cyBjb25uZWN0aW5nIHNlcnZpY2VzIHdpdGhpblxuICAgIC8vIHRoZSBzYW1lIFZQQywgc2FtZSBBcHAgTWVzaCBzZXJ2aWNlIG1lc2gsIGFuZCBzYW1lIENsb3VkIE1hcCBuYW1lc3BhY2VcbiAgICBpZiAob3RoZXJBcHBNZXNoLnBhcmVudFNlcnZpY2UuZW52aXJvbm1lbnQuaWQgIT09IHRoaXMucGFyZW50U2VydmljZS5lbnZpcm9ubWVudC5pZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gY29ubmVjdCBzZXJ2aWNlICcke3RoaXMucGFyZW50U2VydmljZS5pZH0nIGluIGVudmlyb25tZW50ICcke3RoaXMucGFyZW50U2VydmljZS5lbnZpcm9ubWVudC5pZH0nIHRvIHNlcnZpY2UgJyR7b3RoZXJTZXJ2aWNlLmlkfScgaW4gZW52aXJvbm1lbnQgJyR7b3RoZXJBcHBNZXNoLnBhcmVudFNlcnZpY2UuZW52aXJvbm1lbnQuaWR9JyBiZWNhdXNlIHNlcnZpY2VzIGNhbiBub3QgYmUgY29ubmVjdGVkIGFjcm9zcyBlbnZpcm9ubWVudCBib3VuZGFyaWVzYCk7XG4gICAgfVxuXG4gICAgLy8gRmlyc3QgYWxsb3cgdGhpcyBzZXJ2aWNlIHRvIHRhbGsgdG8gdGhlIG90aGVyIHNlcnZpY2VcbiAgICAvLyBhdCBhIG5ldHdvcmsgbGV2ZWwuIFRoaXMgb3BlbnMgdGhlIHNlY3VyaXR5IGdyb3VwcyBzbyB0aGF0XG4gICAgLy8gdGhlIHNlY3VyaXR5IGdyb3VwcyBvZiB0aGVzZSB0d28gc2VydmljZXMgdG8gZWFjaCBvdGhlclxuICAgIHRoaXMucGFyZW50U2VydmljZS5lY3NTZXJ2aWNlLmNvbm5lY3Rpb25zLmFsbG93VG8oXG4gICAgICBvdGhlclNlcnZpY2UuZWNzU2VydmljZSxcbiAgICAgIGVjMi5Qb3J0LnRjcChvdGhlckNvbnRhaW5lci50cmFmZmljUG9ydCksXG4gICAgICBgQWNjZXB0IGluYm91bmQgdHJhZmZpYyBmcm9tICR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfWAsXG4gICAgKTtcblxuICAgIC8vIE5leHQgdXBkYXRlIHRoZSBhcHAgbWVzaCBjb25maWcgc28gdGhhdCB0aGUgbG9jYWwgRW52b3lcbiAgICAvLyBwcm94eSBvbiB0aGlzIHNlcnZpY2Uga25vd3MgaG93IHRvIHJvdXRlIHRyYWZmaWMgdG9cbiAgICAvLyBub2RlcyBmcm9tIHRoZSBvdGhlciBzZXJ2aWNlLlxuICAgIHRoaXMudmlydHVhbE5vZGUuYWRkQmFja2VuZChhcHBtZXNoLkJhY2tlbmQudmlydHVhbFNlcnZpY2Uob3RoZXJBcHBNZXNoLnZpcnR1YWxTZXJ2aWNlKSk7XG4gIH1cblxuICBwcml2YXRlIHJvdXRlU3BlYyh3ZWlnaHRlZFRhcmdldHM6IGFwcG1lc2guV2VpZ2h0ZWRUYXJnZXRbXSwgc2VydmljZU5hbWU6IHN0cmluZyk6IGFwcG1lc2guUm91dGVTcGVjIHtcbiAgICBzd2l0Y2ggKHRoaXMucHJvdG9jb2wpIHtcbiAgICAgIGNhc2UgYXBwbWVzaC5Qcm90b2NvbC5IVFRQOiByZXR1cm4gYXBwbWVzaC5Sb3V0ZVNwZWMuaHR0cCh7XG4gICAgICAgIHdlaWdodGVkVGFyZ2V0czogd2VpZ2h0ZWRUYXJnZXRzLFxuICAgICAgfSk7XG4gICAgICBjYXNlIGFwcG1lc2guUHJvdG9jb2wuSFRUUDI6IHJldHVybiBhcHBtZXNoLlJvdXRlU3BlYy5odHRwMih7XG4gICAgICAgIHdlaWdodGVkVGFyZ2V0czogd2VpZ2h0ZWRUYXJnZXRzLFxuICAgICAgfSk7XG4gICAgICBjYXNlIGFwcG1lc2guUHJvdG9jb2wuR1JQQzogcmV0dXJuIGFwcG1lc2guUm91dGVTcGVjLmdycGMoe1xuICAgICAgICB3ZWlnaHRlZFRhcmdldHM6IHdlaWdodGVkVGFyZ2V0cyxcbiAgICAgICAgbWF0Y2g6IHtcbiAgICAgICAgICBzZXJ2aWNlTmFtZTogc2VydmljZU5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNhc2UgYXBwbWVzaC5Qcm90b2NvbC5UQ1A6IHJldHVybiBhcHBtZXNoLlJvdXRlU3BlYy50Y3Aoe1xuICAgICAgICB3ZWlnaHRlZFRhcmdldHM6IHdlaWdodGVkVGFyZ2V0cyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlydHVhbFJvdXRlckxpc3RlbmVyKHBvcnQ6IG51bWJlcik6IGFwcG1lc2guVmlydHVhbFJvdXRlckxpc3RlbmVyIHtcbiAgICBzd2l0Y2ggKHRoaXMucHJvdG9jb2wpIHtcbiAgICAgIGNhc2UgYXBwbWVzaC5Qcm90b2NvbC5IVFRQOiByZXR1cm4gYXBwbWVzaC5WaXJ0dWFsUm91dGVyTGlzdGVuZXIuaHR0cChwb3J0KTtcbiAgICAgIGNhc2UgYXBwbWVzaC5Qcm90b2NvbC5IVFRQMjogcmV0dXJuIGFwcG1lc2guVmlydHVhbFJvdXRlckxpc3RlbmVyLmh0dHAyKHBvcnQpO1xuICAgICAgY2FzZSBhcHBtZXNoLlByb3RvY29sLkdSUEM6IHJldHVybiBhcHBtZXNoLlZpcnR1YWxSb3V0ZXJMaXN0ZW5lci5ncnBjKHBvcnQpO1xuICAgICAgY2FzZSBhcHBtZXNoLlByb3RvY29sLlRDUDogcmV0dXJuIGFwcG1lc2guVmlydHVhbFJvdXRlckxpc3RlbmVyLnRjcChwb3J0KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==