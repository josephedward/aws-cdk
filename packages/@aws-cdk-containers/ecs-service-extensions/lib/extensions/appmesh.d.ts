import * as appmesh from '@aws-cdk/aws-appmesh';
import * as ecs from '@aws-cdk/aws-ecs';
import { Construct } from 'constructs';
import { Service } from '../service';
import { ServiceExtension, ServiceBuild } from './extension-interfaces';
/**
 * The settings for the App Mesh extension.
 */
export interface MeshProps {
    /**
     * The service mesh into which to register the service.
     */
    readonly mesh: appmesh.Mesh;
    /**
     * The protocol of the service.
     * Valid values are Protocol.HTTP, Protocol.HTTP2, Protocol.TCP, Protocol.GRPC
     * @default - Protocol.HTTP
     */
    readonly protocol?: appmesh.Protocol;
}
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
export declare class AppMeshExtension extends ServiceExtension {
    protected virtualNode: appmesh.VirtualNode;
    protected virtualService: appmesh.VirtualService;
    protected virtualRouter: appmesh.VirtualRouter;
    protected route: appmesh.Route;
    private mesh;
    /**
     * The protocol used for AppMesh routing.
     * default - Protocol.HTTP
     */
    readonly protocol: appmesh.Protocol;
    constructor(props: MeshProps);
    prehook(service: Service, scope: Construct): void;
    modifyTaskDefinitionProps(props: ecs.TaskDefinitionProps): ecs.TaskDefinitionProps;
    private accountIdForRegion;
    useTaskDefinition(taskDefinition: ecs.TaskDefinition): void;
    modifyServiceProps(props: ServiceBuild): ServiceBuild;
    useService(service: ecs.Ec2Service | ecs.FargateService): void;
    connectToService(otherService: Service): void;
    private routeSpec;
    private virtualRouterListener;
}
