import * as ecs from '@aws-cdk/aws-ecs';
import * as cdk from '@aws-cdk/core';
import { ServiceExtension, ServiceBuild } from './extension-interfaces';
/**
 * The autoscaling settings.
 *
 * @deprecated use the `minTaskCount` and `maxTaskCount` properties of `autoScaleTaskCount` in the `Service` construct
 * to configure the auto scaling target for the service. For more information, please refer
 * https://github.com/aws/aws-cdk/blob/main/packages/%40aws-cdk-containers/ecs-service-extensions/README.md#task-auto-scaling .
 */
export interface CpuScalingProps {
    /**
     * How many tasks to launch initially.
     *
     * @default - 2
     */
    readonly initialTaskCount?: number;
    /**
     * The minimum number of tasks when scaling in.
     *
     * @default - 2
     */
    readonly minTaskCount?: number;
    /**
     * The maximum number of tasks when scaling out.
     *
     * @default - 8
     */
    readonly maxTaskCount?: number;
    /**
     * The CPU utilization to try ot maintain.
     *
     * @default - 50%
     */
    readonly targetCpuUtilization?: number;
    /**
     * How long to wait between scale out actions.
     *
     * @default - 60 seconds
     */
    readonly scaleOutCooldown?: cdk.Duration;
    /**
     * How long to wait between scale in actions.
     *
     * @default - 60 seconds
     */
    readonly scaleInCooldown?: cdk.Duration;
}
/**
 * This extension helps you scale your service according to CPU utilization.
 *
 * @deprecated To enable target tracking based on CPU utilization, use the `targetCpuUtilization` property of `autoScaleTaskCount` in the `Service` construct.
 * For more information, please refer https://github.com/aws/aws-cdk/blob/main/packages/%40aws-cdk-containers/ecs-service-extensions/README.md#task-auto-scaling .
 */
export declare class ScaleOnCpuUtilization extends ServiceExtension {
    /**
     * How many tasks to launch initially.
     */
    readonly initialTaskCount: number;
    /**
     * The minimum number of tasks when scaling in.
     */
    readonly minTaskCount: number;
    /**
     * The maximum number of tasks when scaling out.
     */
    readonly maxTaskCount: number;
    /**
     * The CPU utilization to try ot maintain.
     */
    readonly targetCpuUtilization: number;
    /**
     * How long to wait between scale out actions.
     */
    readonly scaleOutCooldown: cdk.Duration;
    /**
     * How long to wait between scale in actions.
     */
    readonly scaleInCooldown: cdk.Duration;
    constructor(props?: CpuScalingProps);
    modifyServiceProps(props: ServiceBuild): ServiceBuild;
    useService(service: ecs.Ec2Service | ecs.FargateService): void;
}
