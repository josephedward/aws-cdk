import * as ecs from '@aws-cdk/aws-ecs';
import { Construct } from 'constructs';
import { Service } from '../service';
import { ServiceExtension, ServiceBuild } from './extension-interfaces';
export interface HttpLoadBalancerProps {
    /**
     * The number of ALB requests per target.
     */
    readonly requestsPerTarget?: number;
}
/**
 * This extension add a public facing load balancer for sending traffic
 * to one or more replicas of the application container.
 */
export declare class HttpLoadBalancerExtension extends ServiceExtension {
    private loadBalancer;
    private listener;
    private requestsPerTarget?;
    constructor(props?: HttpLoadBalancerProps);
    prehook(service: Service, scope: Construct): void;
    modifyServiceProps(props: ServiceBuild): ServiceBuild;
    useService(service: ecs.Ec2Service | ecs.FargateService): void;
}
