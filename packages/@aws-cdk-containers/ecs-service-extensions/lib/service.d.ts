import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as iam from '@aws-cdk/aws-iam';
import { Construct } from 'constructs';
import { IEnvironment } from './environment';
import { EnvironmentCapacityType } from './extensions/extension-interfaces';
import { ServiceDescription } from './service-description';
/**
 * connectToProps will have all the extra parameters which are required for connecting services.
 */
export interface ConnectToProps {
    /**
     * local_bind_port is the local port that this application should
     * use when calling the upstream service in ECS Consul Mesh Extension
     * Currently, this parameter will only be used in the ECSConsulMeshExtension
     * https://github.com/aws-ia/ecs-consul-mesh-extension
     */
    readonly local_bind_port?: number;
}
/**
 * The settings for an ECS Service.
 */
export interface ServiceProps {
    /**
     * The ServiceDescription used to build the service.
     */
    readonly serviceDescription: ServiceDescription;
    /**
     * The environment to launch the service in.
     */
    readonly environment: IEnvironment;
    /**
     * The name of the IAM role that grants containers in the task permission to call AWS APIs on your behalf.
     *
     * @default - A task role is automatically created for you.
     */
    readonly taskRole?: iam.IRole;
    /**
     * The desired number of instantiations of the task definition to keep running on the service.
     *
     * @default - When creating the service, default is 1; when updating the service, default uses
     * the current task number.
     */
    readonly desiredCount?: number;
    /**
     * The options for configuring the auto scaling target.
     *
     * @default none
     */
    readonly autoScaleTaskCount?: AutoScalingOptions;
}
export interface AutoScalingOptions {
    /**
     * The minimum number of tasks when scaling in.
     *
     * @default - 1
     */
    readonly minTaskCount?: number;
    /**
      * The maximum number of tasks when scaling out.
      */
    readonly maxTaskCount: number;
    /**
     * The target value for CPU utilization across all tasks in the service.
     */
    readonly targetCpuUtilization?: number;
    /**
     * The target value for memory utilization across all tasks in the service.
     */
    readonly targetMemoryUtilization?: number;
}
/**
 * This Service construct serves as a Builder class for an ECS service. It
 * supports various extensions and keeps track of any mutating state, allowing
 * it to build up an ECS service progressively.
 */
export declare class Service extends Construct {
    /**
     * The underlying ECS service that was created.
     */
    ecsService: ecs.Ec2Service | ecs.FargateService;
    /**
     * The name of the service.
     */
    readonly id: string;
    /**
     * The VPC where this service should be placed.
     */
    readonly vpc: ec2.IVpc;
    /**
     * The cluster that is providing capacity for this service.
     * [disable-awslint:ref-via-interface]
     */
    readonly cluster: ecs.ICluster;
    /**
     * The capacity type that this service will use.
     * Valid values are EC2 or FARGATE.
     */
    readonly capacityType: EnvironmentCapacityType;
    /**
     * The ServiceDescription used to build this service.
     */
    readonly serviceDescription: ServiceDescription;
    /**
     * The environment where this service was launched.
     */
    readonly environment: IEnvironment;
    /**
     * The scalable attribute representing task count.
     */
    readonly scalableTaskCount?: ecs.ScalableTaskCount;
    /**
     * The flag to track if auto scaling policies have been configured
     * for the service.
     */
    private autoScalingPoliciesEnabled;
    /**
     * The generated task definition for this service. It is only
     * generated after .prepare() has been executed.
     */
    protected taskDefinition: ecs.TaskDefinition;
    /**
     * The list of URLs associated with this service.
     */
    private urls;
    private readonly scope;
    constructor(scope: Construct, id: string, props: ServiceProps);
    /**
     * Tell extensions from one service to connect to extensions from
     * another sevice if they have implemented a hook for it.
     *
     * @param service
     */
    connectTo(service: Service, connectToProps?: ConnectToProps): void;
    /**
     * This method adds a new URL for the service. This allows extensions to
     * submit a URL for the service. For example, a load balancer might add its
     * URL, or App Mesh can add its DNS name for the service.
     *
     * @param urlName - The identifier name for this URL
     * @param url - The URL itself.
     */
    addURL(urlName: string, url: string): void;
    /**
     * Retrieve a URL for the service. The URL must have previously been
     * stored by one of the URL providing extensions.
     *
     * @param urlName - The URL to look up.
     */
    getURL(urlName: string): string;
    /**
     * This helper method is used to set the `autoScalingPoliciesEnabled` attribute
     * whenever an auto scaling policy is configured for the service.
     */
    enableAutoScalingPolicy(): void;
}
