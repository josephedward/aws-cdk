import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import { Construct } from 'constructs';
import { EnvironmentCapacityType } from './extensions/extension-interfaces';
/**
 * Settings for the environment where you want to deploy your services.
 */
export interface EnvironmentProps {
    /**
     * The VPC used by the service for networking.
     *
     * @default - Create a new VPC
     */
    readonly vpc?: ec2.IVpc;
    /**
     * The ECS cluster which provides compute capacity to this service.
     *
     * [disable-awslint:ref-via-interface]
     * @default - Create a new cluster
     */
    readonly cluster?: ecs.Cluster;
    /**
     * The type of capacity to use for this environment.
     *
     * @default - EnvironmentCapacityType.FARGATE
     */
    readonly capacityType?: EnvironmentCapacityType;
}
/**
 * An environment into which to deploy a service.
 */
export interface IEnvironment {
    /**
     * The name of this environment.
     */
    readonly id: string;
    /**
     * The VPC into which environment services should be placed.
     */
    readonly vpc: ec2.IVpc;
    /**
     * The cluster that is providing capacity for this service.
     */
    readonly cluster: ecs.ICluster;
    /**
     * The capacity type used by the service's cluster.
     */
    readonly capacityType: EnvironmentCapacityType;
    /**
     * Add a default cloudmap namespace to the environment's cluster.
     */
    addDefaultCloudMapNamespace(options: ecs.CloudMapNamespaceOptions): void;
}
/**
 * An environment into which to deploy a service. This environment
 * can either be instantiated with a pre-existing AWS VPC and ECS cluster,
 * or it can create its own VPC and cluster. By default, it will create
 * a cluster with Fargate capacity.
 */
export declare class Environment extends Construct implements IEnvironment {
    /**
     * Import an existing environment from its attributes.
     */
    static fromEnvironmentAttributes(scope: Construct, id: string, attrs: EnvironmentAttributes): IEnvironment;
    /**
     * The name of this environment.
     */
    readonly id: string;
    /**
     * The VPC where environment services should be placed.
     */
    readonly vpc: ec2.IVpc;
    /**
     * The cluster that is providing capacity for this service.
     */
    readonly cluster: ecs.Cluster;
    /**
     * The capacity type used by the service's cluster.
     */
    readonly capacityType: EnvironmentCapacityType;
    private readonly scope;
    constructor(scope: Construct, id: string, props?: EnvironmentProps);
    /**
     * Add a default cloudmap namespace to the environment's cluster.
     */
    addDefaultCloudMapNamespace(options: ecs.CloudMapNamespaceOptions): void;
}
export interface EnvironmentAttributes {
    /**
     * The capacity type used by the service's cluster.
     */
    capacityType: EnvironmentCapacityType;
    /**
     * The cluster that is providing capacity for this service.
     */
    cluster: ecs.ICluster;
}
export declare class ImportedEnvironment extends Construct implements IEnvironment {
    readonly capacityType: EnvironmentCapacityType;
    readonly cluster: ecs.ICluster;
    readonly id: string;
    readonly vpc: ec2.IVpc;
    constructor(scope: Construct, id: string, props: EnvironmentAttributes);
    /**
     * Adding a default cloudmap namespace to the cluster will throw an error, as we don't
     * own it.
     */
    addDefaultCloudMapNamespace(_options: ecs.CloudMapNamespaceOptions): void;
}
